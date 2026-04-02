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
  // Sanitize name — filter out generic placeholders from Facebook/form defaults
  const GENERIC = ["lead", "lead facebook", "facebook lead", "unknown", "customer", "client", "undefined", "null", "n/a", "test"];
  const rawName = (lead.name || [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "").trim();
  const fullName = (rawName && !GENERIC.includes(rawName.toLowerCase())) ? rawName : "";
  const callName = fullName ? (fullName.split(/\s+/)[0] || "") : "there"; // first name or "there"
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
  // Use name if we have it; if not, open without name (sounds natural, not robotic)
  const greet = fullName ? "Hey " + callName + "!" : "Hey!";
  let opener = "";
  if (src.includes("facebook") || src.includes("fb") || src.includes("instagram")) {
    opener = greet + " This is " + tenant.aiName + " from " + tenant.companyName + ". You showed interest in our cleaning services through our ad — did I catch you at an okay time?";
  } else if (src.includes("google") || src.includes("gclid")) {
    opener = greet + " This is " + tenant.aiName + " from " + tenant.companyName + ". You searched for cleaning services online and filled out our form — did I catch you at an okay time?";
  } else if (src.includes("cold") || src.includes("prospect")) {
    opener = greet + " This is " + tenant.aiName + " from " + tenant.companyName + " — we are a local cleaning company in " + tenant.serviceAreas + ". I know this is unexpected, but it will be worth 60 seconds. Is now okay?";
  } else {
    opener = greet + " This is " + tenant.aiName + " from " + tenant.companyName + " — you just filled out a quote form on our site. Did I catch you at an okay time?";
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
    "   FIRST: ask what area they are in — \"Are you in Palm Bay, Melbourne, or another area?\"\n" +
    "   Standard time slots we offer: 8:00 AM · 10:40 AM · 1:20 PM\n" +
    "   For Deep Cleaning ONLY offer: 8:00 AM (needs a 4h30 window)\n" +
    "   Say: \"We have openings this week — would 8 in the morning, 10:40, or 1:20 in the afternoon work for you?\"\n" +
    "   → Day confirmed → \"And the time — 8am, 10:40, or 1:20pm?\"\n" +
    "   → Time confirmed → \"Perfect " + callName + ", I have you locked in for [day] at [time]. I am sending a confirmation email to you right now!\"\n" +
    "   NEVER ask IF they want to book — always assume yes and ask WHEN.\n\n" +

    "SCHEDULING RULES — READ BEFORE OFFERING ANY SLOT:\n" +
    "• 3 active cars. Each car has up to 3 standard slots per day: 8:00 AM, 10:40 AM, 1:20 PM.\n" +
    "• Regular cleaning: 2h40 minimum between slots (cleaning + travel time included).\n" +
    "• Deep cleaning: 4h30 window — ONLY offer 8:00 AM for deep cleans.\n" +
    "• Standard load per car: 3 regular cleanings. 4th only if the other 2 cars are full at 3 each.\n" +
    "• Per car maximum per day: 1 deep clean + 2 regular OR 3 regular (never 2 deep + 2 regular).\n" +
    "• Absolute max: 2 deep cleans per car per day, 4 regular per car per day.\n" +
    "• Priority location: always prefer clients in Palm Bay and closest cities first.\n" +
    "• Always ask the city/area so dispatch can assign the closest available car.\n\n" +

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
    "\"Perfect! So just to confirm — I have you down for [service] at [address] on [day] at [time]. I am sending a confirmation email to you right now, so watch your inbox! We are excited to take care of your home!\"\n" +
    "Then say exactly: BOOKING_CONFIRMED: [service], [day], [time], [address if known], [city]\n" +
    "Example: BOOKING_CONFIRMED: Regular Cleaning, Tuesday, 10:40am, 123 Oak St, Palm Bay\n" +
    "Example: BOOKING_CONFIRMED: Deep Cleaning, Wednesday, 8:00am, 45 Pine Ave, Melbourne\n" +
    "ALWAYS include the city — dispatch uses it to assign the correct car.\n" +
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

SERVICES & PRICING — use exact numbers, never ranges:
Standard by bedrooms: 1bd=$145 · 2bd=$165 · 3bd=$195 · 4bd=$235 · 5+bd=$275
Deep Clean (+70%): 1bd=$240 · 2bd=$280 · 3bd=$320 · 4bd=$380 · 5+bd=$440
Move-In/Out (+80%): 1bd=$280 · 2bd=$320 · 3bd=$360 · 4bd=$420 · 5+bd=$500
Airbnb/Vacation: studio=$120 · 2bd=$150 · 3+bd=$185
Recurring discounts: Bi-weekly −10% · Weekly −15%
We do NOT offer: landscaping, pest control, repairs, laundry

AREA COVERAGE & SCHEDULING:
Service areas: Melbourne FL, Palm Bay FL, Vero Beach FL, Sebastian FL, Fellsmere FL, Malabar FL, Indialantic FL, Satellite Beach FL.
Time slots: 8:00 AM · 10:40 AM · 1:20 PM (Deep Clean: 8:00 AM only — needs 4h30 window)
If outside service area → "That area is just outside our coverage, but let me check — sometimes we can make exceptions." Then: NOTIFICAR_FABIOLA

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
This is a sales call. Follow the exact outbound flow:

STEP 1 — HOME SIZE (if not known):
"How many bedrooms and bathrooms does your home have?"

STEP 2 — LIFESTYLE QUESTION (one only, pick the best fit):
  Option A: "Are you working a lot during the week?" ← reveals time scarcity
  Option B: "Do you have kids or pets at home?" ← reveals mess/chaos
  Option C: "When you get home after a long day, what does the place usually look like?" ← reveals pain
  Listen fully. Validate: "Yeah that is super common" or "I totally get that."

STEP 3 — QUOTE (use exact numbers, never ranges):
  Standard: 1bd=$145 · 2bd=$165 · 3bd=$195 · 4bd=$235 · 5+bd=$275
  Deep Clean (+70%): 1bd=$240 · 2bd=$280 · 3bd=$320 · 4bd=$380 · 5+bd=$440
  Move-In/Out (+80%): 1bd=$280 · 2bd=$320 · 3bd=$360 · 4bd=$420 · 5+bd=$500
  State the price directly: "For your [X]-bedroom home, [SERVICE] is $[PRICE] per visit."
  Daily anchor: "That's literally $[PRICE÷30]/day for a completely clean home."
  Push recurring: "Most of our clients do bi-weekly — you save 10% and never have to think about it."

STEP 4 — CLOSE (assume the sale, create real urgency):
  First ask: "Are you in Palm Bay, Melbourne, or another area?"
  Time slots: 8:00 AM · 10:40 AM · 1:20 PM (Deep Clean: 8:00 AM only — needs 4h30 window)
  Say: "We have openings this week — would 8 in the morning, 10:40, or 1:20 in the afternoon work for you?"
  → Day confirmed → "And the time — 8am, 10:40, or 1:20pm?"
  → Time confirmed → "Perfect! I have you locked in for [day] at [time]. I am sending a confirmation email to you right now!"
  NEVER ask IF they want to book — always assume yes and ask WHEN.

STEP 5 — OBJECTIONS:
  Too expensive:
    1st: "Break it down — it is $[daily]/day for a spotless home and your whole weekend back."
    2nd: "Let me see what I can do... $[price×0.92] — that is my best."
    3rd: "$[price×0.82] and I will make sure the team does an amazing job. Final offer."
  "Need to think": "What's the main thing — price or timing?" Address it. Then: "What if I lock you in tentatively? Zero commitment."
  "Already have someone": "Oh nice! On a scale of 1-10, how happy are you with them?"
    → 7 or below: "That's honestly the sweet spot where people start looking. What's the one thing you'd want done differently?"
    → 9-10: "That's great to hear. If anything ever changes, we'd love the chance to earn your business." [exit gracefully]
    → Any number: "What if we did a one-time deep clean just so you could compare? No commitment."
  After 3 objections with no movement: "No worries at all! I'll send our info over. If you ever want to chat again, just call us at (321) 392-7880. Have a great day!" [end call]

STEP 6 — BOOKING CONFIRMED:
  Do a verbal recap first: "So just to confirm — I have you down for [service] on [day] at [time]. I'm sending a confirmation email to you right now, so watch your inbox! We're excited to take care of your home!"
  Then say exactly: BOOKING_CONFIRMED: [service], [day], [time], [address if known], [city]
  Example: BOOKING_CONFIRMED: Regular Cleaning, Tuesday, 10:40am, 123 Oak St, Palm Bay
  ALWAYS include the city — dispatch uses it to assign the correct car.
  Then notify: "NOTIFICAR_FABIOLA: 🎉 NOVO CLIENTE — [nome] agendou [serviço] para [dia] às [hora]. Cidade: [cidade]. Endereço: [endereço]. Telefone: [telefone]."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SITUATION 4 — SERVICE QUESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Answer naturally — never read a list.
Use exact prices: "For a 3-bedroom home, standard cleaning is $195."
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
  // Sanitize name — same logic as buildSystemPrompt
  const GENERIC = ["lead", "lead facebook", "facebook lead", "unknown", "customer", "client", "undefined", "null", "n/a", "test"];
  const rawName = (lead.name || [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "").trim();
  const fullName = (rawName && !GENERIC.includes(rawName.toLowerCase())) ? rawName : "";
  const callName = fullName ? (fullName.split(/\s+/)[0] || "there") : "there";
  const greet = fullName ? `Hey ${callName}!` : "Hey!";

  const personalizedPrompt = buildSystemPrompt(tenant, { ...lead, name: fullName });

  const knownService = lead.serviceType && lead.serviceType !== "General Cleaning";
  const isFromAd = lead.source === "facebook_lead_ads" || lead.source === "batch_call" || lead.utmSource === "facebook" || lead.utmSource === "google" || lead.utmSource === "batch";
  const firstMessage = isFromAd
    ? `${greet} This is ${tenant.aiName} calling from ${tenant.companyName}. I saw you clicked on one of our ads and showed interest in our cleaning services — did I catch you at a good time?`
    : knownService
      ? `${greet} This is ${tenant.aiName} calling from ${tenant.companyName} — you just filled out a quote form on our site. Did I catch you at an okay time?`
      : `${greet} This is ${tenant.aiName} from ${tenant.companyName}. Is now a good time for a quick chat?`;

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
