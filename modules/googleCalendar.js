/**
 * MODULE: GOOGLE CALENDAR
 * Cria eventos quando booking é confirmado.
 *
 * Variáveis no Railway:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_PRIVATE_KEY  (com \\n)
 *   GOOGLE_CALENDAR_ID
 */

const axios = require("axios");
const { createSign } = require("crypto");
const { log, env, safe } = require("./guard");

function b64(s) {
  return Buffer.from(s).toString("base64")
    .replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");
}

async function getToken() {
  const email = env("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const key   = (env("GOOGLE_PRIVATE_KEY") || "").replace(/\\n/g,"\n");
  if (!email || !key) throw new Error("Google credentials not configured in Railway Variables");
  const now = Math.floor(Date.now()/1000);
  const h   = b64(JSON.stringify({alg:"RS256",typ:"JWT"}));
  const p   = b64(JSON.stringify({
    iss:email, scope:"https://www.googleapis.com/auth/calendar",
    aud:"https://oauth2.googleapis.com/token", iat:now, exp:now+3600
  }));
  const sign = createSign("RSA-SHA256");
  sign.update(`${h}.${p}`);
  const sig = sign.sign(key,"base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");
  const r = await axios.post("https://oauth2.googleapis.com/token",
    new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:`${h}.${p}.${sig}`}).toString(),
    {headers:{"Content-Type":"application/x-www-form-urlencoded"}});
  return r.data.access_token;
}

async function createBookingEvent(lead, bookingDetails) {
  const calId = process.env.GOOGLE_CALENDAR_ID;
  if (!calId) { log.warn("⚠️ GOOGLE_CALENDAR_ID not set"); return null; }

  try {
    // Parse date/time from bookingDetails — e.g. "Standard Cleaning, Tuesday, 10am"
    const parts   = (bookingDetails || "").split(",").map(s => s.trim());
    const service = parts[0] || lead.serviceType || "Cleaning";
    const dayStr  = parts[1] || "TBD";
    const timeStr = parts[2] || "9:00 AM";

    // Build ISO date — default to next occurrence if we can't parse
    const startISO = buildISO(dayStr, timeStr) || new Date(Date.now() + 86400000).toISOString();
    const endISO   = new Date(new Date(startISO).getTime() + 3 * 3600000).toISOString();

    const token = await getToken();
    const event = {
      summary:     `🧹 ${service} — ${lead.name}`,
      description: `Client: ${lead.name}\nPhone: ${lead.phone}\nEmail: ${lead.email||""}\nAddress: ${lead.address||""}\nFrequency: ${lead.frequency||""}\nNotes: ${lead.notes||""}`,
      location:    lead.address || "",
      start:       { dateTime: startISO, timeZone: "America/New_York" },
      end:         { dateTime: endISO,   timeZone: "America/New_York" },
      reminders:   { useDefault: false, overrides: [
        { method: "email",  minutes: 1440 },
        { method: "popup",  minutes: 60   },
      ]},
    };

    const res = await axios.post(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`,
      event, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    log.info(`📅 Calendar event created: ${res.data.id}`);
    return res.data;
  } catch (err) {
    log.error("Calendar error:", err.response?.data || err.message);
    return null;
  }
}

function buildISO(dayStr, timeStr) {
  try {
    const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
    const d    = dayStr.toLowerCase().trim();
    const idx  = days.findIndex(x => d.includes(x));
    if (idx === -1) return null;
    const now  = new Date();
    let diff   = idx - now.getDay();
    if (diff <= 0) diff += 7;
    const date = new Date(now);
    date.setDate(date.getDate() + diff);

    // Parse time
    const t = timeStr.toLowerCase().replace(/\s/g,"");
    const ampm = t.includes("pm") ? "pm" : "am";
    const nums = t.replace(/[^0-9:]/g,"").split(":");
    let h = parseInt(nums[0]) || 9;
    const m = parseInt(nums[1]) || 0;
    if (ampm === "pm" && h !== 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
    date.setHours(h, m, 0, 0);
    return date.toISOString();
  } catch { return null; }
}

module.exports = { createBookingEvent };
