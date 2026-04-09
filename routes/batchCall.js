/**
 * ROUTE: BATCH CALL — Schedule Hannah to call a list of leads
 * POST /api/batch-call          — call leads immediately (with delay between each)
 * POST /api/batch-call/schedule — schedule calls for a specific time (ET timezone)
 * GET  /api/batch-call/status   — check scheduled/completed calls
 * GET  /api/batch-call/dnc      — list blocked numbers
 * POST /api/batch-call/dnc      — add a number to the DNC list
 * DELETE /api/batch-call/dnc/:phone — remove a number from the DNC list
 *
 * PERSISTENCE: Scheduled jobs are saved to DATA_DIR/scheduled-calls.json so they
 * survive server restarts. On startup all pending jobs are automatically re-queued.
 */

const express  = require("express");
const router   = express.Router();
const fs       = require("fs");
const path     = require("path");
const tenantDb = require("../modules/tenantDb");
const leadDb   = require("../modules/leadDb");
const vapi     = require("../modules/vapi");
const { log, normalizePhone } = require("../modules/guard");

const TENANT_KEY             = "lopes";
const DELAY_BETWEEN_CALLS_MS = 45000; // 45 seconds between calls
const POLL_INTERVAL_MS       = 30000; // check every 30 seconds
const SCHEDULED_CALLS_FILE   = path.join(process.env.DATA_DIR || "/tmp", "scheduled-calls.json");
const DNC_FILE               = path.join(__dirname, "../config/dnc.json");

// In-memory results (recent only)
const callResults = [];

// ── DNC (Do Not Call) helpers ──────────────────────────────────────

function loadDNC() {
  try {
    if (fs.existsSync(DNC_FILE)) {
      const raw = fs.readFileSync(DNC_FILE, "utf8");
      const data = JSON.parse(raw);
      return data.blockedNumbers || [];
    }
  } catch (e) {
    log.error("[BatchCall] Failed to load dnc.json: " + e.message);
  }
  return [];
}

function saveDNC(blockedNumbers, notes = {}) {
  try {
    fs.mkdirSync(path.dirname(DNC_FILE), { recursive: true });
    fs.writeFileSync(DNC_FILE, JSON.stringify({ blockedNumbers, notes }, null, 2), "utf8");
  } catch (e) {
    log.error("[BatchCall] Failed to save dnc.json: " + e.message);
  }
}

function isOnDNC(phone) {
  const list = loadDNC();
  return list.includes(phone);
}

// ── Persistent job store ──────────────────────────────────────────

function loadJobs() {
  try {
    if (fs.existsSync(SCHEDULED_CALLS_FILE)) {
      const raw = fs.readFileSync(SCHEDULED_CALLS_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch (e) {
    log.error("[BatchCall] Failed to load scheduled-calls.json: " + e.message);
  }
  return [];
}

function saveJobs(jobs) {
  try {
    fs.mkdirSync(path.dirname(SCHEDULED_CALLS_FILE), { recursive: true });
    fs.writeFileSync(SCHEDULED_CALLS_FILE, JSON.stringify(jobs, null, 2), "utf8");
  } catch (e) {
    log.error("[BatchCall] Failed to save scheduled-calls.json: " + e.message);
  }
}

function addJob(job) {
  const jobs = loadJobs();
  jobs.push(job);
  saveJobs(jobs);
}

function updateJobStatus(jobId, status) {
  const jobs = loadJobs();
  const job = jobs.find(j => j.id === jobId);
  if (job) {
    job.status = status;
    saveJobs(jobs);
  }
}

function removeJob(jobId) {
  const jobs = loadJobs().filter(j => j.id !== jobId);
  saveJobs(jobs);
}

// ── Scheduler — runs every 30s, fires any due jobs ─────────────────

const runningJobs = new Set(); // prevent double-execution

async function checkAndFireDueJobs() {
  const now = Date.now();
  const jobs = loadJobs().filter(j => j.status === "scheduled");

  for (const job of jobs) {
    const fireAt = new Date(job.scheduledFor).getTime();
    if (now >= fireAt && !runningJobs.has(job.id)) {
      runningJobs.add(job.id);
      updateJobStatus(job.id, "running");
      log.info("[BatchCall] Scheduler: firing job " + job.id + " scheduled for " + job.scheduledFor);
      const tenant = tenantDb.getByWebhookKey(TENANT_KEY);
      if (tenant) {
        processLeadsBatch(tenant, job.leads, job.id);
      } else {
        log.error("[BatchCall] Tenant not found — cannot execute job " + job.id);
        updateJobStatus(job.id, "error");
        runningJobs.delete(job.id);
      }
    }
  }
}

// Start the background polling loop
setInterval(checkAndFireDueJobs, POLL_INTERVAL_MS);

// On startup: also fire immediately in case there are already-due jobs
setImmediate(checkAndFireDueJobs);
log.info("[BatchCall] Persistent scheduler started — polling every " + (POLL_INTERVAL_MS / 1000) + "s, storage: " + SCHEDULED_CALLS_FILE);

// ── POST /  — Call leads NOW (with delay between each) ────────────
router.post("/", async (req, res) => {
  const { leads, secret } = req.body;
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Invalid secret" });
  }
  if (!leads || !Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: "leads array required" });
  }

  const tenant = tenantDb.getByWebhookKey(TENANT_KEY);
  if (!tenant) return res.status(500).json({ error: "Tenant not found" });

  const jobId = "batch-" + Date.now();
  log.info("[BatchCall] Starting immediate batch job " + jobId + " with " + leads.length + " leads");

  // Start calling in background
  processLeadsBatch(tenant, leads, jobId);

  res.json({
    success: true,
    jobId,
    message: "Batch call started for " + leads.length + " leads",
    estimatedMinutes: Math.ceil((leads.length * DELAY_BETWEEN_CALLS_MS) / 60000)
  });
});

