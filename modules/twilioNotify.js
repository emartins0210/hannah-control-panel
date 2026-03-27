/**
 * MODULE: TWILIO NOTIFICATIONS
 * 
 * Ordem de contato com a Fabíola:
 * 1. SEMPRE tenta ligar primeiro (via Vapi em português)
 * 2. Se não atender ou em casos não urgentes → WhatsApp
 * 
 * Variáveis no Railway:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_NUMBER   → whatsapp:+14155238886 (sandbox) ou número aprovado
 *   FABIOLA_WHATSAPP         → +55XXXXXXXXXXX (para WhatsApp)
 *   FABIOLA_PHONE            → +55XXXXXXXXXXX (para ligar)
 *   EUGENIO_WHATSAPP         → +55XXXXXXXXXXX (recebe cópia de todas notificações WA)
 */

const axios = require("axios");
const { log, safe, env, normalizePhone } = require("./guard");

const CALL_REQUIRED = ["complaint", "owner_request", "out_of_area"];
const WHATSAPP_ONLY = ["new_booking", "reschedule", "cancellation", "general"];

async function notify(tenant, reason, clientInfo, whatsappMessage) {
  log.info("📣 Notifying — reason: " + reason);
  if (WHATSAPP_ONLY.includes(reason)) {
    await sendWhatsApp(whatsappMessage);
    return;
  }
  if (CALL_REQUIRED.includes(reason)) {
    const callResult = await callFabiola(tenant, reason, clientInfo);
    if (!callResult) {
      await sendWhatsApp(whatsappMessage);
    } else {
      setTimeout(async () => { await sendWhatsApp(whatsappMessage); }, 90000);
    }
    return;
  }
  await sendWhatsApp(whatsappMessage);
}

async function callFabiola(tenant, reason, clientInfo) {
  const phone = env("FABIOLA_PHONE");
  const vapiKey = env("VAPI_API_KEY");
  const phoneNumberId = tenant.vapiPhoneNumberId;
  if (!phone || !vapiKey || !phoneNumberId) {
    log.warn("⚠️  Missing FABIOLA_PHONE, VAPI_API_KEY or vapiPhoneNumberId");
    return null;
  }
  const message = buildPortugueseMessage(reason, clientInfo, tenant);
  try {
    const payload = {
      phoneNumberId,
      customer: { number: phone, name: "Fabíola Medeiros" },
      assistant: {
        name: "CleanAI — Aviso para Fabíola",
        voice: { provider: "11labs", voiceId: "rachel" },
        model: {
          provider: "openai", model: "gpt-4o-mini",
          messages: [{ role: "system", content: "Você é assistente da " + tenant.companyName + ". Ligue para Fabíola com aviso importante. Fale em português do Brasil. Seja clara e profissional. Diga a mensagem, pergunte dúvidas, encerre." }],
          temperature: 0.5,
        },
        transcriber: { provider: "deepgram", language: "pt-BR" },
        firstMessage: message,
        endCallFunctionEnabled: true,
        endCallPhrases: ["obrigada","entendido","ok","certo","tchau","até logo","vou resolver"],
        maxDurationSeconds: 90,
        silenceTimeoutSeconds: 15,
      },
      metadata: { type: "owner_notification", reason, clientName: clientInfo.name },
    };
    const res = await axios.post("https://api.vapi.ai/call/phone", payload, {
      headers: { Authorization: "Bearer " + vapiKey, "Content-Type": "application/json" },
    });
    log.info("📞 Call to Fabíola — ID: " + res.data.id);
    return res.data;
  } catch (err) {
    log.error("Call failed:", err.response?.data || err.message);
    return null;
  }
}

