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

// Situações que exigem ligação (urgentes)
const CALL_REQUIRED = ["complaint", "owner_request", "out_of_area"];

// Situações que vão só por WhatsApp (informativas)
const WHATSAPP_ONLY = ["new_booking", "reschedule", "cancellation", "general"];

// ── Dispatcher principal ──────────────────────────────────

async function notify(tenant, reason, clientInfo, whatsappMessage) {
  log.info(`\n📣 Notifying Fabíola — reason: ${reason}`);

  if (WHATSAPP_ONLY.includes(reason)) {
    // Novo booking, remarcação, cancelamento → só WhatsApp
    log.info(`📲 WhatsApp only (${reason})`);
    await sendWhatsApp(whatsappMessage);
    return;
  }

  if (CALL_REQUIRED.includes(reason)) {
    // Reclamação, cliente quer falar com dono, área fora → liga primeiro
    log.info(`📞 Calling Fabíola first (${reason})`);
    const callResult = await callFabiola(tenant, reason, clientInfo);

    if (!callResult) {
      // Ligação falhou → WhatsApp como fallback imediato
      log.info("📲 Call failed — falling back to WhatsApp immediately");
      await sendWhatsApp(whatsappMessage);
    } else {
      // Ligação iniciada → WhatsApp como backup após 90s caso não atenda
      setTimeout(async () => {
        log.info("📲 WhatsApp backup sent (in case call was missed)");
        await sendWhatsApp(whatsappMessage);
      }, 90 * 1000);
    }
    return;
  }

  // Qualquer outro caso → só WhatsApp
  await sendWhatsApp(whatsappMessage);
}

// ── Ligar para a Fabíola em português ────────────────────

async function callFabiola(tenant, reason, clientInfo) {
  const phone = env("FABIOLA_PHONE");
  const vapiKey = env("VAPI_API_KEY");
  const phoneNumberId = tenant.vapiPhoneNumberId;

  if (!phone || !vapiKey || !phoneNumberId) {
    log.warn("⚠️  Missing FABIOLA_PHONE, VAPI_API_KEY or vapiPhoneNumberId — skipping call");
    return null;
  }

  const message = buildPortugueseMessage(reason, clientInfo, tenant);

  try {
    const payload = {
      phoneNumberId,
      customer: {
        number: phone,
        name: "Fabíola Medeiros",
      },
      assistant: {
        name: "CleanAI — Aviso para Fabíola",
        voice: {
          provider: "11labs",
          voiceId: "rachel",
        },
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [{
            role: "system",
            content: `Você é uma assistente virtual da ${tenant.companyName}.
Você está ligando para Fabíola Medeiros, a proprietária da empresa, com um aviso importante.
Fale SOMENTE em português do Brasil. Seja clara, direta e profissional.
Diga a mensagem, pergunte se ela tem alguma dúvida, e encerre a ligação.
Se ela disser que entendeu ou que vai resolver, agradeça e desligue.`
          }],
          temperature: 0.5,
        },
        transcriber: {
          provider: "deepgram",
          language: "pt-BR",
        },
        firstMessage: message,
        endCallFunctionEnabled: true,
        endCallPhrases: ["obrigada", "entendido", "ok", "certo", "tchau", "até logo", "vou resolver"],
        maxDurationSeconds: 90,
        silenceTimeoutSeconds: 15,
      },
      metadata: {
        type: "owner_notification",
        reason,
        clientName: clientInfo.name,
      },
    };

    const res = await axios.post("https://api.vapi.ai/call/phone", payload, {
      headers: {
        Authorization: `Bearer ${vapiKey}`,
        "Content-Type": "application/json",
      },
    });

    log.info(`📞 Call to Fabíola initiated — Call ID: ${res.data.id}`);
    return res.data;
  } catch (err) {
    log.error("Call to Fabíola failed:", err.response?.data || err.message);
    return null;
  }
}

// ── WhatsApp via Twilio ───────────────────────────────────

