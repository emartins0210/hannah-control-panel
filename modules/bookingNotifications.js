/**
 * MODULE: BOOKING NOTIFICATIONS
 * 
 * Envia notificações WhatsApp quando:
 * - Cliente confirma um agendamento
 * - Cliente é marcado como "closed/booked"
 * 
 * Configuração no .env:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_NUMBER   → whatsapp:+14155238886 (sandbox)
 *   HANNAH_WHATSAPP_NOTIFY   → +5519994294406 (seu número)
 */

const axios = require("axios");
const { log, env, normalizePhone } = require("./guard");

/**
 * Envia notificação WhatsApp quando um cliente é fechado/booked
 * 
 * @param {Object} clientInfo - Informações do cliente
 *   {
 *     id: string,
 *     nome: string,
 *     telefone: string,
 *     endereco: string,
 *     cidade: string,
 *     estado: string,
 *     email: string,
 *     valor: number (preço do serviço),
 *     frequencia: string (semanal, quinzenal, mensal)
 *   }
 * @param {Object} bookingInfo - Informações do agendamento
 *   {
 *     data: string (YYYY-MM-DD),
 *     horario: string (HH:MM),
 *     equipeId: string,
 *     status: string (pending, scheduled, completed, cancelled)
 *   }
 * @returns {Promise<boolean>} - true se enviado com sucesso
 */
async function sendBookingNotification(clientInfo, bookingInfo = {}) {
  const accountSid = env("TWILIO_ACCOUNT_SID");
  const authToken  = env("TWILIO_AUTH_TOKEN");
  const from       = env("TWILIO_WHATSAPP_NUMBER");
  const yourNumber = env("HANNAH_WHATSAPP_NOTIFY");

  // Se não estiver configurado, apenas loga aviso
  if (!accountSid || !authToken || !from || !yourNumber) {
    log.warn("⚠️  Notificação WhatsApp não configurada — pulando");
    log.warn(`   Faltam: ${!accountSid ? "TWILIO_ACCOUNT_SID " : ""}${!authToken ? "TWILIO_AUTH_TOKEN " : ""}${!from ? "TWILIO_WHATSAPP_NUMBER " : ""}${!yourNumber ? "HANNAH_WHATSAPP_NOTIFY " : ""}`);
    return false;
  }

  try {
    const message = buildBookingMessage(clientInfo, bookingInfo);
    const to = yourNumber.startsWith("whatsapp:") ? yourNumber : `whatsapp:${yourNumber}`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({ 
      From: from, 
      To: to, 
      Body: message 
    });

    log.info(`\n📱 Enviando notificação WhatsApp para ${yourNumber}...`);

    const res = await axios.post(url, body.toString(), {
      auth: { username: accountSid, password: authToken },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    log.info(`✅ Notificação enviada! SID: ${res.data.sid}`);
    return true;

  } catch (err) {
    log.error("❌ Falha ao enviar WhatsApp:", err.response?.data || err.message);
    return false;
  }
}

/**
 * Constrói a mensagem WhatsApp formatada com dados do cliente
 */
function buildBookingMessage(clientInfo, bookingInfo) {
  const name    = clientInfo.nome || clientInfo.name || "Cliente";
  const phone   = clientInfo.telefone || clientInfo.phone || "não informado";
  const address = clientInfo.endereco || clientInfo.address || "ver painel";
  const city    = clientInfo.cidade || clientInfo.city || "";
  const state   = clientInfo.estado || clientInfo.state || "";
  const valor   = clientInfo.valor || "consultar";
  const freq    = clientInfo.frequencia || "consultar";
  
  const data    = bookingInfo.data || "";
  const hora    = bookingInfo.horario || bookingInfo.hora || "";
  const equipe  = bookingInfo.equipeId || "";
  const status  = bookingInfo.status || "confirmado";

  // Formatar endereço completo
  let enderecoCompleto = address;
  if (city) enderecoCompleto += `, ${city}`;
  if (state) enderecoCompleto += ` - ${state}`;

  // Formatar data/hora se disponível
  let agendamentoInfo = "";
  if (data && hora) {
    const dataFormatada = new Date(`${data}T${hora}`).toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    agendamentoInfo = `📅 *Data/Hora:* ${dataFormatada}`;
  }

  // Ícones por status
  const statusIcons = {
    pending: "⏳",
    scheduled: "✅",
    completed: "✔️",
    cancelled: "❌",
    booked: "🎉",
    closed: "🎉",
  };
  const icon = statusIcons[status] || "📋";

  // Construir mensagem
  let msg = `${icon} *NOVO CLIENTE FECHADO*\n`;
  msg += `${"=".repeat(40)}\n\n`;
  msg += `👤 *Nome:* ${name}\n`;
  msg += `📱 *Telefone:* ${phone}\n`;
  msg += `📍 *Endereço:* ${enderecoCompleto}\n`;
  msg += `💰 *Valor:* R$ ${typeof valor === "number" ? valor.toFixed(2) : valor}\n`;
  msg += `📆 *Frequência:* ${freq}\n`;
  msg += `📧 *Email:* ${clientInfo.email || "não informado"}\n`;
  
  if (agendamentoInfo) {
    msg += `\n${agendamentoInfo}\n`;
  }
  
  if (equipe) {
    msg += `\n👥 *Equipe Responsável:* ${equipe}\n`;
  }

  msg += `\n*Status:* ${status.toUpperCase()}\n`;
  msg += `🕐 *Registrado:* ${new Date().toLocaleString("pt-BR")}\n`;
  msg += `\n_Acesse o painel para mais detalhes._`;

  return msg;
}

/**
 * Envia notificação quando um agendamento é criado
 */
async function notifyOnBookingCreated(clientId, clientInfo, bookingData) {
  log.info(`\n🔔 Notificando novo agendamento do cliente: ${clientInfo.nome}`);
  
  return await sendBookingNotification(clientInfo, {
    data: bookingData.data,
    horario: bookingData.hora || bookingData.horario,
    equipeId: clientInfo.equipe,
    status: "scheduled"
  });
}

/**
 * Envia notificação quando um cliente é marcado como fechado
 */
async function notifyOnClientClosed(clientInfo, closingData = {}) {
  log.info(`\n🎉 Notificando fechamento do cliente: ${clientInfo.nome}`);
  
  return await sendBookingNotification(clientInfo, {
    data: closingData.dataPrimeiroBooling || closingData.data || "",
    horario: closingData.horario || "",
    equipeId: clientInfo.equipe,
    status: "closed"
  });
}

/**
 * Envia notificação quando status muda para "booked"
 */
async function notifyOnStatusChange(clientInfo, newStatus, previousStatus) {
  if (newStatus === "booked" || newStatus === "closed") {
    log.info(`\n🎯 Status mudou de "${previousStatus}" para "${newStatus}" — notificando...`);
    
    return await sendBookingNotification(clientInfo, {
      status: newStatus
    });
  }
  
  return false;
}

module.exports = {
  sendBookingNotification,
  buildBookingMessage,
  notifyOnBookingCreated,
  notifyOnClientClosed,
  notifyOnStatusChange,
};