// ── POST /schedule — Schedule calls (persistent) ──────────────────
router.post("/schedule", async (req, res) => {
  const { leads, secret, scheduleTime, timezone } = req.body;
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Invalid secret" });
  }
  if (!leads || !Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: "leads array required" });
  }
  if (!scheduleTime) {
    return res.status(400).json({ error: "scheduleTime required (e.g. '2026-04-01 08:00')" });
  }

  const tenant = tenantDb.getByWebhookKey(TENANT_KEY);
  if (!tenant) return res.status(500).json({ error: "Tenant not found" });

  // Parse schedule time — assume EDT (-04:00) if no timezone provided
  let targetDate;
  try {
    if (scheduleTime.includes("T")) {
      targetDate = new Date(scheduleTime);
    } else {
      // "2026-04-01 08:00" → treat as Eastern Daylight Time (UTC-4)
      targetDate = new Date(scheduleTime.replace(" ", "T") + ":00-04:00");
    }
    if (isNaN(targetDate.getTime())) throw new Error("Invalid date");
  } catch (e) {
    return res.status(400).json({ error: "Invalid date format: " + e.message });
  }

  const now = new Date();
  const delayMs = targetDate.getTime() - now.getTime();

  if (delayMs < 0) {
    return res.status(400).json({
      error: "Schedule time is in the past",
      now: now.toISOString(),
      target: targetDate.toISOString()
    });
  }

  const jobId = "scheduled-" + Date.now();
  const job = {
    id: jobId,
    scheduledFor: targetDate.toISOString(),
    leadsCount: leads.length,
    leads: leads,          // store full lead data for re-execution after restart
    status: "scheduled",
    createdAt: now.toISOString()
  };

  // Persist to file — survives restarts
  addJob(job);

  log.info("[BatchCall] Persisted job " + jobId + " → fires at " + targetDate.toISOString() + " (in " + Math.round(delayMs / 60000) + " min)");

  res.json({
    success: true,
    jobId,
    scheduledFor: targetDate.toISOString(),
    delayMinutes: Math.round(delayMs / 60000),
    leadsCount: leads.length,
    message: "Calls scheduled for " + targetDate.toISOString() + " (persistent — survives restarts)"
  });
});

// ── DELETE /schedule/:jobId — Cancel a scheduled job ──────────────
router.delete("/schedule/:jobId", (req, res) => {
  const secret = req.query.secret || req.headers["x-admin-secret"];
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Invalid secret" });
  }
  const { jobId } = req.params;
  const jobs = loadJobs();
  const job = jobs.find(j => j.id === jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  removeJob(jobId);
  log.info("[BatchCall] Cancelled job " + jobId);
  res.json({ success: true, message: "Job " + jobId + " cancelled" });
});

// ── GET /status — Check all scheduled/completed jobs ──────────────
router.get("/status", (req, res) => {
  const secret = req.query.secret || req.headers["x-admin-secret"];
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Invalid secret" });
  }
  res.json({
    scheduledJobs: loadJobs(),
    recentResults: callResults.slice(-50),
    serverTime: new Date().toISOString(),
    storageFile: SCHEDULED_CALLS_FILE
  });
});

