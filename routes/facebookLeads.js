/**
 * ROUTE: FACEBOOK LEAD ADS WEBHOOK
 * Recebe leads do Facebook Lead Ads e dispara ligacao Hannah automaticamente.
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
const TENANT_KEY    = "lopes";

router.get("/", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    log.info("[Facebook Leads] Webhook verificado");
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

router.post("/", async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body;
    if (body.object !== "page") return;
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "leadgen") continue;
        const leadgenId = change.value?.leadgen_id;
        if (!leadgenId) continue;
        log.info("[Facebook Leads] Novo lead! id=" + leadgenId);
        await processLead(leadgenId, change.value?.form_id);
      }
    }
  } catch (err) {
    log.error("[Facebook Leads] Erro:", err.message);
  }
});

router.post("/manual", async (req, res) => {
  const { leadgen_id, name, phone, email, city } = req.body;
  if (!leadgen_id && phone) {
    try {
      const result = await createLeadDirect(name, phone, email, city);
      return res.json({ success: true, result });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  if (!leadgen_id) return res.status(400).json({ error: "leadgen_id or phone required" });
  try {
    const result = await processLead(leadgen_id);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/form/:formId", async (req, res) => {
  if (!PAGE_TOKEN) return res.status(500).json({ error: "FB_PAGE_ACCESS_TOKEN nao configurado" });
  try {
    const response = await axios.get("https://graph.facebook.com/v18.0/" + req.params.formId + "/leads", {
      params: { access_token: PAGE_TOKEN, fields: "id,created_time,field_data" }
    });
    res.json({ success: true, count: (response.data.data || []).length, leads: response.data.data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function processLead(leadgenId, formId) {
  if (!PAGE_TOKEN) throw new Error("FB_PAGE_ACCESS_TOKEN nao configurado");
  const response = await axios.get("https://graph.facebook.com/v18.0/" + leadgenId, {
    params: { access_token: PAGE_TOKEN, fields: "id,created_time,field_data" }
  });
  const fields = {};
  for (const f of response.data.field_data || []) {
    fields[(f.name || "").toLowerCase().replace(/[^a-z0-9]/g, "_")] = f.values?.[0] || "";
  }
  const name  = fields.full_name || fields.name || fields.first_name || "";
  const phone = fields.phone_number || fields.phone || "";
  const email = fields.email || "";
  const city  = fields.city || "Melbourne FL";
  if (!phone) return { skipped: true, reason: "no phone" };
  return createLeadDirect(name, phone, email, city, "facebook_lead_ads", formId, leadgenId);
}

async function createLeadDirect(name, phone, email, city, source, formId, leadgenId) {
  const tenant = tenantDb.getByWebhookKey(TENANT_KEY);
  if (!tenant) throw new Error("Tenant nao encontrado");
  const lead = leadDb.create({
    tenantId: tenant.id, name: name || "", phone: normalizePhone(phone),
    email: email || "", city: city || "Melbourne FL", serviceType: "Residential Cleaning",
    source: source || "facebook_manual", utmSource: "facebook", utmMedium: "lead_ads",
    utmCampaign: formId || "", notes: leadgenId ? "FB Lead: " + leadgenId : "Manual",
    status: "new", callId: null, callStatus: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });
  log.info("[Facebook Leads] Lead salvo: " + name + " (" + phone + ")");
  setTimeout(async () => {
    try {
      const call = await vapi.makeCall(tenant, lead);
      leadDb.update(lead.id, { callId: call.id, callStatus: "initiated", status: "called" });
      log.info("[Facebook Leads] Ligacao iniciada! Call ID: " + call.id);
    } catch (err) {
      log.error("[Facebook Leads] Erro ligacao: " + err.message);
      leadDb.update(lead.id, { callStatus: "failed", callError: err.message });
    }
  }, 5000);
  return { success: true, leadId: lead.id, name, phone };
}

module.exports = router;
