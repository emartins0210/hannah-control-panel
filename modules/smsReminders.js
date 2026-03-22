/**
 * MODULE: SMS REMINDERS
 * Envia SMS para clientes via Twilio.
 *
 * Variáveis no Railway:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_PHONE_NUMBER  → número SMS (ex: +13215550100)
 *
 * Mensagens enviadas:
 *   1. Confirmação imediata após booking
 *   2. Lembrete 24h antes
 *   3. Follow-up no dia seguinte (pedir review)
 */

const axios = require("axios");
const { log, env, safe, normalizePhone } = require("./guard");

async function sendSMS(to, message) {
  const sid    = env("TWILIO_ACCOUNT_SID");
  const token  = env("TWILIO_AUTH_TOKEN");
  const from   = env("TWILIO_PHONE_NUMBER");

  if (!sid || !token || !from) {
    log.warn("⚠️ Twilio SMS not configured — skipping");
    return null;
  }

  // Normalize phone to E.164
  const phone = normalizePhone(to);

  try {
    const url  = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const body = new URLSearchParams({ From: from, To: phone, Body: message });
    const res  = await axios.post(url, body.toString(), {
      auth: { username: sid, password: token },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    log.info(`📱 SMS sent to ${phone} — SID: ${res.data.sid}`);
    return res.data;
  } catch (err) {
    log.error("SMS error:", err.response?.data || err.message);
    return null;
  }
}

// ── 1. Confirmation SMS (immediate) ──────────────────────

async function sendConfirmation(lead, bookingDetails, companyName, companyPhone) {
  const parts   = (bookingDetails || "").split(",").map(s => s.trim());
  const service = parts[0] || "cleaning";
  const day     = parts[1] || "your scheduled day";
  const time    = parts[2] || "";

  const msg =
    `Hi ${lead.name}! ✅ Your ${service} with ${companyName} is confirmed` +
    ` for ${day}${time ? " at " + time : ""}.\n\n` +
    `📍 We'll be at: ${lead.address || "your address on file"}\n` +
    `Questions? Call us: ${companyPhone}\n\n` +
    `— ${companyName} 🧹`;

  return sendSMS(lead.phone, msg);
}

// ── 2. Reminder SMS (24h before) ─────────────────────────

async function sendReminder(lead, bookingDetails, companyName, companyPhone) {
  const parts   = (bookingDetails || "").split(",").map(s => s.trim());
  const service = parts[0] || "cleaning";
  const time    = parts[2] || "your scheduled time";

  const msg =
    `Hi ${lead.name}! 🧹 Just a reminder — your ${service} with ${companyName}` +
    ` is TOMORROW at ${time}.\n\n` +
    `📍 Address: ${lead.address || "on file"}\n` +
    `Need to reschedule? Call: ${companyPhone}\n\n` +
    `See you tomorrow! — ${companyName}`;

  return sendSMS(lead.phone, msg);
}

// ── 3. Follow-up SMS (day after) ─────────────────────────

async function sendFollowUp(lead, companyName, reviewLink) {
  const msg =
    `Hi ${lead.name}! Hope you're loving your clean home! 😊\n\n` +
    `We'd really appreciate a quick review — it helps us a lot:\n` +
    `${reviewLink || "https://g.page/r/review"}\n\n` +
    `Ready to book again? Reply BOOK or call us anytime!\n` +
    `— ${companyName} 🧹`;

  return sendSMS(lead.phone, msg);
}

// ── Schedule all reminders for a booking ─────────────────

function scheduleReminders(lead, bookingDetails, tenant) {
  const companyName  = tenant.companyName  || "Lopes Cleaning Services";
  const companyPhone = tenant.companyPhone || "(321) 392-7880";
  const reviewLink   = tenant.reviewLink   || "";

  // 1. Send confirmation immediately
  sendConfirmation(lead, bookingDetails, companyName, companyPhone)
    .then(() => log.info(`✅ Confirmation SMS sent to ${lead.name}`));

  // 2. Parse scheduled time to set reminder
  const scheduledDate = lead.scheduledDate ? new Date(lead.scheduledDate) : null;

  if (scheduledDate && !isNaN(scheduledDate)) {
    const reminderTime  = new Date(scheduledDate.getTime() - 24 * 3600000);
    const followUpTime  = new Date(scheduledDate.getTime() + 24 * 3600000);
    const now           = Date.now();

    // Reminder 24h before
    const reminderDelay = reminderTime.getTime() - now;
    if (reminderDelay > 0) {
      setTimeout(() => {
        sendReminder(lead, bookingDetails, companyName, companyPhone)
          .then(() => log.info(`⏰ Reminder SMS sent to ${lead.name}`));
      }, reminderDelay);
      log.info(`⏰ Reminder scheduled for ${reminderTime.toLocaleString()}`);
    }

    // Follow-up day after
    const followUpDelay = followUpTime.getTime() - now;
    if (followUpDelay > 0) {
      setTimeout(() => {
        sendFollowUp(lead, companyName, reviewLink)
          .then(() => log.info(`⭐ Follow-up SMS sent to ${lead.name}`));
      }, followUpDelay);
      log.info(`⭐ Follow-up scheduled for ${followUpTime.toLocaleString()}`);
    }
  } else {
    log.warn(`⚠️ No scheduledDate for ${lead.name} — only confirmation SMS sent`);
  }
}

module.exports = { sendSMS, sendConfirmation, sendReminder, sendFollowUp, scheduleReminders };
