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
const { log }  = require("../modules/guard");

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

      // Parse scheduled date from bookingInfo
      // Format: "Service, Day, Time, Address (optional), City (optional)"
      const parts        = bookingInfo.split(",").map(s => s.trim());
      const scheduledISO = buildScheduledDate(parts[1], parts[2]);

      // Extract city (part[4]) and address (part[3]) if present
      const bookingAddress = parts[3] || null;
      const bookingCity    = parts[4] || null;

      // ── Scheduling intelligence: assign car based on city & workload ──
      const carAssignment = assignCar(bookingCity, parts[0], scheduledISO);
      log.info(`🚗 Car assigned: ${carAssignment.car} | City: ${bookingCity || "unknown"} | Service: ${parts[0]}`);

      // Update lead with booking details + scheduledDate + car assignment
      updateLeadByCallId(callId, {
        status:         "booked",
        outcome:        "booked",
        bookingDetails: bookingInfo,
        bookedAt:       new Date().toISOString(),
        scheduledDate:  scheduledISO || null,
        bookingAddress: bookingAddress,
        bookingCity:    bookingCity,
        assignedCar:    carAssignment.car,
        maidpadGroup:   carAssignment.group,
      });

      if (!lead) return;

      const updatedLead = { ...lead, scheduledDate: scheduledISO, bookingDetails: bookingInfo };

      const clientInfo = {
        name:    lead.name    || "Cliente",
        phone:   lead.phone   || "",
        address: lead.address || "",
      };

      // 1. Notify Fabíola (WhatsApp)
      const dateFormatted = scheduledISO
        ? new Date(scheduledISO).toLocaleDateString("en-US", {weekday:"long", month:"long", day:"numeric"})
        : parts[1] || "TBD";

      const whatsappMsg = buildWhatsAppMessage(
        "new_booking", clientInfo, tenant,
        `🧹 *Serviço:* ${parts[0]}\n` +
        `📅 *Data:* ${dateFormatted} às ${parts[2] || "TBD"}\n` +
        `📍 *Endereço:* ${bookingAddress || clientInfo.address || "Ver cadastro"}\n` +
        `🏙️ *Cidade:* ${bookingCity || "Não informada"}\n` +
        `🚗 *Carro:* ${carAssignment.car} (Grupo ${carAssignment.group} MaidPad)`
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

// ── Car assignment logic ──────────────────────────────────
// Rules:
//   - 3 active cars → MaidPad Groups 1, 2, 3
//   - Priority: assign to car with least workload that day
//   - Location priority: Palm Bay and closest cities
//   - Deep cleaning: max 2 per car per day
//   - Regular: max 4 per car per day (standard is 3)
//   - Time slots: 8:00 AM, 10:40 AM, 1:20 PM (2h40 gap)
//   - Deep clean gap: 4h30 → only 8:00 AM slot

const PALM_BAY_PRIORITY = [
  "palm bay", "west melbourne", "viera", "satellite beach",
  "rockledge", "malabar", "melbourne"
];

function assignCar(city, serviceType, scheduledISO) {
  const isDeep     = (serviceType || "").toLowerCase().includes("deep") ||
                     (serviceType || "").toLowerCase().includes("move");
  const cityNorm   = (city || "").toLowerCase().trim();
  const dateKey    = scheduledISO ? scheduledISO.substring(0, 10) : new Date().toISOString().substring(0, 10);

  // Load all leads for that day to count workload per car
  let allLeads = [];
  try {
    allLeads = leadDb.getAll ? leadDb.getAll() : [];
  } catch (e) { allLeads = []; }

  const dayLeads = allLeads.filter(l =>
    l.status === "booked" && l.scheduledDate && l.scheduledDate.startsWith(dateKey)
  );

  // Count jobs per car for that day
  const carCounts = { 1: 0, 2: 0, 3: 0 };
  const deepCounts = { 1: 0, 2: 0, 3: 0 };
  for (const l of dayLeads) {
    const car = l.assignedCar;
    if (car >= 1 && car <= 3) {
      carCounts[car]++;
      if ((l.bookingDetails || "").toLowerCase().includes("deep") ||
          (l.bookingDetails || "").toLowerCase().includes("move")) {
        deepCounts[car]++;
      }
    }
  }

  // Priority: city closest to Palm Bay → prefer car 1
  // (car 1 = Group 1, starts Palm Bay area; car 2 = central Melbourne; car 3 = northern)
  const palmBayIdx = PALM_BAY_PRIORITY.findIndex(area => cityNorm.includes(area));
  const cityPriority = palmBayIdx >= 0 ? Math.floor(palmBayIdx / 3) : 2; // 0=south, 1=central, 2=north

  // Preferred car order based on city proximity to Palm Bay
  const carOrder = cityPriority === 0 ? [1, 2, 3]
    : cityPriority === 1             ? [2, 1, 3]
    :                                  [3, 2, 1];

  // Find best car: least workload, not exceeding limits
  const maxRegular = 4;
  const maxDeep    = 2;

  for (const car of carOrder) {
    const count     = carCounts[car]  || 0;
    const deepCount = deepCounts[car] || 0;

    if (isDeep && deepCount >= maxDeep) continue;  // car full on deep cleans
    if (count >= maxRegular)            continue;  // car full

    log.info(`  → Car ${car} selected (${count} jobs today, ${deepCount} deep, city: ${cityNorm || "unknown"})`);
    return { car, group: car };
  }

  // All cars at limit — assign to least busy
  const leastBusy = Object.entries(carCounts).sort((a,b) => a[1] - b[1])[0][0];
  log.warn(`⚠️ All cars at capacity — assigning overflow to Car ${leastBusy}`);
  return { car: parseInt(leastBusy), group: parseInt(leastBusy) };
}

module.exports = router;
