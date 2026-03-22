/**
 * CLEANAI SAAS — SETUP AUTOMÁTICO
 * 
 * Executa após o deploy no Railway para configurar tudo automaticamente:
 * 1. Cria o tenant da Lopes Cleaning se não existir
 * 2. Cria o assistente Vapi outbound
 * 3. Cria o assistente Vapi inbound e vincula ao número
 * 4. Exibe resumo completo do sistema
 * 
 * Como usar:
 *   node setup.js
 */

require("dotenv").config();
const { log } = require("./modules/guard");
const { v4: uuidv4 } = require("uuid");
const tenantDb = require("./modules/tenantDb");
const vapi     = require("./modules/vapi");

const LOPES = {
  companyName:       "Lopes Cleaning Services",
  ownerName:         "Fabíola Medeiros",
  ownerEmail:        "lopesservicescleaning@gmail.com",
  aiName:            "Hannah",
  serviceAreas:      "Melbourne FL, Palm Bay FL, Vero Beach FL, Sebastian FL, Satellite Beach FL, Indialantic FL",
  companyPhone:      "(321) 392-7880",
  reviewLink:        process.env.COMPANY_REVIEW_LINK || "",
  vapiPhoneNumberId: process.env.VAPI_PHONE_NUMBER_ID || "",
  plan:              "starter",
};

