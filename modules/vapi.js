/**
 * MODULE: VAPI.AI
 * - Outbound: liga para leads do formulário com SPIN Selling
 * - Inbound: atende ligações diretas com reconhecimento de cliente
 */

const axios = require("axios");
const { log, env, safe } = require("./guard");
const VAPI_BASE = "https://api.vapi.ai";

function headers() {
  return {
    Authorization: `Bearer ${env("VAPI_API_KEY")}`,
    "Content-Type": "application/json",
  };
}

// ── OUTBOUND PROMPT — SPIN Selling aprimorado ─────────────

function buildSystemPrompt(tenant, lead) {
  const fullName = lead.name || [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "there";
  const callName = fullName.trim().split(/\s+/)[0] || "there"; // first name only
  const beds     = parseInt(lead.bedrooms)  || 0;
  const baths    = parseInt(lead.bathrooms) || 0;
  const svc      = (lead.serviceType || "").toLowerCase();
  const src      = (lead.source || "").toLowerCase();

  // ── Price calculation ──────────────────────────────────
  let price = 0;
  if (svc.includes("deep")) {
    price = [0, 240, 280, 320, 380, 440][Math.min(beds, 5)] || 440;
  } else if (svc.includes("move") || svc.includes("out")) {
    price = [0, 280, 320, 360, 420, 500][Math.min(beds, 5)] || 500;
  } else if (svc.includes("airbnb") || svc.includes("vacation")) {
    price = beds <= 1 ? 120 : beds === 2 ? 150 : 185;
  } else {
    price = [0, 145, 165, 195, 235, 275][Math.min(beds, 5)] || (beds > 0 ? 275 : 0);
  }

  const freq = (lead.frequency || "").toLowerCase();
  let discountPct = 0, discountNote = "";
  if (freq.includes("week") && !freq.includes("bi")) { discountPct = 15; discountNote = "weekly (15% off)"; }
  else if (freq.includes("bi") || freq.includes("2")) { discountPct = 10; discountNote = "bi-weekly (10% off)"; }

  const discounted = discountPct > 0 ? Math.round(price * (1 - discountPct / 100)) : 0;
  const floor1     = Math.round(price * 0.92);
  const floor2     = Math.round(price * 0.82);
  const daily      = Math.round((discounted || price || 195) / 30);

  // ── Source-based opener ────────────────────────────────
  let opener = "";
  if (src.includes("facebook") || src.includes("fb") || src.includes("instagram")) {
    opener = "Hey " + callName + "! This is " + tenant.aiName + " from " + tenant.companyName + ". You saw our ad on Facebook and I am calling to help you out. Did I catch you at an okay time?";
  } else if (src.includes("google") || src.includes("gclid")) {
    opener = "Hey " + callName + "! This is " + tenant.aiName + " from " + tenant.companyName + ". You searched for cleaning services online and filled out our form. Did I catch you at an okay time?";
  } else if (src.includes("cold") || src.includes("prospect")) {
    opener = "Hey " + callName + "! This is " + tenant.aiName + " from " + tenant.companyName + " — we are a local cleaning company in " + tenant.serviceAreas + ". I know this is unexpected, but it will be worth 60 seconds. Is now okay?";
  } else {
    opener = "Hey " + callName + "! This is " + tenant.aiName + " from " + tenant.companyName + " — you just filled out a quote form on our site. Did I catch you at an okay time?";
  }

  const isColdCall = src.includes("cold") || src.includes("prospect");

  // ── Known data from form ───────────────────────────────
  const known = [];
  if (lead.serviceType) known.push("Service: " + lead.serviceType);
  if (beds)             known.push("Bedrooms: " + beds);
  if (baths)            known.push("Bathrooms: " + baths);
  if (lead.frequency)   known.push("Frequency: " + lead.frequency);
  if (lead.address)     known.push("Address: " + lead.address);
  if (lead.notes)       known.push("Notes: " + lead.notes);

  const knownBlock = known.length > 0 ? known.join("\n") : "Only name and phone — ask for home size naturally.";

  const pricingBlock = price > 0
    ? "Opening price: $" + price + (beds ? " (" + beds + "bd/" + (baths || "?") + "ba)" : "") + "\n" +
      (discounted > 0 ? "With " + discountNote + ": $" + discounted + "\n" : "") +
      "First concession: $" + floor1 + " (say: let me see what I can do)\n" +
      "Absolute floor: $" + floor2 + " — NEVER go below this\n" +
      "Daily anchor: $" + daily + "/day"
    : "Need home size first. Ask bedrooms and bathrooms.\nStandard: 1bd=$145, 2bd=$165, 3bd=$195, 4bd=$235, 5+bd=$275\nDeep clean: +70%. Move-out: +80%. Airbnb: $120-185.";

  const priceStatement = price > 0
    ? "For your " + beds + "bd/" + (baths || "?") + "ba home, we are looking at $" + price + " per visit." +
      (discounted > 0 ? " On " + discountNote + " it comes down to $" + discounted + "." : "")
    : "State specific price once you know their home size. Be direct.";

  return (
    "You are " + tenant.aiName + ", calling " + callName + " (full name: " + fullName + ") from " + tenant.companyName + " (" + tenant.serviceAreas + ").\n" +
    "In conversation always use first name only: " + callName + "\n\n" +

    "WHAT YOU KNOW FROM THE FORM — DO NOT ASK AGAIN:\n" +
    knownBlock + "\n\n" +

    "PRICING — use these exact numbers:\n" +
    pricingBlock + "\n\n" +

    "GREETING RULE — CRITICAL:\n" +
    "You know the name. Say it with confidence — NEVER as a question.\n" +
    "RIGHT: Hey " + callName + "! This is " + tenant.aiName + "...\n" +
    "WRONG: Is this " + fullName + "? / Am I speaking with " + fullName + "?\n" +
    "Use first name only — never full name in conversation.\n\n" +

    "SOURCE: " + (src || "website_form") + "\n" +
    "OPENER: " + opener + "\n" +
    (isColdCall
      ? "COLD CALL — they did not ask to be called. Be brief, earn the right to speak.\n" +
        "After opener: Value prop in one line. Then: How often do you currently get your place cleaned?\n\n"
      : "\n") +

    "YOUR STYLE:\n" +
    "- 1 sentence per response MAX — never monologue\n" +
    "- Natural speech: Yeah, Totally, Oh for sure, Right, Got it\n" +
    "- Confident — you know your prices and stand behind them\n" +
    "- NEVER say approximately, roughly, somewhere around, it depends\n" +
    "- ALWAYS give a specific dollar number when asked for price\n\n" +

    "CALL FLOW:\n" +
    "1. OPEN with opener above. If bad time: No worries — when is better?\n" +
    "2. LIFESTYLE QUESTION (one question only, pick the best fit):\n" +
    "   Option A: \"Are you working a lot during the week, " + callName + "?\"  ← reveals time scarcity\n" +
    "   Option B: \"Do you have kids or pets at home?\"  ← reveals mess/chaos\n" +
    "   Option C: \"When you get home after a long day, what does the place usually look like?\"  ← reveals pain\n" +
    "   Listen fully. Validate: \"Yeah that is super common\" or \"I totally get that\"\n" +
    "   " + (known.length > 0 ? "You know their home size — skip size questions, go straight to lifestyle." : "Ask bedrooms first, then lifestyle question.") + "\n" +
    "3. QUOTE: " + priceStatement + "\n" +
    "   Daily anchor: That is literally $" + daily + "/day for a totally clean home.\n" +
    "   Push recurring: \"Most of our clients go bi-weekly — you save 10% and never have to think about it.\"\n" +
    "4. CLOSE — assume the sale, create real urgency:\n" +
    "   \"We actually have a couple of openings left this week — Tuesday and Thursday. Which works better for you?\"\n" +
    "   → Day confirmed → \"Morning or afternoon?\"\n" +
    "   → Time confirmed → \"Perfect " + callName + ", I have you locked in for [day] at [time]. You will get a confirmation text shortly.\"\n" +
    "   NEVER ask IF they want to book — always assume yes and ask WHEN.\n\n" +

    "OBJECTIONS:\n" +
    "Too expensive:\n" +
    "  1st: Break it down — it is $" + daily + "/day for a spotless home and your whole weekend back.\n" +
    "  2nd: Let me see what I can do... $" + floor1 + " — that is my best.\n" +
    "  3rd: $" + floor2 + " and I will make sure the team does an amazing job. Final offer.\n\n" +

    "Need to think: What is the main thing — price or timing? Address it. Then: What if I lock you in tentatively? Zero commitment.\n\n" +

    "Already have someone:\n" +
    "  \"Oh nice! On a scale of 1-10, how happy are you with them?\"\n" +
    "  → 7 or below: \"That is honestly the sweet spot where people start looking. What is the one thing you would want done differently?\"\n" +
    "  → 9-10: \"That is great to hear. If anything ever changes, we would love the chance to earn your business.\" [exit gracefully]\n" +
    "  → Any number: \"What if we did a one-time deep clean just so you could compare? No commitment.\"\n\n" +

    "Send info by email: Of course — if it looks good, would you be ready to move forward? Yes: Let me grab a tentative slot too.\n\n" +

    "Talk to spouse: Makes sense. Want me to pencil you in for [day]? Easy to cancel.\n\n" +

    "After 3 objections with no movement:\n" +
    "  \"No worries at all " + callName + "! I will send our info over. And hey — if you ever want to chat again, just call us at " + (tenant.companyPhone || "(321) 392-7880") + ". Have a great day!\" [end call]\n\n" +

    "BOOKING CONFIRMED:\n" +
    "Before saying BOOKING_CONFIRMED, do a quick verbal recap:\n" +
    "\"Perfect! So just to confirm — I have you down for [service] at [address] on [day] at [time]. You will get a text confirmation in a few minutes. We are excited to take care of your home!\"\n" +
    "Then say exactly: BOOKING_CONFIRMED: [service], [day], [time], [address if known]\n" +
    "This triggers the confirmation system."

  );
}


function buildInboundPrompt(tenant, clientData) {
  const isKnown  = clientData && clientData.found;
  const client   = isKnown ? clientData.client : null;
  const lastBook = isKnown ? clientData.lastBooking : null;
  const visits   = isKnown ? clientData.totalVisits : 0;

  const callerContext = isKnown ? `
CALLER IDENTIFIED — existing client:
- Name: ${client.name}
- Phone: ${client.phone}
- Address: ${client.address || "on file"}
- Service: ${client.serviceType || "Standard Cleaning"}
- Home: ${client.bedrooms ? client.bedrooms + " bed" : "?"}${client.bathrooms ? " / " + client.bathrooms + " bath" : ""}
- Frequency: ${client.frequency || "not set"}
- Notes: ${client.notes || "none"}
- Total visits: ${visits} ${visits > 1 ? "— RECURRING CLIENT, treat with extra warmth" : ""}
${lastBook ? `- Last booking: ${lastBook.service} — ${lastBook.details || ""}` : ""}

You already know their name and address. Greet by name immediately.
DO NOT ask for name or address — you already have it.
` : `
NEW CALLER — unknown number.
Ask for their name naturally early in the conversation.
`;

  return `You are ${tenant.aiName}, the AI receptionist for ${tenant.companyName}, a professional housecleaning company in ${tenant.serviceAreas}.
${callerContext}
YOUR PERSONALITY:
- Warm, natural, conversational — best receptionist they've ever spoken to
- 1–2 sentences per response MAX
- Listen fully before responding
- If you know their name, use it (max twice total)

COMPANY INFO:
- Name: ${tenant.companyName}
- Owner: Fabíola Medeiros
- Service areas: ${tenant.serviceAreas}

SERVICES & PRICING:
- Standard Residential Cleaning: $120–$175/visit
- Deep Cleaning (first time or neglected home): $200–$350
- Move-In / Move-Out: $250–$400
- Airbnb / Vacation Rental Turnover: $90–$150
- Post-Construction: from $400
- We do NOT offer: landscaping, pest control, repairs, laundry
- Bi-weekly −10% · Weekly −15%

AREA COVERAGE & SCHEDULING INTELLIGENCE:
Service areas: Melbourne FL, Palm Bay FL, Vero Beach FL, Sebastian FL, Fellsmere FL, Malabar FL, Indialantic FL, Satellite Beach FL.
When scheduling, ask what city/area they're in. Suggest:
- Morning slots (8am–12pm) for clients further away
- Afternoon slots (1pm–5pm) for clients closer to Melbourne center
- If same-day or next-day → mention we may have openings but need to confirm with the team
- If outside service area → "That area is just a bit outside our current coverage, but let me check with Fabíola — sometimes we can make exceptions." Then: NOTIFICAR_FABIOLA

OPENING:
${isKnown
  ? `"Hey ${client.name}! This is ${tenant.aiName} from ${tenant.companyName}. How can I help you today?"`
  : `"Thank you for calling ${tenant.companyName}! This is ${tenant.aiName} — how can I help you today?"`
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SITUATION 1 — RESCHEDULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${isKnown
  ? `- You know their address: ${client.address || "on file"}. Confirm it before scheduling.`
  : `- Ask: "Of course! Can I get your name and the address on the booking?"`
}
- "What day works better for you?"
- "We have availability Tuesday or Thursday — which works?"
- "Morning or afternoon?"
- "Perfect! I've got you rescheduled for [day] at [time]. You'll get a confirmation shortly."
- Notify: "NOTIFICAR_FABIOLA: 📅 REMARCAÇÃO — ${isKnown ? client.name : "[nome]"} quer remarcar. Endereço: ${isKnown ? (client.address || "ver cadastro") : "[endereço]"}. Novo horário: [dia] às [hora]."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SITUATION 2 — CANCEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- "I'm sorry to hear that! Can I ask what happened?"
- Try to save: "Would rescheduling work instead? We're really flexible."
- If insisting: "I completely understand. I've noted the cancellation. We'd love to have you back anytime!"
- Notify: "NOTIFICAR_FABIOLA: ❌ CANCELAMENTO — ${isKnown ? client.name : "[nome]"} cancelou. Endereço: ${isKnown ? (client.address || "ver cadastro") : "[endereço]"}. Motivo: [motivo]."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SITUATION 3 — NEW CLIENT / QUOTE REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Treat as a sales call — use SPIN:
1. "How many bedrooms and bathrooms?"
2. "What city or area are you in?"
3. "What's the main reason you're looking for cleaning help?"
4. Price: "For a [X bed/Y bath] home, [SERVICE] runs about $[LOW]–$[HIGH]."
5. Close: "We have availability Tuesday or Thursday — which works better?"
6. On booking: "BOOKING_CONFIRMED: [service], [day], [time]"
7. Notify: "NOTIFICAR_FABIOLA: 🎉 NOVO CLIENTE — [nome] agendou [serviço] para [dia]. Endereço: [endereço]. Telefone: [telefone]. Cidade: [cidade]."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SITUATION 4 — SERVICE QUESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Answer naturally — never read a list.
"For a 3-bedroom home, standard cleaning usually runs $145–$175."
If they ask about a service we don't offer: "That's not something we currently do, but we're excellent at [relevant service]."
Always end with: "Would you like me to get you on the schedule?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SITUATION 5 — COMPLAINT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. "I'm so sorry to hear that. That's not the experience we want for you at all."
2. "Can you tell me a bit more about what happened?" — listen fully.
3. "I completely understand. I want to make sure this gets properly resolved."
4. NEVER promise free re-clean or compensation — only Fabíola decides that.
5. "I'm flagging this directly to Fabíola right now — she personally handles every concern and will reach out to you very soon."
6. Confirm contact: "Just to make sure — best number is [their number], right?"
7. Notify: "NOTIFICAR_FABIOLA: ⚠️ RECLAMAÇÃO URGENTE — ${isKnown ? client.name : "[nome]"} ligou sobre [problema]. Endereço: ${isKnown ? (client.address || "ver cadastro") : "[endereço]"}. Aguarda retorno URGENTE."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SITUATION 6 — WANTS TO SPEAK TO FABÍOLA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"Of course! Fabíola is unavailable right now but she'll call you back personally. What's it regarding?"
Notify: "NOTIFICAR_FABIOLA: 📞 ${isKnown ? client.name : "[nome]"} quer falar com você. Assunto: [assunto]. ${isKnown ? "" : "Número: [telefone]."} Retorne assim que possível."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOTIFICATION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"NOTIFICAR_FABIOLA: [message]" → triggers WhatsApp to Fabíola IN PORTUGUESE
Always include: name, address, situation, action needed.
Mark URGENTE for complaints and same-day issues.

FINAL RULES:
- 2 sentences per turn max
- English with customers, Portuguese in NOTIFICAR_FABIOLA
- Never promise what you cannot deliver
- If unsure: "Let me check and have Fabíola confirm with you shortly."`;
}

// ── Create outbound assistant ─────────────────────────────

async function createAssistant(tenant) {
  const payload = {
    name: `${tenant.companyName} — Outbound Sales AI`,
    voice: {
      provider: "11labs",
      voiceId: "21m00Tcm4TlvDq8ikWAM",
      stability: 0.4,
      similarityBoost: 0.8,
      optimizeStreamingLatency: 4,
    },
    model: {
      provider: "openai",
      model: "gpt-4o",
      messages: [{ role: "system", content: buildSystemPrompt(tenant, { name: "[CUSTOMER_NAME]", serviceType: "[SERVICE_TYPE]" }) }],
      temperature: 0.6,
    },
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en-US",
      smartFormat: true,
      endpointing: 200,
    },
    firstMessage: `Hey! This is ${tenant.aiName} calling from ${tenant.companyName} — you just filled out a quote form on our site. Did I catch you at an okay time?`,
    endCallFunctionEnabled: true,
    endCallPhrases: ["goodbye", "bye", "have a great day", "have a wonderful day", "talk soon"],
    maxDurationSeconds: 360,
    silenceTimeoutSeconds: 20,
    responseDelaySeconds: 0,
    llmRequestDelaySeconds: 0,
    numWordsToInterruptAssistant: 3,
    serverUrl: `${env("PUBLIC_URL")}/api/vapi/webhook/${tenant.id}`,
  };
  const res = await axios.post(`${VAPI_BASE}/assistant`, payload, { headers: headers() });
  return res.data;
}

