/**
 * ROUTE: ADMIN
 * Gerencia empresas clientes (tenants) do SaaS.
 * Protegido por ADMIN_SECRET no header.
 *
 * Endpoints:
 * GET    /api/admin/tenants          → lista todas empresas
 * POST   /api/admin/tenants          → cria nova empresa
 * GET    /api/admin/tenants/:id      → detalhes de uma empresa
 * PUT    /api/admin/tenants/:id      → atualiza empresa
 * DELETE /api/admin/tenants/:id      → remove empresa
 * GET    /api/admin/tenants/:id/leads → leads da empresa
 * POST   /api/admin/tenants/:id/setup → configura Vapi (cria assistente)
 */

const express  = require("express");
const router   = express.Router();
const { v4: uuidv4 } = require("uuid");
const tenantDb = require("../modules/tenantDb");
const leadDb   = require("../modules/leadDb");
const vapi     = require("../modules/vapi");
const { log }  = require("../modules/guard");
const { hashPassword, rateLimiter } = require("../modules/security");

// ── Auth middleware ───────────────────────────────────────

function adminAuth(req, res, next) {
  const secret = req.headers["x-admin-secret"] || req.query.secret;
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.use(adminAuth);

// ── GET /api/admin/tenants ────────────────────────────────

router.get("/tenants", (req, res) => {
  const tenants = tenantDb.getAll();
  res.json({ tenants, count: tenants.length });
});

// ── POST /api/admin/tenants ───────────────────────────────

router.post("/tenants", (req, res) => {
  const {
    companyName, ownerName, ownerEmail,
    aiName, serviceAreas, services,
    vapiPhoneNumberId, plan,
    companyPhone, reviewLink,
  } = req.body;

  if (!companyName || !ownerEmail) {
    return res.status(400).json({ error: "companyName and ownerEmail are required" });
  }

  const tenant = tenantDb.create({
    id: uuidv4(),
    webhookKey: uuidv4(),
    companyName,
    ownerName:   ownerName || "",
    ownerEmail,
    aiName:      aiName || "Hannah",
    serviceAreas: serviceAreas || "United States",
    services: services || defaultServices(),
    vapiPhoneNumberId: vapiPhoneNumberId || "",
    vapiAssistantId:   "",
    vapiInboundAssistantId: "",
    companyPhone: companyPhone || "",
    reviewLink:   reviewLink   || "",
    plan:    plan || "starter",
    active:  true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  res.status(201).json({
    tenant,
    webhookUrl: `${process.env.PUBLIC_URL}/api/webhook/${tenant.webhookKey}`,
    message: "Tenant created!",
  });
});

// ── GET /api/admin/tenants/:id ────────────────────────────

router.get("/tenants/:id", (req, res) => {
  const tenant = tenantDb.getById(req.params.id);
  if (!tenant) return res.status(404).json({ error: "Not found" });

  const leads = leadDb.getByTenant(tenant.id);
  const stats = {
    totalLeads: leads.length,
    called:     leads.filter(l => l.status === "called").length,
    booked:     leads.filter(l => l.status === "booked").length,
    conversionRate: leads.length > 0
      ? ((leads.filter(l => l.status === "booked").length / leads.length) * 100).toFixed(1) + "%"
      : "0%",
  };

  res.json({
    tenant,
    stats,
    webhookUrl: `${process.env.PUBLIC_URL}/api/webhook/${tenant.webhookKey}`,
  });
});

// ── PUT /api/admin/tenants/:id ────────────────────────────

router.put("/tenants/:id", (req, res) => {
  const updated = tenantDb.update(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ tenant: updated });
});

// ── DELETE /api/admin/tenants/:id ────────────────────────

router.delete("/tenants/:id", (req, res) => {
  tenantDb.remove(req.params.id);
  res.json({ success: true });
});

// ── GET /api/admin/tenants/:id/leads ─────────────────────

router.get("/tenants/:id/leads", (req, res) => {
  const tenant = tenantDb.getById(req.params.id);
  if (!tenant) return res.status(404).json({ error: "Not found" });

  const leads = leadDb.getByTenant(tenant.id);
  res.json({ leads, count: leads.length });
});

// ── POST /api/admin/tenants/:id/set-password ─────────────
// Define senha de acesso ao painel do cliente

router.post("/tenants/:id/set-password", (req, res) => {
  const tenant = tenantDb.getById(req.params.id);
  if (!tenant) return res.status(404).json({ error: "Not found" });

  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const updated = tenantDb.update(tenant.id, { clientPassword: password });
  res.json({
    success: true,
    message: `Password set! Client can now login at /client with email: ${tenant.ownerEmail}`,
  });
});

// ── POST /api/admin/tenants/:id/setup-inbound ────────────
// Cria assistente inbound (atende ligações diretas)

router.post("/tenants/:id/setup-inbound", async (req, res) => {
  const tenant = tenantDb.getById(req.params.id);
  if (!tenant) return res.status(404).json({ error: "Not found" });

  if (!tenant.vapiPhoneNumberId) {
    return res.status(400).json({ error: "vapiPhoneNumberId is required." });
  }

  const { force } = req.body;

  // If already configured and not forced — update prompt only, no new assistant
  if (tenant.vapiInboundAssistantId && !force) {
    try {
      log.info(`Updating inbound prompt for ${tenant.companyName}...`);
      await vapi.updateInboundAssistantPrompt(tenant.vapiInboundAssistantId, tenant);
      return res.json({
        success: true,
        assistantId: tenant.vapiInboundAssistantId,
        message: "Inbound prompt updated! No new assistant created — existing one preserved.",
      });
    } catch (e) {
      log.warn("Could not update inbound prompt, will recreate:", e.message);
    }
  }

  try {
    log.info(`Creating inbound assistant for ${tenant.companyName}...`);
    const assistant = await vapi.createInboundAssistant(tenant);
    const assistantId = assistant.id || assistant.assistantId;
    if (!assistantId) throw new Error("Vapi did not return an assistant ID.");

    await vapi.linkAssistantToPhone(tenant.vapiPhoneNumberId, assistantId);
    tenantDb.update(tenant.id, { vapiInboundAssistantId: assistantId });

    res.json({
      success: true,
      assistantId,
      message: "Inbound assistant created and linked! Hannah will now answer all incoming calls.",
    });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// ── POST /api/admin/tenants/:id/setup ────────────────────
// Cria assistente Vapi para o tenant

router.post("/tenants/:id/setup", async (req, res) => {
  const tenant = tenantDb.getById(req.params.id);
  if (!tenant) return res.status(404).json({ error: "Not found" });

  if (!tenant.vapiPhoneNumberId) {
    return res.status(400).json({
      error: "vapiPhoneNumberId is required. Update the tenant with a valid Vapi Phone Number ID first.",
    });
  }

  // If caller provides an existing assistantId (e.g. already created in Vapi dashboard)
  const { existingAssistantId } = req.body;
  if (existingAssistantId) {
    const updated = tenantDb.update(tenant.id, { vapiAssistantId: existingAssistantId });
    return res.json({
      success: true,
      assistantId: existingAssistantId,
      tenant: updated,
      message: "Existing Vapi assistant linked successfully!",
    });
  }

  // If already configured and not forced — update prompt only, no new assistant
  if (tenant.vapiAssistantId && !existingAssistantId) {
    try {
      log.info(`Updating outbound prompt for ${tenant.companyName}...`);
      await vapi.updateAssistantPrompt(tenant.vapiAssistantId, tenant);
      return res.json({
        success: true,
        assistantId: tenant.vapiAssistantId,
        message: "Assistant prompt updated! No new assistant created — existing one preserved.",
      });
    } catch (e) {
      log.warn("Could not update prompt, will recreate:", e.message);
    }
  }

  try {
    log.info(`Creating outbound assistant for ${tenant.companyName}...`);
    const assistant = await vapi.createAssistant(tenant);
    const assistantId = assistant.id || assistant.assistantId;
    if (!assistantId) throw new Error("Vapi did not return an assistant ID. Check your API key and phone number ID.");

    const updated = tenantDb.update(tenant.id, { vapiAssistantId: assistantId });

    try {
      await vapi.linkAssistantToPhone(tenant.vapiPhoneNumberId, assistantId);
    } catch (linkErr) {
      log.warn("Could not auto-link assistant to phone number:", linkErr.message);
    }

    res.json({
      success: true,
      assistantId,
      tenant: updated,
      message: "Vapi assistant created and linked! The tenant is fully configured.",
    });
  } catch (err) {
    log.error("Vapi setup error:", err.response?.data || err.message);
    res.status(500).json({
      error: err.response?.data?.message || err.message,
      hint: "Make sure VAPI_API_KEY is valid and vapiPhoneNumberId exists in your Vapi dashboard.",
    });
  }
});

// ── POST /api/admin/tenants/:id/test-call ────────────────
// Faz uma ligação de teste

router.post("/tenants/:id/test-call", async (req, res) => {
  const tenant = tenantDb.getById(req.params.id);
  if (!tenant) return res.status(404).json({ error: "Not found" });

  const { phone, name } = req.body;
  if (!phone) return res.status(400).json({ error: "phone is required" });

  try {
    const call = await vapi.makeCall(tenant, {
      id: "test",
      name: name || "Test Customer",
      phone,
      serviceType: "Standard Residential Cleaning",
    });
    res.json({ success: true, callId: call.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helpers ───────────────────────────────────────────────

function defaultServices() {
  return [
    { name: "Standard Residential Cleaning", price: "$120–$150/visit", description: "Complete cleaning of all rooms, 2-3 hours" },
    { name: "Deep Cleaning",                 price: "$200–$260/visit", description: "Intensive cleaning including baseboards, cabinets, 4-6 hours" },
    { name: "Move-In/Move-Out Cleaning",     price: "$250–$350",       description: "Full empty property cleaning, 3-5 hours" },
    { name: "Post-Construction Cleaning",    price: "$1,000–$5,000",   description: "Dust, debris removal, final detailing" },
    { name: "Airbnb Turnover",               price: "$90–$120/visit",  description: "Between-guest cleaning, 2 hours" },
  ];
}

module.exports = router;
