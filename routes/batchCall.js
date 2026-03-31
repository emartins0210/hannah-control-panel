/**
 * ROUTE: BATCH CALL — Schedule Hannah to call a list of leads
 * POST /api/batch-call          — call leads immediately (with delay between each)
 * POST /api/batch-call/schedule — schedule calls for a specific time (ET timezone)
 * GET  /api/batch-call/status   — check scheduled/completed calls
 */

const express  = require("express");
const router   = express.Router();
const tenantDb = require("../modules/tenantDb");
const leadDb   = require("../modules/leadDb");
const vapi     = require("../modules/vapi");
const { log, normalizePhone } = require("../modules/guard");

const TENANT_KEY = "lopes";
const DELAY_BETWEEN_CALLS_MS = 45000; // 45 seconds between calls

// In-memory store for scheduled jobs and results
const scheduledJobs = [];
const callResults = [];

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
  log.info("[BatchCall] Starting batch call job " + jobId + " with " + leads.length + " leads");

  // Start calling in background
  processLeadsBatch(tenant, leads, jobId);

  res.json({
    success: true,
    jobId,
    message: "Batch call started for " + leads.length + " leads",
    estimatedMinutes: Math.ceil((leads.length * DELAY_BETWEEN_CALLS_MS) / 60000)
  });
});

// ── POST /schedule — Schedule calls for a specific time ───────────
router.post("/schedule", async (req, res) => {
  const { leads, secret, scheduleTime, timezone } = req.body;
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Invalid secret" });
  }
  if (!leads || !Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: "leads array required" });
  }
  if (!scheduleTime) {
    return res.status(400).json({ error: "scheduleTime required (ISO format or 'YYYY-MM-DD HH:mm')" });
  }

  const tenant = tenantDb.getByWebhookKey(TENANT_KEY);
  if (!tenant) return res.status(500).json({ error: "Tenant not found" });

  // Parse schedule time — assume ET (Eastern Time) if no timezone provided
  const tz = timezone || "America/New_York";
  let targetDate;
  try {
    // Support both ISO and simple format
    if (scheduleTime.includes("T")) {
      targetDate = new Date(scheduleTime);
    } else {
      // Simple format: "2026-04-01 08:00"
      targetDate = new Date(scheduleTime.replace(" ", "T") + ":00-04:00"); // EDT
    }
  } catch (e) {
    return res.status(400).json({ error: "Invalid date format" });
  }

  const now = new Date();
  const delayMs = targetDate.getTime() - now.getTime();

  if (delayMs < 0) {
    return res.status(400).json({ error: "Schedule time is in the past", now: now.toISOString(), target: targetDate.toISOString() });
  }

  const jobId = "scheduled-" + Date.now();
  const job = {
    id: jobId,
    scheduledFor: targetDate.toISOString(),
    leadsCount: leads.length,
    leads: leads.map(l => ({ name: l.name, phone: l.phone })),
    status: "scheduled",
    createdAt: now.toISOString()
  };
  scheduledJobs.push(job);

  log.info("[BatchCall] Scheduled job " + jobId + " for " + targetDate.toISOString() + " with " + leads.length + " leads (delay: " + Math.round(delayMs / 60000) + " min)");

  // Schedule the batch call
  setTimeout(() => {
    log.info("[BatchCall] Executing scheduled job " + jobId + " NOW!");
    job.status = "running";
    processLeadsBatch(tenant, leads, jobId);
  }, delayMs);

  res.json({
    success: true,
    jobId,
    scheduledFor: targetDate.toISOString(),
    delayMinutes: Math.round(delayMs / 60000),
    leadsCount: leads.length,
    message: "Calls scheduled for " + targetDate.toISOString()
  });
});

// ── GET /status — Check all scheduled/completed jobs ──────────────
router.get("/status", (req, res) => {
  const secret = req.query.secret || req.headers["x-admin-secret"];
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Invalid secret" });
  }
  res.json({
    scheduledJobs,
    recentResults: callResults.slice(-50),
    serverTime: new Date().toISOString()
  });
});

// ── Process leads batch (called immediately or via setTimeout) ────
async function processLeadsBatch(tenant, leads, jobId) {
  for (let i = 0; i < leads.length; i++) {
    const leadData = leads[i];
    const phone = normalizePhone(leadData.phone);

    if (!phone) {
      log.warn("[BatchCall] Lead " + leadData.name + " has no phone — skipping");
      callResults.push({ jobId, name: leadData.name, phone: "", status: "skipped", reason: "no phone", at: new Date().toISOString() });
      continue;
    }

    try {
      // Create lead in DB
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

      log.info("[BatchCall] Calling lead " + (i + 1) + "/" + leads.length + ": " + leadData.name + " (" + phone + ")");

      // Make the call
      const call = await vapi.makeCall(tenant, lead);
      leadDb.update(lead.id, { callId: call.id, callStatus: "initiated", status: "called" });

      callResults.push({
        jobId, name: leadData.name, phone, status: "called",
        callId: call.id, leadId: lead.id, at: new Date().toISOString()
      });

      log.info("[BatchCall] Call initiated for " + leadData.name + " — Call ID: " + call.id);

    } catch (err) {
      log.error("[BatchCall] Error calling " + leadData.name + ": " + err.message);
      callResults.push({
        jobId, name: leadData.name, phone, status: "error",
        error: err.message, at: new Date().toISOString()
      });
    }

    // Wait between calls (except after the last one)
    if (i < leads.length - 1) {
      log.info("[BatchCall] Waiting " + (DELAY_BETWEEN_CALLS_MS / 1000) + "s before next call...");
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CALLS_MS));
    }
  }

  // Update job status
  const job = scheduledJobs.find(j => j.id === jobId);
  if (job) job.status = "completed";

  log.info("[BatchCall] Job " + jobId + " completed! " + leads.length + " leads processed.");
}

module.exports = router;