async function sendWhatsAppToNumber(accountSid, authToken, from, toNumber, message) {
  const to = toNumber.startsWith("whatsapp:") ? toNumber : "whatsapp:" + toNumber;
  const url = "https://api.twilio.com/2010-04-01/Accounts/" + accountSid + "/Messages.json";
  const body = new URLSearchParams({ From: from, To: to, Body: message });
  const res = await axios.post(url, body.toString(), {
    auth: { username: accountSid, password: authToken },
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return res.data;
}

async function sendWhatsApp(message) {
  const accountSid = env("TWILIO_ACCOUNT_SID");
  const authToken  = env("TWILIO_AUTH_TOKEN");
  const from       = env("TWILIO_WHATSAPP_NUMBER");
  const fabiolaNum = env("FABIOLA_WHATSAPP");
  if (!accountSid || !authToken || !from || !fabiolaNum) {
    log.warn("⚠️  Twilio WhatsApp not configured");
    return null;
  }
  try {
    const r1 = await sendWhatsAppToNumber(accountSid, authToken, from, fabiolaNum, message);
    log.info("📲 WhatsApp → Fabíola SID: " + r1.sid);
  } catch (err) {
    log.error("WhatsApp Fabíola failed:", err.response?.data || err.message);
  }
  const eugenioNum = env("EUGENIO_WHATSAPP");
  if (eugenioNum) {
    try {
      const r2 = await sendWhatsAppToNumber(accountSid, authToken, from, eugenioNum, message);
      log.info("📲 WhatsApp → Eugenio SID: " + r2.sid);
    } catch (err) {
      log.error("WhatsApp Eugenio failed:", err.response?.data || err.message);
    }
  }
  return true;
}

function buildPortugueseMessage(reason, clientInfo, tenant) {
  const name = clientInfo.name || "um cliente";
  const address = clientInfo.address || "endereço não informado";
  const phone = clientInfo.phone || "não informado";
  const company = tenant.companyName || "sua empresa";
  const messages = {
    complaint: "Olá Fabíola! Aviso urgente da " + company + ": o cliente " + name + " do endereço " + address + " ligou com reclamação. Tel: " + phone + ". Entre em contato urgente.",
    owner_request: "Olá Fabíola! O cliente " + name + " da " + company + " pediu para falar com você. Tel: " + phone,
    new_booking: "Olá Fabíola! Novo agendamento na " + company + "! Cliente: " + name + ". Endereço: " + address + ". Tel: " + phone + ". Veja o painel.",
    reschedule: "Olá Fabíola! O cliente " + name + " da " + company + " quer remarcar. End: " + address + ". Tel: " + phone,
    cancellation: "Olá Fabíola! O cliente " + name + " da " + company + " cancelou o agendamento. Tel: " + phone,
    out_of_area: "Olá Fabíola! Cliente " + name + " ligou para " + company + " mas está fora da área. Tel: " + phone + ". Quer atender?",
    general: "Olá Fabíola! Aviso da " + company + ": cliente " + name + " precisa de atenção. Tel: " + phone,
  };
  return messages[reason] || messages.general;
}

function buildWhatsAppMessage(reason, clientInfo, tenant, extraInfo) {
  const name = clientInfo.name || "Cliente";
  const phone = clientInfo.phone || "não informado";
  const address = clientInfo.address || "ver painel";
  const icons = { complaint:"⚠️", owner_request:"📞", new_booking:"🎉", reschedule:"📅", cancellation:"❌", out_of_area:"📍", general:"📋" };
  const titles = { complaint:"RECLAMAÇÃO URGENTE", owner_request:"CLIENTE QUER FALAR COM VOCÊ", new_booking:"NOVO BOOKING CONFIRMADO", reschedule:"PEDIDO DE REMARCAÇÃO", cancellation:"CANCELAMENTO", out_of_area:"ÁREA FORA DE COBERTURA", general:"AVISO DO SISTEMA" };
  const icon = icons[reason] || "📋";
  const title = titles[reason] || "AVISO";
  let msg = icon + " *" + title + "*
*Empresa:* " + tenant.companyName + "

👤 *Cliente:* " + name + "
📱 *Telefone:* " + phone + "
📍 *Endereço:* " + address + "
";
  if (extraInfo) msg += "
" + extraInfo;
  msg += "

_Acesse o painel para ver detalhes._";
  return msg;
}

module.exports = { notify, sendWhatsApp, callFabiola, buildPortugueseMessage, buildWhatsAppMessage };