async function run() {
  log.info("\n╔══════════════════════════════════════╗");
  log.info("║   CleanAI SaaS — Auto Setup          ║");
  log.info("╚══════════════════════════════════════╝\n");

  // 1. Check env vars
  const required = ["VAPI_API_KEY", "ADMIN_SECRET", "PUBLIC_URL"];
  const missing  = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    log.error("❌ Missing required environment variables:");
    missing.forEach(k => log.error(`   - ${k}`));
    log.error("\nAdd them in Railway → Variables and run setup.js again.");
    process.exit(1);
  }
  log.info("✅ Environment variables OK\n");

  // 2. Find or create Lopes tenant
  let tenant = tenantDb.getAll().find(t => t.ownerEmail === LOPES.ownerEmail);

  if (tenant) {
    log.info(`✅ Tenant found: ${tenant.companyName} (${tenant.id})`);
  } else {
    tenant = tenantDb.create({
      id:         uuidv4(),
      webhookKey: uuidv4(),
      ...LOPES,
      services:           defaultServices(),
      vapiAssistantId:    "",
      vapiInboundAssistantId: "",
      clientPassword:     "LopesClean#2026!",
      active:             true,
      createdAt:          new Date().toISOString(),
      updatedAt:          new Date().toISOString(),
    });
    log.info(`✅ Tenant created: ${tenant.companyName} (${tenant.id})`);
  }

  const webhookUrl = `${process.env.PUBLIC_URL}/api/webhook/${tenant.webhookKey}`;
  const vapiWebhookUrl = `${process.env.PUBLIC_URL}/api/vapi/webhook/${tenant.id}`;

  // 3. Setup outbound assistant
  if (!tenant.vapiAssistantId && process.env.VAPI_PHONE_NUMBER_ID) {
    log.info("\n🤖 Creating outbound assistant...");
    try {
      const updatedTenant = { ...tenant, vapiPhoneNumberId: process.env.VAPI_PHONE_NUMBER_ID };
      const assistant = await vapi.createAssistant(updatedTenant);
      const assistantId = assistant.id || assistant.assistantId;
      tenant = tenantDb.update(tenant.id, {
        vapiAssistantId:   assistantId,
        vapiPhoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      });
      log.info(`✅ Outbound assistant created: ${assistantId}`);

      // Link to phone number
      await vapi.linkAssistantToPhone(process.env.VAPI_PHONE_NUMBER_ID, assistantId);
      log.info("✅ Outbound assistant linked to phone number");
    } catch (err) {
      log.warn("⚠️  Could not create outbound assistant:", err.message);
      log.warn("   Run manually: Admin Panel → Companies → Setup Vapi");
    }
  } else if (tenant.vapiAssistantId) {
    log.info(`✅ Outbound assistant already configured: ${tenant.vapiAssistantId}`);
  } else {
    log.warn("⚠️  VAPI_PHONE_NUMBER_ID not set — skipping outbound assistant");
    log.warn("   Add VAPI_PHONE_NUMBER_ID to Railway Variables and re-run");
  }

  // 4. Setup inbound assistant
  if (!tenant.vapiInboundAssistantId && process.env.VAPI_PHONE_NUMBER_ID) {
    log.info("\n📞 Creating inbound assistant...");
    try {
      const currentTenant = tenantDb.getById(tenant.id);
      const inbound = await vapi.createInboundAssistant(currentTenant);
      const inboundId = inbound.id || inbound.assistantId;
      tenant = tenantDb.update(tenant.id, { vapiInboundAssistantId: inboundId });
      await vapi.linkAssistantToPhone(process.env.VAPI_PHONE_NUMBER_ID, inboundId);
      log.info(`✅ Inbound assistant created: ${inboundId}`);
      log.info("✅ Inbound assistant linked — Hannah will now answer all calls");
    } catch (err) {
      log.warn("⚠️  Could not create inbound assistant:", err.message);
      log.warn("   Run manually: Admin Panel → Companies → Inbound");
    }
  } else if (tenant.vapiInboundAssistantId) {
    log.info(`✅ Inbound assistant already configured: ${tenant.vapiInboundAssistantId}`);
  }

  // 5. Summary
  const t = tenantDb.getById(tenant.id);
  log.info("\n╔══════════════════════════════════════════════════════════╗");
  log.info("║              SETUP COMPLETE — SUMMARY                   ║");
  log.info("╠══════════════════════════════════════════════════════════╣");
  log.info(`║  Company:        ${pad(t.companyName, 38)}║`);
  log.info(`║  Tenant ID:      ${pad(t.id, 38)}║`);
  log.info(`║  Webhook Key:    ${pad(t.webhookKey, 38)}║`);
  log.info("╠══════════════════════════════════════════════════════════╣");
  log.info(`║  Outbound Asst:  ${pad(t.vapiAssistantId || "NOT SET", 38)}║`);
  log.info(`║  Inbound Asst:   ${pad(t.vapiInboundAssistantId || "NOT SET", 38)}║`);
  log.info(`║  Phone Number:   ${pad(t.vapiPhoneNumberId || "NOT SET", 38)}║`);
  log.info("╠══════════════════════════════════════════════════════════╣");
  log.info("║  URLS:                                                   ║");
  log.info(`║  Webhook:   ${pad(webhookUrl.slice(0,43), 44)}║`);
  log.info(`║  Vapi Hook: ${pad(vapiWebhookUrl.slice(0,43), 44)}║`);
  log.info("╠══════════════════════════════════════════════════════════╣");
  log.info("║  CLIENT PORTAL:                                          ║");
  log.info(`║  URL:     ${pad((process.env.PUBLIC_URL || "") + "/client", 46)}║`);
  log.info(`║  Email:   ${pad(t.ownerEmail, 46)}║`);
  log.info(`║  Password: LopesClean#2026!                              ║`);
  log.info("╠══════════════════════════════════════════════════════════╣");
  log.info("║  NEXT STEP — Configure Vapi webhook:                     ║");
  log.info("║  dashboard.vapi.ai → Assistant → Advanced → Server URL  ║");
  log.info(`║  ${pad(vapiWebhookUrl.slice(0,55), 55)}║`);
  log.info("╚══════════════════════════════════════════════════════════╝\n");
}

function pad(str, len) {
  str = str || "";
  return str.length > len ? str.slice(0, len) : str + " ".repeat(len - str.length);
}

function defaultServices() {
  return [
    { name: "Standard Residential Cleaning", price: "$120–$175/visit" },
    { name: "Deep Cleaning",                 price: "$200–$350/visit" },
    { name: "Move-In / Move-Out Cleaning",   price: "$250–$400"       },
    { name: "Airbnb Turnover",               price: "$90–$150/visit"  },
    { name: "Post-Construction Cleaning",    price: "From $400"       },
  ];
}

run().catch(err => {
  log.error("\n❌ Setup failed:", err.message);
  process.exit(1);
});