// ── Create inbound assistant ──────────────────────────────

async function createInboundAssistant(tenant) {
  // The inbound prompt uses a generic base — client lookup happens
  // in vapiWebhook on call-started, then overrides the prompt dynamically.
  // For the base assistant we use a generic "unknown caller" context.
  const basePrompt = buildInboundPrompt(tenant, null);

  const payload = {
    name: `${tenant.companyName} — Inbound AI`,
    voice: { provider: "11labs", voiceId: "rachel" },
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: basePrompt }],
      temperature: 0.7,
    },
    transcriber: { provider: "deepgram", language: "en-US" },
    firstMessage: `Thank you for calling ${tenant.companyName}! This is ${tenant.aiName} — how can I help you today?`,
    endCallFunctionEnabled: true,
    endCallPhrases: ["goodbye", "bye", "have a great day", "thank you for calling", "talk to you later"],
    maxDurationSeconds: 600,
    silenceTimeoutSeconds: 30,
    serverUrl: `${env("PUBLIC_URL")}/api/vapi/webhook/${tenant.id}`,
  };
  const res = await axios.post(`${VAPI_BASE}/assistant`, payload, { headers: headers() });
  return res.data;
}

// ── Update inbound assistant with client data ─────────────
// Called when an inbound call starts and we identify the caller