async function sendWhatsAppToNumber(accountSid, authToken, from, toNumber, message) {
  const to = toNumber.startsWith("whatsapp:") ? toNumber : `whatsapp:${toNumber}`;
  const url  = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
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
    log.warn("⚠️  Twilio WhatsApp not configured — skipping");
    return null;
  }

  // Envia para Fabíola
  try {
    const res = await sendWhatsAppToNumber(accountSid, authToken, from, fabiolaNum, message);
    log.info(`📲 WhatsApp sent to Fabíola — SID: ${res.sid}`);
  } catch (err) {
    log.error("WhatsApp to Fabíola failed:", err.response?.data || err.message);
  }

  // Envia para Eugenio (se configurado)
  const eugenioNum = env("EUGENIO_WHATSAPP");
  if (eugenioNum) {
    try {
      const res = await sendWhatsAppToNumber(accountSid, authToken, from, eugenioNum, message);
      log.info(`📲 WhatsApp sent to Eugenio — SID: ${res.sid}`);
    } catch (err) {
      log.error("WhatsApp to Eugenio failed:", err.response?.data || err.message);
    }
  }

  return true;
}

// ── Mensagens em português por situação ──────────────────

function buildPortugueseMessage(reason, clientInfo, tenant) {
  const name    = clientInfo.name    || "um cliente";
  const address = clientInfo.address || "endereço não informado";
  const phone   = clientInfo.phone   || "não informado";
  const company = tenant.companyName || "sua empresa";

  const messages = {
    complaint:
      `Olá Fabíola! Aqui é o sistema da ${company}. ` +
      `Aviso urgente: o cliente ${name}, do endereço ${address}, ` +
      `ligou com uma reclamação e está aguardando seu retorno. ` +
      `Telefone do cliente: ${phone}. ` +
      `Por favor, entre em contato o mais breve possível.`,

    owner_request:
      `Olá Fabíola! Aqui é o sistema da ${company}. ` +
      `O cliente ${name} ligou e pediu para falar diretamente com você. ` +
      `Telefone: ${phone}. ` +
      `Por favor, retorne a ligação quando puder.`,

    new_booking:
      `Olá Fabíola! Ótima notícia da ${company}: ` +
      `novo agendamento confirmado! ` +
      `Cliente: ${name}. Endereço: ${address}. Telefone: ${phone}. ` +
      `Verifique os detalhes no painel.`,

    reschedule:
      `Olá Fabíola! Aviso da ${company}: ` +
      `o cliente ${name} do endereço ${address} quer remarcar o horário. ` +
      `Telefone: ${phone}. Por favor, confirme a nova data com ele.`,

    cancellation:
      `Olá Fabíola! Aviso da ${company}: ` +
      `o cliente ${name} do endereço ${address} cancelou o agendamento. ` +
      `Telefone: ${phone}, caso queira entrar em contato.`,

    out_of_area:
      `Olá Fabíola! Um cliente ligou para a ${company} ` +
      `pedindo serviço em uma área fora da cobertura. ` +
      `Nome: ${name}. Telefone: ${phone}. ` +
      `Você quer atender mesmo assim?`,

    general:
      `Olá Fabíola! Aviso da ${company}: ` +
      `o cliente ${name} precisa de atenção. ` +
      `Telefone: ${phone}.`,
  };

  return messages[reason] || messages.general;
}

// ── Formato da mensagem WhatsApp ─────────────────────────

function buildWhatsAppMessage(reason, clientInfo, tenant, extraInfo) {
  const name    = clientInfo.name    || "Cliente";
  const phone   = clientInfo.phone   || "não informado";
  const address = clientInfo.address || "ver painel";

  const icons = {
    complaint:    "⚠️",
    owner_request:"📞",
    new_booking:  "🎉",
    reschedule:   "📅",
    cancellation: "❌",
    out_of_area:  "📍",
    general:      "📋",
  };

  const titles = {
    complaint:    "RECLAMAÇÃO URGENTE",
    owner_request:"CLIENTE QUER FALAR COM VOCÊ",
    new_booking:  "NOVO BOOKING CONFIRMADO",
    reschedule:   "PEDIDO DE REMARCAÇÃO",
    cancellation: "CANCELAMENTO",
    out_of_area:  "ÁREA FORA DE COBERTURA",
    general:      "AVISO DO SISTEMA",
  };

  const icon  = icons[reason]  || "📋";
  const title = titles[reason] || "AVISO";

  let msg = `${icon} *${title}*\n`;
  msg += `*Empresa:* ${tenant.companyName}\n\n`;
  msg += `👤 *Cliente:* ${name}\n`;
  msg += `📱 *Telefone:* ${phone}\n`;
  msg += `📍 *Endereço:* ${address}\n`;
  if (extraInfo) msg += `\n${extraInfo}`;
  msg += `\n\n_Acesse o painel para ver detalhes._`;

  return msg;
}

module.exports = {
  notify,
  sendWhatsApp,
  callFabiola,
  buildPortugueseMessage,
  buildWhatsAppMessage,
};
