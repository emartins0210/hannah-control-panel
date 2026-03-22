/**
 * ROUTE: WEBHOOK
 * Recebe o formulário do site do cliente e dispara a ligação Vapi.
 *
 * URL: POST /api/webhook/:webhookKey
 *
 * Como funciona:
 * 1. Site envia dados do formulário para esta URL
 * 2. Sistema identifica a empresa pelo webhookKey
 * 3. Salva o lead
 * 4. Dispara ligação via Vapi.ai em < 30 segundos
 */

const express  = require("express");
const router   = express.Router();
const { v4: uuidv4 } = require("uuid");
const tenantDb = require("../modules/tenantDb");
const leadDb   = require("../modules/leadDb");
const vapi     = require("../modules/vapi");
const { log }  = require("../modules/guard");

/**
 * POST /api/webhook/:webhookKey
 *
 * Body esperado (formulário do site lopesservices.top):
 * {
 *   name: "Sarah Johnson",
 *   phone: "3215550199",
 *   email: "sarah@email.com",
 *   serviceType: "Residential Cleaning",
 *   bedrooms: "3",
 *   bathrooms: "2",
 *   frequency: "bi-weekly",
 *   address: "123 Main St, Melbourne FL",
 *   notes: "Have 2 dogs",
 *   source: "google_ads"   // opcional
 * }
 */
router.post("/:webhookKey", async (req, res) => {
  const { webhookKey } = req.params;

  // 1. Identificar empresa pelo webhookKey
  const tenant = tenantDb.getByWebhookKey(webhookKey);
  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" });
  }

  if (!tenant.active) {
    return res.status(403).json({ error: "Tenant account inactive" });
  }

  const {
    name, firstName, lastName, phone, email,
    serviceType, bedrooms, bathrooms,
    frequency, address, notes, source, utmSource, utmMedium, utmCampaign, utmContent,
  } = req.body;

  // Monta nome completo — aceita name, firstName+lastName, ou firstName sozinho
  const fullName = name ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    firstName || lastName || "";

  // Validação básica
  if (!fullName || !phone) {
    return res.status(400).json({ error: "name and phone are required" });
  }

  // 2. Salvar lead
  const lead = leadDb.create({
    id: uuidv4(),
    tenantId: tenant.id,
    name: fullName,
    phone,
    email: email || "",
    serviceType: serviceType || "General Cleaning",
    bedrooms: bedrooms || "",
    bathrooms: bathrooms || "",
    frequency: frequency || "",
    address: address || "",
    notes: notes || "",
    source:      source      || "website_organic",
    utmSource:   utmSource   || "",
    utmMedium:   utmMedium   || "",
    utmCampaign: utmCampaign || "",
    utmContent:  utmContent  || "",
    status: "new",
    callId: null,
    callStatus: null,
    outcome: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  log.info(`\n📋 New lead for ${tenant.companyName}: ${fullName} (${phone}) — ${serviceType}`);

  // 3. Responder imediatamente (não deixar o site esperando)
  res.json({ success: true, leadId: lead.id, message: "Lead received. Call will be initiated shortly." });

  // 4. Disparar ligação de forma assíncrona (não bloqueia a resposta)
  setImmediate(async () => {
    try {
      // Aguarda 5 segundos (dá tempo do cliente fechar o formulário)
      await sleep(5000);

      log.info(`📞 Initiating call to ${name} (${phone})...`);

      const call = await vapi.makeCall(tenant, lead);

      // Atualiza lead com ID da chamada
      leadDb.update(lead.id, {
        callId: call.id,
        callStatus: "initiated",
        status: "called",
      });

      log.ok(`✅ Call initiated! Vapi Call ID: ${call.id}`);

    } catch (err) {
      log.error(`❌ Call failed for lead ${lead.id}:`, err.message);

      leadDb.update(lead.id, {
        callStatus: "failed",
        callError: err.message,
      });

      // Retry após 2 minutos se falhar
      setTimeout(async () => {
        try {
          log.info(`🔄 Retrying call for ${lead.name}...`);
          const call = await vapi.makeCall(tenant, lead);
          leadDb.update(lead.id, { callId: call.id, callStatus: "initiated", status: "called" });
        } catch (retryErr) {
          log.error(`❌ Retry failed:`, retryErr.message);
          leadDb.update(lead.id, { callStatus: "failed_retry" });
        }
      }, 2 * 60 * 1000);
    }
  });
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = router;
