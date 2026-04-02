/**
 * MODULE: EMAIL NOTIFICATIONS (Resend API)
 *
 * Sends booking confirmation emails via Resend.com.
 * Free plan: 3,000 emails/month, no expiry.
 *
 * Railway env vars required:
 *   RESEND_API_KEY   → API key from resend.com (re_xxxx...)
 *   EMAIL_FROM       → sender address (must be verified domain or resend.dev)
 *   EMAIL_FROM_NAME  → display name  (e.g. "Hannah | Lopes Cleaning")
 *   FABIOLA_EMAIL    → owner email for booking copy notifications
 *
 * Emails sent:
 *   1. Client confirmation (English) — immediately on BOOKING_CONFIRMED
 *   2. Owner notification (Portuguese) — copy to Fabíola
 */

const axios = require("axios");
const { log, env } = require("./guard");

const RESEND_API = "https://api.resend.com/emails";

async function sendEmail({ to, subject, html, text, from }) {
  const apiKey = env("RESEND_API_KEY");
  if (!apiKey) {
    log.warn("⚠️  RESEND_API_KEY not set — email skipped");
    return null;
  }

  const fromAddr = from || `${env("EMAIL_FROM_NAME") || "Hannah | Lopes Cleaning"} <${env("EMAIL_FROM") || "hannah@lopesservices.top"}>`;

  try {
    const res = await axios.post(
      RESEND_API,
      { from: fromAddr, to: Array.isArray(to) ? to : [to], subject, html, text },
      { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } }
    );
    log.info(`📧 Email sent → ${to} | ID: ${res.data.id}`);
    return res.data;
  } catch (err) {
    log.error(`📧 Email failed → ${to}: ${err.response?.data?.message || err.message}`);
    return null;
  }
}