async function updateInboundAssistant(assistantId, tenant, clientData) {
  if (!assistantId) return;
  const updatedPrompt = buildInboundPrompt(tenant, clientData);
  const isKnown = clientData && clientData.found;

  try {
    await axios.patch(`${VAPI_BASE}/assistant/${assistantId}`, {
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: updatedPrompt }],
        temperature: 0.7,
      },
      firstMessage: isKnown
        ? `Hey ${clientData.client.name.trim().split(" ")[0]}! This is ${tenant.aiName} from ${tenant.companyName}. How can I help you today?`
        : `Thank you for calling ${tenant.companyName}! This is ${tenant.aiName} — how can I help you today?`,
    }, { headers: headers() });
    log.info(`🔄 Inbound assistant updated with client data for ${isKnown ? clientData.client.name : 'unknown caller'}`);
  } catch (err) {
    log.warn("Could not update inbound assistant:", err.message);
  }
}

// ── Outbound call ─────────────────────────────────────────

async function makeCall(tenant, lead) {
  const fullName = lead.name ||
    [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "there";

  const personalizedPrompt = buildSystemPrompt(tenant, { ...lead, name: fullName });

  const knownService = lead.serviceType && lead.serviceType !== "General Cleaning";
  const firstMessage = knownService
    ? `Hey ${firstName(fullName)}! This is ${tenant.aiName} calling from ${tenant.companyName} — you just filled out a quote form on our site. Did I catch you at an okay time?`
    : `Hey ${firstName(fullName)}! This is ${tenant.aiName} from ${tenant.companyName}. Is now a good time for a quick chat?`;

  const payload = {
    phoneNumberId: tenant.vapiPhoneNumberId,
    customer: { number: formatPhone(lead.phone), name: fullName },
    assistantOverrides: {
      model: {
        provider: "openai",
        model: "gpt-4o",           // gpt-4o = faster + smarter than gpt-4o-mini
        messages: [{ role: "system", content: personalizedPrompt }],
        temperature: 0.6,
      },
      transcriber: {
        provider: "deepgram",
        model: "nova-2",           // fastest transcription model
        language: "en-US",
        smartFormat: true,
        endpointing: 200,          // ms — how fast it detects end of speech
      },
      voice: {
        provider: "11labs",
        voiceId: "21m00Tcm4TlvDq8ikWAM",  // Rachel — natural, fast
        stability: 0.4,
        similarityBoost: 0.8,
        optimizeStreamingLatency: 4,        // max latency optimization
      },
      firstMessage,
      maxDurationSeconds: 360,
      silenceTimeoutSeconds: 20,
      responseDelaySeconds: 0,     // no artificial delay
      llmRequestDelaySeconds: 0,   // fire LLM immediately
      numWordsToInterruptAssistant: 3, // client can interrupt after 3 words
    },
    metadata: {
      tenantId: tenant.id,
      leadId: lead.id,
      leadName: fullName,
      service: lead.serviceType,
    },
  };

  if (tenant.vapiAssistantId) {
    payload.assistantId = tenant.vapiAssistantId;
  } else {
    payload.assistant = {
      name: `${tenant.companyName} — Sales AI`,
      voice: { provider: "11labs", voiceId: "rachel" },
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: personalizedPrompt }],
        temperature: 0.7,
      },
      transcriber: { provider: "deepgram", language: "en-US" },
      firstMessage,
      endCallFunctionEnabled: true,
      endCallPhrases: ["goodbye", "bye", "have a great day", "have a wonderful day"],
      maxDurationSeconds: 300,
      silenceTimeoutSeconds: 30,
      serverUrl: `${env("PUBLIC_URL")}/api/vapi/webhook/${tenant.id}`,
    };
  }

  const res = await axios.post(`${VAPI_BASE}/call/phone`, payload, { headers: headers() });
  return res.data;
}

