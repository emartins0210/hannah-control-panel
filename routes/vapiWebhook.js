/**
 * ROUTE: VAPI WEBHOOK
 * Recebe eventos das ligações Vapi.
 * Detecta BOOKING_CONFIRMED e NOTIFICAR_FABIOLA na transcrição.
 * 
 * Ordem de notificação:
 * 1. Liga para Fabíola em português (via Vapi)
 * 2. Se não atender em 90s → WhatsApp via Twilio
 */

const express  = require("express");
const router   = express.Router();
const tenantDb = require("../modules/tenantDb");
const leadDb   = require("../modules/leadDb");
const { notify, buildWhatsAppMessage } = require("../modules/twilioNotify");

router.post("/:tenantId", (req, res) => {
  const { tenantId } = req.params;
  const event  = req.body;
  const tenant = tenantDb.getById(tenantId);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const type   = event.message?.type || event.type;
  const callId = event.message?.call?.id || event.call?.id;

  log.info(`\n🔔 Vapi [${tenant.companyName}]: ${type}`);

  switch (type) {
    case "call-started":
      updateLeadByCallId(callId, { callStatus: "in_progress" });
      // For inbound calls — lookup caller and personalize assistant
      handleCallStarted(tenant, callId, event);
      break;
    case "transcript":
      handleTranscript(tenant, callId, event);
      break;
    case "call-ended":
      handleCallEnded(tenant, callId, event);
      break;
    case "hang":
      updateLeadByCallId(callId, { callStatus: "hung_up" });
      break;
    default:
      log.info(`  (unhandled: ${type})`);
  }

  res.status(200).json({ received: true });
});

// ── Call started — identify inbound caller ────────────────

async function handleCallStarted(tenant, callId, event) {
  const callerPhone = event.message?.call?.customer?.number || event.call?.customer?.number;
  const isInbound   = (event.message?.call?.type || event.call?.type) === "inboundPhoneCall";
  if (!isInbound || !callerPhone || !tenant.vapiInboundAssistantId) return;

  log.info(`🔍 Inbound from ${callerPhone} — looking up client...`);
  try {
    const leadDb  = require("../modules/leadDb");
    const vapi    = require("../modules/vapi");
    const record  = leadDb.getByPhone(tenant.id, callerPhone);
    const history = leadDb.getHistoryByPhone(tenant.id, callerPhone);
    const booked  = history.filter(l => l.status === "booked" || l.outcome === "booked");

    const clientData = record ? {
      found: true,
      client: { name: record.name, phone: record.phone, email: record.email,
        address: record.address, serviceType: record.serviceType,
        frequency: record.frequency, bedrooms: record.bedrooms,
        bathrooms: record.bathrooms, notes: record.notes },
      lastBooking: booked[0] ? { service: booked[0].serviceType, details: booked[0].bookingDetails, date: booked[0].bookedAt } : null,
      totalVisits: booked.length,
      isRecurring: booked.length > 1,
    } : { found: false };

    await vapi.updateInboundAssistant(tenant.vapiInboundAssistantId, tenant, clientData);
    log.info(clientData.found ? `✅ Identified: ${clientData.client.name}` : "ℹ️ Unknown caller — new client");
  } catch (err) {
    log.warn("Client lookup error:", err.message);
  }
}

// ── Transcript ────────────────────────────────────────────

