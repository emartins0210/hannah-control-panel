/**
 * MODULE: BOOKING NOTIFICATIONS (Meta WhatsApp Cloud API)
 *
 * Envia notificações WhatsApp quando:
 * - Cliente confirma um agendamento
 * - Cliente é marcado como "closed/booked"
 *
 * Configuração no Railway:
 *   WHATSAPP_BUSINESS_TOKEN  → token Meta
 *   WHATSAPP_PHONE_ID        → ID do número Meta
 *   FABIOLA_WHATSAPP         → número da Fabíola
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
  const token      = env("WHATSAPP_BUSINESS_TOKEN");
  const phoneId    = env("WHATSAPP_PHONE_ID");
  const fabiolaNum = env("FABIOLA_WHATSAPP");

  if (!token || !phoneId || !fabiolaNum) {
    log.warn("⚠️  Meta WhatsApp não configurado — pulando");
    log.warn(`   Faltam: ${!token ? "WHATSAPP_BUSINESS_TOKEN " : ""}${!phoneId ? "WHATSAPP_PHONE_ID " : ""}${!fabiolaNum ? "FABIOLA_WHATSAPP " : ""}`);
    return false;
  }

  try {
    const message = buildBookingMessage(clientInfo, bookingInfo);
    const to = fabiolaNum.replace(/\D/g, "");
    const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

    log.info(`\n📱 Enviando notificação WhatsApp para Fabíola...`);

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

    log.info(`✅ Notificação enviada! ID: ${res.data.messages?.[0]?.id}`);
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
