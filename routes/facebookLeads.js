/**
 * ROUTE: FACEBOOK LEAD ADS WEBHOOK
 * Recebe leads do Facebook Lead Ads e dispara ligação Hannah automaticamente.
 *
 * COMO FUNCIONA:
 * 1. Facebook envia notificação quando um lead preenche o formulário
 * 2. Este endpoint recebe o leadgen_id
 * 3. Busca os dados do lead na API do Facebook
 * 4. Cria o lead no sistema
 * 5. Hannah liga em menos de 30 segundos!
 *
 * SETUP NO FACEBOOK:
 * - App Webhook URL: https://lopesservices.top/api/facebook/leads
 * - Verify Token: (definido em FB_WEBHOOK_VERIFY_TOKEN no .env)
 * - Subscription: leadgen
 */

const express = require("express");
const router  = express.Router();
const axios   = require("axios");
const tenantDb = require("../modules/tenantDb");
const leadDb   = require("../modules/leadDb");
const vapi     = require("../modules/vapi");
const { log, normalizePhone } = require("../modules/guard");

const VERIFY_TOKEN  = process.env.FB_WEBHOOK_VERIFY_TOKEN  || "hannah-lopes-verify-2026";
const PAGE_TOKEN    = process.env.FB_PAGE_ACCESS_TOKEN      || "";
const TENANT_KEY    = "lopes"; // Lopes Cleaning Services

// ── GET: Verificação do Webhook pelo Facebook ─────────────────────
router.get("/", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    log.info("[Facebook Leads] ✅ Webhook verificado pelo Facebook");
    return res.status(200).send(challenge);
  }

  log.error("[Facebook Leads] ❌ Falha na verificação do webhook");
  res.sendStatus(403);
});

// ── POST: Receber notificação de novo lead ────────────────────────
router.post("/", async (req, res) => {
  // Responde 200 imediatamente para o Facebook não reenviar
  res.sendStatus(200);

  try {
    const body = req.body;

    if (body.object !== "page") {
      log.info("[Facebook Leads] Notificação ignorada (não é page):", body.object);
      return;
    }

    // Processar cada entrada
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "leadgen") continue;

        const leadgenId = change.value?.leadgen_id;
        const formId    = change.value?.form_id;
        const pageId    = change.value?.page_id;

        if (!leadgenId) continue;

        log.info(`[Facebook Leads] 📥 Novo lead recebido! leadgen_id=${leadgenId}`);

        // Buscar dados do lead na API do Facebook
        await processLead(leadgenId, formId, pageId);
      }
    }
  } catch (err) {
    log.error("[Facebook Leads] Erro ao processar notificação:", err.message);
  }
});

// ── Endpoint manual para reprocessar leads existentes ────────────
// POST /api/facebook/leads/manual  { leadgen_id: "..." }
router.post("/manual", async (req, res) => {
  const { leadgen_id, form_id, page_id } = req.body;

  if (!leadgen_id) {
    return res.status(400).json({ error: "leadgen_id is required" });
  }

  try {
    const result = await processLead(leadgen_id, form_id, page_id);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Endpoint para buscar todos os leads de um formulário ──────────
// GET /api/facebook/leads/form/:formId
router.get("/form/:formId", async (req, res) => {
  if (!PAGE_TOKEN) {
    return res.status(500).json({ error: "FB_PAGE_ACCESS_TOKEN não configurado" });
  }

  try {
    const { formId } = req.params;
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${formId}/leads`,
      { params: { access_token: PAGE_TOKEN, fields: "id,created_time,field_data" } }
    );

    const leads = response.data.data || [];
    log.info(`[Facebook Leads] Encontrados ${leads.length} leads no formulário ${formId}`);

    res.json({ success: true, count: leads.length, leads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Processar um lead individual ──────────────────────────────────
async function processLead(leadgenId, formId, pageId) {
  if (!PAGE_TOKEN) {
    log.error("[Facebook Leads] FB_PAGE_ACCESS_TOKEN não configurado no .env");
    throw new Error("FB_PAGE_ACCESS_TOKEN não configurado");
  }

  // Buscar dados do lead via Graph API
  const response = await axios.get(
    `https://graph.facebook.com/v18.0/${leadgenId}`,
    { params: { access_token: PAGE_TOKEN, fields: "id,created_time,field_data" } }
  );

  const fieldData = response.data.field_data || [];

  // Mapear campos do formulário
  const fields = {};
  for (const f of fieldData) {
    const key = (f.name || "").toLowerCase().replace(/[^a-z0-9]/g, "_");
    fields[key] = f.values?.[0] || "";
  }

  log.info(`[Facebook Leads] Campos recebidos:`, JSON.stringify(fields));

  // Extrair dados (Facebook usa nomes variados dependendo do formulário)
  const name  = fields.full_name  || fields.name   || fields.first_name || "Lead Facebook";
  const phone = fields.phone_number|| fields.phone  || fields.tel        || "";
  const email = fields.email       || fields.e_mail || "";
  const city  = fields.city        || fields.cidade || "Melbourne FL";

  if (!phone) {
    log.error(`[Facebook Leads] Lead ${leadgenId} sem telefone — não é possível ligar`);
    return { skipped: true, reason: "no phone" };
  }

  // Encontrar tenant
  const tenant = tenantDb.getByWebhookKey(TENANT_KEY);
  if (!tenant) {
    throw new Error(`Tenant '${TENANT_KEY}' não encontrado`);
  }

  // Criar lead no sistema
  const lead = leadDb.create({
    tenantId:   tenant.id,
    name:       name,
    phone:      normalizePhone(phone),
    email:      email,
    city:       city,
    serviceType:"Residential Cleaning",
    bedrooms:   fields.bedrooms || "",
    bathrooms:  fields.bathrooms || "",
    source:     "facebook_lead_ads",
    utmSource:  "facebook",
    utmMedium:  "lead_ads",
    utmCampaign:formId || "",
    notes:      `Facebook Lead ID: ${leadgenId}`,
    status:     "new",
    callId:     null,
    callStatus: null,
    createdAt:  new Date().toISOString(),
    updatedAt:  new Date().toISOString(),
  });

  log.info(`[Facebook Leads] ✅ Lead salvo: ${name} (${phone})`);

  // Disparar ligação Hannah após 5 segundos
  setTimeout(async () => {
    try {
      log.info(`[Facebook Leads] 📞 Hannah ligando para ${name} (${phone})...`);
      const call = await vapi.makeCall(tenant, lead);
      leadDb.update(lead.id, { callId: call.id, callStatus: "initiated", status: "called" });
      log.info(`[Facebook Leads] ✅ Ligação iniciada! Vapi Call ID: ${call.id}`);
    } catch (err) {
      log.error(`[Facebook Leads] ❌ Erro na ligação:`, err.message);
      leadDb.update(lead.id, { callStatus: "failed", callError: err.message });
    }
  }, 5000);

  return { success: true, leadId: lead.id, name, phone };
}

module.exports = router;