// ── Helpers ───────────────────────────────────────────────

async function getCall(callId) {
  try {
    const res = await axios.get(`${VAPI_BASE}/call/${callId}`, { headers: headers() });
    return res.data;
  } catch (err) {
    log.error("getCall failed:", err.message);
    return null;
  }
}

async function listCalls(limit = 20) {
  try {
    const res = await axios.get(`${VAPI_BASE}/call?limit=${limit}`, { headers: headers() });
    return res.data;
  } catch (err) {
    log.error("listCalls failed:", err.message);
    return [];
  }
}

async function linkAssistantToPhone(phoneNumberId, assistantId) {
  const res = await axios.patch(`${VAPI_BASE}/phone-number/${phoneNumberId}`, { assistantId }, { headers: headers() });
  return res.data;
}

async function createPhoneNumber(areaCode = "321") {
  const res = await axios.post(`${VAPI_BASE}/phone-number/buy`, {
    provider: "twilio", areaCode, name: "CleanAI Sales Line"
  }, { headers: headers() });
  return res.data;
}

function formatPhone(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

// ── Update assistant prompt only (no new assistant) ──────────
async function updateAssistantPrompt(assistantId, tenant) {
  try {
    await axios.patch(`${VAPI_BASE}/assistant/${assistantId}`, {
      model: {
        provider: "openai",
        model: "gpt-4o",
        messages: [{ role: "system", content: buildSystemPrompt(tenant, { name: "[CUSTOMER_NAME]", serviceType: "[SERVICE_TYPE]" }) }],
        temperature: 0.6,
      },
    }, { headers: headers() });
    log.info(`Updated outbound prompt for assistant ${assistantId}`);
  } catch (err) {
    log.error("updateAssistantPrompt failed:", err.message);
    throw err;
  }
}

async function updateInboundAssistantPrompt(assistantId, tenant) {
  try {
    await axios.patch(`${VAPI_BASE}/assistant/${assistantId}`, {
      model: {
        provider: "openai",
        model: "gpt-4o",
        messages: [{ role: "system", content: buildInboundPrompt(tenant, null) }],
        temperature: 0.6,
      },
      firstMessage: `Thank you for calling ${tenant.companyName}! This is ${tenant.aiName} — how can I help you today?`,
    }, { headers: headers() });
    log.info(`Updated inbound prompt for assistant ${assistantId}`);
  } catch (err) {
    log.error("updateInboundAssistantPrompt failed:", err.message);
    throw err;
  }
}

module.exports = {
  createAssistant,
  createInboundAssistant,
  updateInboundAssistant,
  updateAssistantPrompt,
  updateInboundAssistantPrompt,
  makeCall,
  getCall,
  listCalls,
  createPhoneNumber,
  linkAssistantToPhone,
  buildSystemPrompt,
  buildInboundPrompt,
};