function handleTranscript(tenant, callId, event) {
  const transcript = event.message?.transcript || event.transcript || "";

  // Booking confirmado
  if (transcript.includes("BOOKING_CONFIRMED:")) {
    const match = transcript.match(/BOOKING_CONFIRMED:\s*(.+)/);
    if (match) {
      const bookingInfo = match[1].trim();
      log.info(`\n🎉 BOOKING CONFIRMED — ${bookingInfo}`);

      const lead = findLeadByCallId(callId);

      // Parse scheduled date from bookingInfo — "Service, Tuesday, 10am"
      const parts        = bookingInfo.split(",").map(s => s.trim());
      const scheduledISO = buildScheduledDate(parts[1], parts[2]);

      // Update lead with booking details + scheduledDate
      updateLeadByCallId(callId, {
        status:        "booked",
        outcome:       "booked",
        bookingDetails: bookingInfo,
        bookedAt:      new Date().toISOString(),
        scheduledDate: scheduledISO || null,
      });

      if (!lead) return;

      const updatedLead = { ...lead, scheduledDate: scheduledISO, bookingDetails: bookingInfo };

      const clientInfo = {
        name:    lead.name    || "Cliente",
        phone:   lead.phone   || "",
        address: lead.address || "",
      };

      // 1. Notify Fabíola (WhatsApp)
      const whatsappMsg = buildWhatsAppMessage(
        "new_booking", clientInfo, tenant,
        `🧹 *Serviço:* ${bookingInfo}${scheduledISO ? "\n📅 *Data:* " + new Date(scheduledISO).toLocaleDateString("en-US", {weekday:"long", month:"long", day:"numeric"}) : ""}`
      );
      notify(tenant, "new_booking", clientInfo, whatsappMsg);

      // 2. Create Google Calendar event
      const calendar = require("../modules/googleCalendar");
      calendar.createBookingEvent(updatedLead, bookingInfo)
        .then(ev => { if (ev) log.info(`📅 Calendar event created: ${ev.id}`); })
        .catch(err => log.warn("Calendar error:", err.message));

      // 3. Send SMS confirmation + schedule reminders
      const sms = require("../modules/smsReminders");
      sms.scheduleReminders(updatedLead, bookingInfo, tenant);
    }
  }

  // Notificação inbound
  if (transcript.includes("NOTIFICAR_FABIOLA:")) {
    const match = transcript.match(/NOTIFICAR_FABIOLA:\s*(.+)/);
    if (match) {
      const rawMsg = match[1].trim();
      log.info(`\n📲 NOTIFICAR_FABIOLA: ${rawMsg}`);

      const lead = findLeadByCallId(callId);
      const clientInfo = {
        name:    lead?.name    || "Cliente",
        phone:   lead?.phone   || "",
        address: lead?.address || "",
      };

      // Detecta o motivo para decidir urgência
      let reason = "general";
      if (rawMsg.includes("RECLAMAÇÃO") || rawMsg.includes("reclamação"))           reason = "complaint";
      else if (rawMsg.includes("quer falar com você") || rawMsg.includes("Fabíola")) reason = "owner_request";
      else if (rawMsg.includes("REMARCAÇÃO") || rawMsg.includes("remarcar"))         reason = "reschedule";
      else if (rawMsg.includes("cancelou") || rawMsg.includes("CANCELAMENTO"))       reason = "cancellation";
      else if (rawMsg.includes("fora da") || rawMsg.includes("cobertura"))           reason = "out_of_area";

      const whatsappMsg = buildWhatsAppMessage(reason, clientInfo, tenant, rawMsg);
      notify(tenant, reason, clientInfo, whatsappMsg);
    }
  }
}

// ── Call ended ────────────────────────────────────────────

function handleCallEnded(tenant, callId, event) {
  const duration  = event.message?.call?.duration || event.call?.duration || 0;
  const endReason = event.message?.call?.endedReason || event.call?.endedReason || "unknown";
  const summary   = event.message?.summary || event.summary || "";

  log.info(`📵 Call ended — ${duration}s — ${endReason}`);

  const lead = findLeadByCallId(callId);
  if (!lead) return;

  let outcome = lead.outcome;
  if (!outcome) {
    if (duration < 15)  outcome = "no_answer";
    else if (duration < 60) outcome = "not_interested";
    else outcome = "interested";
  }

  leadDb.update(lead.id, {
    callStatus:    "ended",
    callDuration:  duration,
    callEndReason: endReason,
    callSummary:   summary,
    outcome,
    status:   outcome === "booked" ? "booked" : "called",
    updatedAt: new Date().toISOString(),
  });

  log.info(`📊 ${lead.name} → ${outcome}`);
}

// ── Helpers ───────────────────────────────────────────────

function buildScheduledDate(dayStr, timeStr) {
  try {
    if (!dayStr) return null;
    const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
    const idx  = days.findIndex(x => dayStr.toLowerCase().includes(x));
    if (idx === -1) return null;
    const now  = new Date();
    let diff   = idx - now.getDay();
    if (diff <= 0) diff += 7;
    const date = new Date(now);
    date.setDate(date.getDate() + diff);
    if (timeStr) {
      const t    = timeStr.toLowerCase().replace(/\s/g,"");
      const ampm = t.includes("pm") ? "pm" : "am";
      const nums = t.replace(/[^0-9:]/g,"").split(":");
      let h      = parseInt(nums[0]) || 9;
      const m    = parseInt(nums[1]) || 0;
      if (ampm === "pm" && h !== 12) h += 12;
      if (ampm === "am" && h === 12) h = 0;
      date.setHours(h, m, 0, 0);
    }
    return date.toISOString();
  } catch { return null; }
}

function findLeadByCallId(callId) {
  if (!callId) return null;
  try {
    return leadDb.getAll ? leadDb.getAll().find(l => l.callId === callId) || null
      : require("../modules/guard").safeReadJSON("./config/leads.json", { leads: [] }).leads.find(l => l.callId === callId) || null;
  } catch { return null; }
}

function updateLeadByCallId(callId, fields) {
  if (!callId) return;
  const lead = findLeadByCallId(callId);
  if (lead) leadDb.update(lead.id, fields);
}

module.exports = router;
