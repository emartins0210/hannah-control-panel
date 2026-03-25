/**
 * ROUTE: TWILIO WHATSAPP INCOMING
 *
 * Recebe mensagens WhatsApp enviadas pela Fabíola ao número Twilio.
 * Classifica corretamente:
 *   - Relatos de casas limpas → RECEITA (faturamento do dia)
 *   - Relatos de lucro semanal → LUCRO
 *   - Despesas informadas      → DESPESA
 *   - Outros / dúvidas         → GERAL
 *
 * Twilio envia POST com campos:
 *   From    → whatsapp:+1XXXXXXXXXX
 *   To      → whatsapp:+1XXXXXXXXXX
 *   Body    → texto da mensagem
 *
 * Configurar no Twilio Console:
 *   WhatsApp Sandbox → Incoming Messages Webhook
 *   URL: https://<seu-dominio>/api/twilio/whatsapp
 *   Method: HTTP POST
 */

const express  = require("express");
const router   = express.Router();
const { log }  = require("../modules/guard");

// ── POST /api/twilio/whatsapp ─────────────────────────────

router.post("/", (req, res) => {
  const from = req.body.From || "";
  const body = req.body.Body || "";

  log.info(`\n📲 WhatsApp recebido de ${from}: "${body}"`);

  const msg    = body.trim();
  const result = classifyMessage(msg);

  log.info(`   → Tipo: ${result.type} | Valor: ${result.amount !== null ? "$" + result.amount : "N/A"}`);

  // Responde com TwiML (XML)
  const replyText = buildReply(result);
  res.set("Content-Type", "text/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(replyText)}</Message></Response>`);
});

// ── Classificador de mensagens ────────────────────────────

/**
 * Analisa o texto da mensagem e retorna:
 *   { type, amount, houses, description, rawText }
 *
 * Tipos:
 *   RECEITA_DIA   → relatório de casas limpas + valores recebidos no dia
 *   LUCRO_SEMANA  → relatório de lucro semanal/período
 *   DESPESA       → despesa / gasto informado explicitamente
 *   RECEITA_GERAL → receita avulsa sem detalhe de casas
 *   GERAL         → mensagem não classificada
 */
function classifyMessage(text) {
  const t = text.toLowerCase();

  // ── 1. Detectar DESPESA primeiro (keyword explícita) ──────
  const isExpense = /\b(despesa|gastei|paguei|custo|comprei|gasto|pagamento)\b/.test(t);

  // ── 2. Detectar relato de casas limpas (RECEITA_DIA) ──────
  const isDailyReport =
    /\b(limpamos|limpei|limpe[ei]|casas?\s+(limpas?|hoje|essa?\s+semana)|hoje\s+limp)/i.test(text) ||
    /\b(trabalhamos|fizemos\s+\d+\s+cas)/i.test(text);

  // ── 3. Detectar lucro de período (LUCRO_SEMANA) ───────────
  const isProfitReport =
    /\b(lucro|lucrei|ganhei|ganho\s+(l[ií]quido|da\s+semana|semanal)|semana\s+do\s+dia|do\s+dia\s+\d)/i.test(text) &&
    !isExpense;

  // ── 4. Detectar receita avulsa ────────────────────────────
  const isGeneralRevenue =
    /\b(recebi|receita|faturei|faturamos|ganhamos|rendeu|entrada)\b/.test(t) &&
    !isExpense;

  // ── Extrair todos os valores monetários ──────────────────
  // Padrão: $180, R$180, R$ 180, $1,200, $2800
  const moneyRegex = /(?:R\$\s?|\$)\s?(\d{1,3}(?:[.,]\d{3})*(?:\.\d{2})?|\d+)/gi;
  const amounts    = [];
  let match;
  while ((match = moneyRegex.exec(text)) !== null) {
    const raw = match[1].replace(/\./g, "").replace(",", ".");
    const val = parseFloat(raw);
    if (!isNaN(val) && val > 0) amounts.push(val);
  }

  // Número de casas (ex: "4 casas", "3 houses")
  const housesMatch = text.match(/(\d+)\s*(?:casas?|houses?)/i);
  const houses      = housesMatch ? parseInt(housesMatch[1]) : null;

  // Extrair período (ex: "semana do dia 15 ao dia 20")
  const periodMatch = text.match(/(?:semana\s+)?(?:do\s+dia\s+(\d+)(?:\s+ao?\s+(?:dia\s+)?(\d+))?)/i);
  const periodFrom  = periodMatch ? periodMatch[1] : null;
  const periodTo    = periodMatch ? periodMatch[2] : null;

  // Determinar tipo e valor principal
  let type   = "GERAL";
  let amount = null;

  if (isExpense) {
    type   = "DESPESA";
    // Para despesa, pegamos o MENOR valor se houver múltiplos (despesas tendem a ser menores)
    // Mas na verdade, devemos pegar o valor mais representativo
    amount = amounts.length > 0 ? amounts.reduce((sum, v) => sum + v, 0) : null;
  } else if (isDailyReport) {
    type   = "RECEITA_DIA";
    // Receita bruta = soma de todos os valores de casas
    // Mas há deduções (ex: "pagando $80 de help") — identificar "pagando", "menos", "deduzindo"
    const dedutionRegex = /(?:pagand[oa]|menos|deduzi[nr]|ajuda|help|assist|pagu[ei])\s*(?:R\$\s?|\$)?\s*(\d+)/gi;
    const deductions    = [];
    while ((match = dedutionRegex.exec(text)) !== null) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val > 0) deductions.push(val);
    }
    const grossRevenue  = amounts.reduce((sum, v) => sum + v, 0);
    const totalDeductions = deductions.reduce((sum, v) => sum + v, 0);
    amount = grossRevenue > 0 ? grossRevenue - totalDeductions : null;
  } else if (isProfitReport) {
    type   = "LUCRO_SEMANA";
    // Para lucro semanal, pegar o MAIOR valor (evitar pegar datas como valores)
    // Filtrar valores que parecem datas (< 31)
    const realAmounts = amounts.filter(v => v > 50);
    amount = realAmounts.length > 0 ? Math.max(...realAmounts) : (amounts.length > 0 ? Math.max(...amounts) : null);
  } else if (isGeneralRevenue) {
    type   = "RECEITA_GERAL";
    amount = amounts.length > 0 ? Math.max(...amounts.filter(v => v > 50)) || Math.max(...amounts) : null;
  }

  return {
    type,
    amount,
    houses,
    periodFrom,
    periodTo,
    amounts,
    rawText: text,
  };
}

