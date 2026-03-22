/**
 * CleanAI SaaS — Main Server
 * Multi-tenant AI Sales System for Housecleaning Companies
 *
 * HOW TO RUN LOCALLY:
 *   1. npm install
 *   2. cp .env.example .env  →  fill in your keys
 *   3. npm run dev
 *
 * HOW TO DEPLOY ON RAILWAY:
 *   See DEPLOY.md
 */

require("dotenv").config();
const express = require("express");
const path    = require("path");
const { log, validateEnv, installCrashProtection } = require("./modules/guard");
const { securityHeaders, corsConfig, rateLimiter, sanitizeBody } = require("./modules/security");

// Install crash protection FIRST — keeps server alive on any unhandled error
installCrashProtection();

const app = express();

app.use(securityHeaders());
app.use(corsConfig());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(sanitizeBody());
app.use(rateLimiter(120, 60000)); // 120 req/min per IP

// Serve admin dashboard (static files in /public)
app.use(express.static(path.join(__dirname, "public")));

// ── Routes ───────────────────────────────────────────────
app.use("/api/webhook",      require("./routes/webhook"));
app.use("/api/vapi/webhook", require("./routes/vapiWebhook"));
app.use("/api/admin",        require("./routes/admin"));
app.use("/api/client",       require("./routes/clientAuth"));
app.use("/api/lookup",       require("./routes/clientLookup"));

// ── Health check ─────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "CleanAI SaaS",
    time: new Date().toISOString(),
    tenants: require("./modules/tenantDb").getAll().length,
  });
});

// ── Root ─────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin/index.html"));
});

app.get("/client", (req, res) => {
  res.sendFile(path.join(__dirname, "public/client/index.html"));
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  validateEnv();
  log.info(`
╔══════════════════════════════════════════════╗
║       CleanAI SaaS — Server Running          ║
╠══════════════════════════════════════════════╣
║  Port    : ${PORT}                                ║
║  Admin   : http://localhost:${PORT}/admin         ║
║  Health  : http://localhost:${PORT}/health        ║
╚══════════════════════════════════════════════╝
  `);

  // Validate required env vars
  const required = ["VAPI_API_KEY", "ADMIN_SECRET", "PUBLIC_URL"];
  const missing  = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    log.warn(`\n⚠️  Missing environment variables: ${missing.join(", ")}`);
    log.warn("   Add them in Railway → Variables");
  }
});