// ── 1. Confirmation email to client (English) ─────────────
async function sendBookingConfirmation(lead, bookingDetails, tenant) {
  if (!lead.email) {
    log.warn(`⚠️  No email for lead ${lead.name} — skipping confirmation email`);
    return null;
  }

  const parts    = (bookingDetails || "").split(",").map(s => s.trim());
  const service  = parts[0] || "Cleaning Service";
  const day      = parts[1] || "your scheduled day";
  const time     = parts[2] || "";
  const address  = parts[3] || lead.address || "your address on file";
  const city     = parts[4] || lead.city || "";
  const company  = tenant.companyName  || "Lopes Cleaning Services";
  const phone    = tenant.companyPhone || "(321) 392-7880";
  const firstName = (lead.name || "there").split(" ")[0];
  const fullAddress = [address, city].filter(Boolean).join(", ");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#f4f7f6;font-family:Arial,sans-serif;color:#333}
  .wrap{max-width:580px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,.1)}
  .header{background:linear-gradient(135deg,#27ae60,#2ecc71);padding:35px 30px;text-align:center;color:#fff}
  .header h1{margin:0;font-size:28px;letter-spacing:-.5px}
  .header p{margin:8px 0 0;font-size:15px;opacity:.9}
  .body{padding:30px}
  .greeting{font-size:18px;font-weight:bold;color:#27ae60;margin-bottom:6px}
  .intro{font-size:15px;color:#555;margin-bottom:20px}
  .card{background:#f0fff4;border:1px solid #d4edda;border-radius:8px;padding:20px;margin-bottom:20px}
  .row{display:flex;padding:8px 0;border-bottom:1px solid #e8f5e9}
  .row:last-child{border-bottom:none}
  .lbl{font-weight:bold;color:#27ae60;min-width:90px;font-size:14px}
  .val{font-size:14px;color:#333}
  .note{font-size:14px;color:#555;line-height:1.6;margin-bottom:16px}
  .contact{background:#fafafa;border-radius:8px;padding:16px;text-align:center;font-size:14px;color:#666;margin-top:20px}
  .contact strong{color:#333;font-size:16px}
  .footer{background:#f4f4f4;padding:18px;text-align:center;font-size:12px;color:#999}
</style></head>
<body>
<div class="wrap">
  <div class="header">
    <h1>🧹 You're All Set!</h1>
    <p>Your cleaning appointment is confirmed</p>
  </div>
  <div class="body">
    <div class="greeting">Hi ${firstName}!</div>
    <div class="intro">Great news — your appointment with <strong>${company}</strong> is officially booked. Here are your details:</div>
    <div class="card">
      <div class="row"><span class="lbl">Service</span><span class="val">${service}</span></div>
      <div class="row"><span class="lbl">Date</span><span class="val">${day}</span></div>
      ${time ? `<div class="row"><span class="lbl">Time</span><span class="val">${time}</span></div>` : ""}
      <div class="row"><span class="lbl">Address</span><span class="val">${fullAddress}</span></div>
    </div>
    <p class="note">Our team will arrive at your home at the scheduled time. If you need to reschedule or have any questions, don't hesitate to reach out!</p>
    <div class="contact">
      <div>Questions? We're here to help.</div>
      <strong>📞 ${phone}</strong>
    </div>
  </div>
  <div class="footer">
    ${company} — Professional Cleaning Services in Florida<br>
    This email was sent because you scheduled a cleaning with us.
  </div>
</div>
</body></html>`;

  return sendEmail({
    to: lead.email,
    subject: `✅ Booking confirmed: ${service} — ${day}${time ? " at " + time : ""}`,
    html,
    text: `Hi ${firstName}! Your ${service} with ${company} is confirmed for ${day}${time ? " at " + time : ""}. Address: ${fullAddress}. Questions? Call ${phone}.`,
  });
}

// ── 2. Owner notification to Fabíola (Portuguese) ─────────
async function sendBookingNotificationToOwner(lead, bookingDetails, tenant) {
  const ownerEmail = env("FABIOLA_EMAIL");
  if (!ownerEmail) {
    log.warn("⚠️  FABIOLA_EMAIL not set — owner notification skipped");
    return null;
  }

  const parts    = (bookingDetails || "").split(",").map(s => s.trim());
  const service  = parts[0] || "Limpeza";
  const day      = parts[1] || "a confirmar";
  const time     = parts[2] || "";
  const address  = parts[3] || lead.address || "ver painel";
  const city     = parts[4] || lead.city || "";
  const car      = lead.assignedCar ? `Carro ${lead.assignedCar}` : "a definir";
  const company  = tenant.companyName || "Lopes Cleaning Services";

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body{margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif}
  .wrap{max-width:560px;margin:20px auto;background:#fff;border-radius:10px;padding:30px;box-shadow:0 2px 8px rgba(0,0,0,.1)}
  h2{color:#27ae60;margin-top:0}
  table{width:100%;border-collapse:collapse;margin:16px 0}
  td{padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px}
  td:first-child{font-weight:bold;color:#555;width:130px}
  .badge{display:inline-block;background:#27ae60;color:#fff;padding:5px 14px;border-radius:20px;font-size:13px;font-weight:bold}
  .footer{font-size:12px;color:#aaa;margin-top:20px}
</style></head>
<body>
<div class="wrap">
  <h2>🎉 Novo Booking Confirmado!</h2>
  <p style="color:#555;font-size:14px">A Hannah acabou de fechar um cliente. Detalhes abaixo:</p>
  <table>
    <tr><td>Cliente</td><td><strong>${lead.name || "—"}</strong></td></tr>
    <tr><td>Telefone</td><td>${lead.phone || "—"}</td></tr>
    <tr><td>Email</td><td>${lead.email || "—"}</td></tr>
    <tr><td>Serviço</td><td>${service}</td></tr>
    <tr><td>Data / Hora</td><td>${day}${time ? " às " + time : ""}</td></tr>
    <tr><td>Endereço</td><td>${address}${city ? ", " + city : ""}</td></tr>
    <tr><td>Carro</td><td>${car}</td></tr>
    <tr><td>Origem</td><td>${lead.source || "—"}</td></tr>
  </table>
  <span class="badge">BOOKING CONFIRMADO ✓</span>
  <p class="footer">Acesse o painel para gerenciar este agendamento.</p>
</div>
</body></html>`;

  return sendEmail({
    to: ownerEmail,
    subject: `🎉 Novo booking: ${lead.name} — ${service} (${day}${time ? " " + time : ""})`,
    html,
  });
}

// ── Dispatch both emails ───────────────────────────────────
async function sendBookingEmails(lead, bookingDetails, tenant) {
  await Promise.allSettled([
    sendBookingConfirmation(lead, bookingDetails, tenant),
    sendBookingNotificationToOwner(lead, bookingDetails, tenant),
  ]);
}

module.exports = {
  sendBookingEmails,
  sendBookingConfirmation,
  sendBookingNotificationToOwner,
};
