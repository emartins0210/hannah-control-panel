/**
 * MODULE: WHATSAPP NOTIFICATIONS (Meta Cloud API)
 *
 * Ordem de contato com a Fabíola:
 * 1. SEMPRE tenta ligar primeiro (via Vapi em português)
 * 2. Se não atender ou em casos não urgentes → WhatsApp
 *
 * Variáveis no Railway:
 *   WHATSAPP_BUSINESS_TOKEN  → token de acesso permanente do Meta
 *   WHATSAPP_PHONE_ID        → ID do número no Meta Business Manager
 *   FABIOLA_WHATSAPP         → +1XXXXXXXXXX (para WhatsApp)
 *   FABIOLA_PHONE            → +1XXXXXXXXXX (para ligar)
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

// ── WhatsApp via Meta Cloud API ───────────────────────────

async function sendWhatsAppToNumber(token, phoneId, toNumber, message) {
  // Meta API expects E.164 digits only (no + or spaces)
  const to = toNumber.replace(/\D/g, "");
  const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

  const res = await axios.post(url, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: message },
  }, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return res.data;
}

async function sendWhatsApp(message) {
  const token      = env("WHATSAPP_BUSINESS_TOKEN");
  const phoneId    = env("WHATSAPP_PHONE_ID");
  const fabiolaNum = env("FABIOLA_WHATSAPP");

  if (!token || !phoneId || !fabiolaNum) {
    log.warn("⚠️  Meta WhatsApp not configured — skipping");
    return null;
  }

  // Envia para Fabíola
  try {
    const res = await sendWhatsAppToNumber(token, phoneId, fabiolaNum, message);
    log.info(`📲 WhatsApp sent to Fabíola — ID: ${res.messages?.[0]?.id}`);
  } catch (err) {
    log.error("WhatsApp to Fabíola failed:", err.response?.data || err.message);
  }

  // Envia para Eugenio (se configurado)
  const eugenioNum = env("EUGENIO_WHATSAPP");
  if (eugenioNum) {
    try {
      const res = await sendWhatsAppToNumber(token, phoneId, eugenioNum, message);
      log.info(`📲 WhatsApp sent to Eugenio — ID: ${res.messages?.[0]?.id}`);
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