// ── GET /dnc — List blocked numbers ───────────────────────────────
router.get("/dnc", (req, res) => {
  const secret = req.query.secret || req.headers["x-admin-secret"];
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Invalid secret" });
  }
  try {
    const raw = fs.existsSync(DNC_FILE) ? JSON.parse(fs.readFileSync(DNC_FILE, "utf8")) : { blockedNumbers: [], notes: {} };
    res.json({ ...raw, count: (raw.blockedNumbers || []).length });
  } catch (e) {
    res.json({ blockedNumbers: [], notes: {}, count: 0 });
  }
});

// ── POST /dnc — Add a number to the DNC list ──────────────────────
router.post("/dnc", (req, res) => {
  const secret = req.body.secret || req.headers["x-admin-secret"];
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Invalid secret" });
  }
  const { phone, reason } = req.body;
  if (!phone) return res.status(400).json({ error: "phone required" });

  const normalized = normalizePhone(phone);
  if (!normalized) return res.status(400).json({ error: "Invalid phone number" });

  try {
    const existing = fs.existsSync(DNC_FILE) ? JSON.parse(fs.readFileSync(DNC_FILE, "utf8")) : { blockedNumbers: [], notes: {} };
    if (!existing.blockedNumbers.includes(normalized)) {
      existing.blockedNumbers.push(normalized);
    }
    if (reason) existing.notes[normalized] = reason;
    saveDNC(existing.blockedNumbers, existing.notes);
    log.info("[BatchCall] Added to DNC: " + normalized + (reason ? " — " + reason : ""));
    res.json({ success: true, blocked: normalized, total: existing.blockedNumbers.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /dnc/:phone — Remove a number from the DNC list ────────
router.delete("/dnc/:phone", (req, res) => {
  const secret = req.query.secret || req.headers["x-admin-secret"];
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Invalid secret" });
  }
  const normalized = normalizePhone(decodeURIComponent(req.params.phone));
  try {
    const existing = fs.existsSync(DNC_FILE) ? JSON.parse(fs.readFileSync(DNC_FILE, "utf8")) : { blockedNumbers: [], notes: {} };
    existing.blockedNumbers = existing.blockedNumbers.filter(n => n !== normalized);
    delete existing.notes[normalized];
    saveDNC(existing.blockedNumbers, existing.notes);
    log.info("[BatchCall] Removed from DNC: " + normalized);
    res.json({ success: true, unblocked: normalized, total: existing.blockedNumbers.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Process leads batch ────────────────────────────────────────────
async function processLeadsBatch(tenant, leads, jobId) {
  for (let i = 0; i < leads.length; i++) {
    const leadData = leads[i];
    const phone = normalizePhone(leadData.phone);

    if (!phone) {
      log.warn("[BatchCall] Lead " + leadData.name + " has no phone — skipping");
      callResults.push({ jobId, name: leadData.name, phone: "", status: "skipped", reason: "no phone", at: new Date().toISOString() });
      continue;
    }

    // ── DNC check ────────────────────────────────────────────────
    if (isOnDNC(phone)) {
      log.warn("[BatchCall] " + phone + " is on DNC list — skipping");
      callResults.push({ jobId, name: leadData.name, phone, status: "skipped", reason: "on DNC list", at: new Date().toISOString() });
      continue;
    }

    try {
      const lead = leadDb.create({
        tenantId: tenant.id,
        name: leadData.name || "Lead",
        phone: phone,
        email: leadData.email || "",
        city: leadData.city || "",
        serviceType: leadData.serviceType || "Residential Cleaning",
        source: leadData.source || "batch_call",
        utmSource: leadData.utmSource || "batch",
        notes: "Batch call job: " + jobId,
        status: "new",
        callId: null,
        callStatus: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      log.info("[BatchCall] Calling " + (i + 1) + "/" + leads.length + ": " + leadData.name + " (" + phone + ")");

      const call = await vapi.makeCall(tenant, lead);
      leadDb.update(lead.id, { callId: call.id, callStatus: "initiated", status: "called" });

      callResults.push({
        jobId, name: leadData.name, phone, status: "called",
        callId: call.id, leadId: lead.id, at: new Date().toISOString()
      });

      log.info("[BatchCall] Call initiated for " + leadData.name + " — Call ID: " + call.id);

    } catch (err) {
      log.error("[BatchCall] Error calling " + leadData.name + ": " + err.message);
      callResults.push({ jobId, name: leadData.name, phone, status: "error", error: err.message, at: new Date().toISOString() });
    }

    if (i < leads.length - 1) {
      log.info("[BatchCall] Waiting " + (DELAY_BETWEEN_CALLS_MS / 1000) + "s before next call...");
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CALLS_MS));
    }
  }

  updateJobStatus(jobId, "completed");
  runningJobs.delete(jobId);
  log.info("[BatchCall] Job " + jobId + " completed! " + leads.length + " leads processed.");
}

module.exports = router;
