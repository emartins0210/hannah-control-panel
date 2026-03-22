/**
 * ROUTE: CLIENT AUTH
 * Login e acesso ao portal da empresa cliente.
 * Usa tokens seguros com HMAC-SHA256.
 *
 * POST /api/client/login  → email + password → token
 * GET  /api/client/leads  → leads da empresa
 * GET  /api/client/stats  → estatísticas
 */

const express  = require("express");
const router   = express.Router();
const tenantDb = require("../modules/tenantDb");
const leadDb   = require("../modules/leadDb");
const { log }  = require("../modules/guard");
const {
  generateToken, verifyToken,
  verifyPassword, hashPassword,
  authRateLimiter,
} = require("../modules/security");

// ── POST /api/client/login ────────────────────────────────

router.post("/login", authRateLimiter(), (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const tenant = tenantDb.getAll().find(t => t.ownerEmail === email);
  if (!tenant) {
    // Timing-safe: don't reveal if email exists
    return res.status(401).json({ error: "Email or password incorrect" });
  }

  if (!tenant.active) {
    return res.status(403).json({ error: "Account inactive" });
  }

  if (!tenant.clientPassword) {
    return res.status(401).json({ error: "Portal access not yet configured. Contact your administrator." });
  }

  if (!verifyPassword(password, tenant.clientPassword)) {
    log.warn(`Failed login attempt for: ${email}`);
    return res.status(401).json({ error: "Email or password incorrect" });
  }

  const token = generateToken(tenant.id);
  log.info(`Client login: ${tenant.companyName}`);

  res.json({
    token,
    company:     tenant.companyName,
    aiName:      tenant.aiName,
    serviceAreas: tenant.serviceAreas,
  });
});

// ── Auth middleware ───────────────────────────────────────

function clientAuth(req, res, next) {
  const auth  = req.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const tenantId = verifyToken(token);
  if (!tenantId)  return res.status(401).json({ error: "Invalid or expired token" });

  const tenant = tenantDb.getById(tenantId);
  if (!tenant || !tenant.active) return res.status(401).json({ error: "Unauthorized" });

  req.tenant = tenant;
  next();
}

// ── GET /api/client/leads ─────────────────────────────────

router.get("/leads", clientAuth, (req, res) => {
  const leads = leadDb.getByTenant(req.tenant.id);
  const sorted = leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ leads: sorted, count: sorted.length });
});

// ── GET /api/client/stats ─────────────────────────────────

router.get("/stats", clientAuth, (req, res) => {
  const leads  = leadDb.getByTenant(req.tenant.id);
  const booked = leads.filter(l => l.status === "booked" || l.outcome === "booked");
  const called = leads.filter(l => l.callId);

  // Revenue estimate
  const avgPrice = 175;
  const revenue  = booked.length * avgPrice;

  // Frequency breakdown
  const weekly    = booked.filter(l => (l.frequency||"").toLowerCase().includes("week") && !(l.frequency||"").toLowerCase().includes("bi")).length;
  const biweekly  = booked.filter(l => (l.frequency||"").toLowerCase().includes("bi")).length;
  const monthly   = booked.filter(l => (l.frequency||"").toLowerCase().includes("month")).length;

  res.json({
    totalLeads:     leads.length,
    called:         called.length,
    booked:         booked.length,
    conversionRate: leads.length > 0 ? ((booked.length / leads.length) * 100).toFixed(1) + "%" : "0%",
    estimatedRevenue: "$" + revenue.toLocaleString(),
    frequency: { weekly, biweekly, monthly },
  });
});

// ── GET /api/client/bookings ──────────────────────────────

router.get("/bookings", clientAuth, (req, res) => {
  const leads   = leadDb.getByTenant(req.tenant.id);
  const booked  = leads
    .filter(l => l.status === "booked" || l.outcome === "booked")
    .sort((a, b) => new Date(b.bookedAt || b.createdAt) - new Date(a.bookedAt || a.createdAt));
  res.json({ bookings: booked, count: booked.length });
});

module.exports = router;
