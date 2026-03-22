/**
 * MODULE: GUARD — Sistema de Proteção
 * 
 * Centraliza todas as proteções do sistema:
 * - Validação de variáveis de ambiente
 * - Safe wrappers para operações críticas
 * - Logger padronizado
 * - Proteção contra crashes
 */

// ── Logger ────────────────────────────────────────────────

const log = {
  info:  (...a) => console.log(`[INFO]  ${new Date().toISOString()}`, ...a),
  warn:  (...a) => console.warn(`[WARN]  ${new Date().toISOString()}`, ...a),
  error: (...a) => console.error(`[ERROR] ${new Date().toISOString()}`, ...a),
  ok:    (...a) => console.log(`[OK]    ${new Date().toISOString()}`, ...a),
};

// ── Env var reader with fallback ──────────────────────────

function env(key, fallback = "") {
  const val = process.env[key];
  if (!val && fallback === "__REQUIRED__") {
    log.error(`Missing required env var: ${key}`);
  }
  return val || fallback;
}

function envRequired(key) {
  return env(key, "__REQUIRED__");
}

// ── Safe async wrapper ────────────────────────────────────
// Wraps any async function — never crashes the process

async function safe(label, fn, fallback = null) {
  try {
    return await fn();
  } catch (err) {
    log.error(`[${label}] ${err.message}`);
    if (err.response?.data) log.error(`[${label}] API response:`, JSON.stringify(err.response.data));
    return fallback;
  }
}

// ── Safe JSON parse ───────────────────────────────────────

function safeJSON(str, fallback = {}) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// ── Safe file read ────────────────────────────────────────

function safeReadJSON(filepath, fallback = {}) {
  try {
    const fs = require("fs");
    if (!fs.existsSync(filepath)) return fallback;
    return JSON.parse(fs.readFileSync(filepath, "utf8"));
  } catch (err) {
    log.warn(`Could not read ${filepath}: ${err.message}`);
    return fallback;
  }
}

// ── Safe file write ───────────────────────────────────────

function safeWriteJSON(filepath, data) {
  try {
    const fs   = require("fs");
    const path = require("path");
    const dir  = path.dirname(filepath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    log.error(`Could not write ${filepath}: ${err.message}`);
    return false;
  }
}

// ── String sanitizer ──────────────────────────────────────
// Prevents apostrophes and special chars from breaking strings

function sanitize(str) {
  if (!str) return "";
  return String(str)
    .replace(/[\u2018\u2019]/g, "'")   // smart quotes → straight
    .replace(/[\u201C\u201D]/g, '"')   // smart double quotes
    .trim();
}

// ── Phone normalizer ──────────────────────────────────────

function normalizePhone(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

// ── Env vars validator ────────────────────────────────────

function validateEnv() {
  const required = ["VAPI_API_KEY", "ADMIN_SECRET", "PUBLIC_URL"];
  const optional = [
    "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN",
    "TWILIO_PHONE_NUMBER", "TWILIO_WHATSAPP_NUMBER",
    "FABIOLA_WHATSAPP", "FABIOLA_PHONE",
    "GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_PRIVATE_KEY", "GOOGLE_CALENDAR_ID",
    "VAPI_PHONE_NUMBER_ID",
  ];

  const missing  = required.filter(k => !process.env[k]);
  const uncfg    = optional.filter(k => !process.env[k]);

  if (missing.length > 0) {
    log.error("MISSING REQUIRED ENV VARS:", missing.join(", "));
    log.error("Server may not function correctly.");
  } else {
    log.ok("All required env vars present.");
  }

  if (uncfg.length > 0) {
    log.warn("Optional env vars not set (some features disabled):", uncfg.join(", "));
  }

  return missing.length === 0;
}

// ── Global crash protection ───────────────────────────────

function installCrashProtection() {
  process.on("uncaughtException", (err) => {
    log.error("UNCAUGHT EXCEPTION — server stays up:", err.message);
    log.error(err.stack);
  });

  process.on("unhandledRejection", (reason) => {
    log.error("UNHANDLED PROMISE REJECTION — server stays up:", reason?.message || reason);
  });

  log.ok("Crash protection active.");
}

module.exports = {
  log,
  env,
  envRequired,
  safe,
  safeJSON,
  safeReadJSON,
  safeWriteJSON,
  sanitize,
  normalizePhone,
  validateEnv,
  installCrashProtection,
};