// ── Construir resposta em português ──────────────────────

function buildReply(result) {
  const { type, amount, houses, periodFrom, periodTo } = result;
  const timestamp = new Date().toLocaleString("pt-BR", {
    timeZone: "America/New_York",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  switch (type) {

    case "RECEITA_DIA": {
      const housesInfo = houses ? `${houses} casa${houses > 1 ? "s" : ""}` : "casas";
      const valorInfo  = amount !== null
        ? `💰 *Receita líquida registrada: $${amount.toFixed(2)}*`
        : "⚠️ Valor não identificado — confirme manualmente.";
      return (
        `✅ *Relatório do Dia Registrado!*\n\n` +
        `🏠 Serviço: ${housesInfo} limpas\n` +
        `${valorInfo}\n` +
        `🕐 ${timestamp}\n\n` +
        `_Continue o ótimo trabalho! 💪_`
      );
    }

    case "LUCRO_SEMANA": {
      const periodo = periodFrom && periodTo
        ? `dias ${periodFrom}–${periodTo}`
        : periodFrom
        ? `a partir do dia ${periodFrom}`
        : "semana";
      const valorInfo = amount !== null
        ? `💰 *Lucro registrado: $${amount.toFixed(2)}*`
        : "⚠️ Valor não identificado — confirme manualmente.";
      return (
        `📊 *Relatório Semanal Registrado!*\n\n` +
        `📅 Período: ${periodo}\n` +
        `${valorInfo}\n` +
        `🕐 ${timestamp}\n\n` +
        `_Ótima semana! Continue assim! 🌟_`
      );
    }

    case "DESPESA": {
      const valorInfo = amount !== null
        ? `💸 *Despesa registrada: $${amount.toFixed(2)}*`
        : "⚠️ Valor não identificado — confirme manualmente.";
      return (
        `📝 *Despesa Registrada!*\n\n` +
        `${valorInfo}\n` +
        `🕐 ${timestamp}\n\n` +
        `_Registramos sua despesa com sucesso._`
      );
    }

    case "RECEITA_GERAL": {
      const valorInfo = amount !== null
        ? `💰 *Receita registrada: $${amount.toFixed(2)}*`
        : "⚠️ Valor não identificado — confirme manualmente.";
      return (
        `✅ *Receita Registrada!*\n\n` +
        `${valorInfo}\n` +
        `🕐 ${timestamp}\n\n` +
        `_Ótimo trabalho! 🎉_`
      );
    }

    default:
      return (
        `👋 Olá Fabíola!\n\n` +
        `Recebi sua mensagem, mas não consegui classificar automaticamente.\n\n` +
        `Para registrar corretamente, envie em um desses formatos:\n` +
        `• *Receita do dia:* "Hoje limpamos 3 casas, $150 + $200"\n` +
        `• *Lucro semanal:* "Lucro da semana $1.500"\n` +
        `• *Despesa:* "Despesa de $80 com produtos"\n\n` +
        `_Ou acesse o painel para registrar manualmente._`
      );
  }
}

// ── Escape XML para TwiML ─────────────────────────────────

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

module.exports = router;
