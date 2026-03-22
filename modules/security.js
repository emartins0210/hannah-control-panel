/**
 * MODULE: SECURITY
 * 
 * Proteções de segurança centralizadas:
 * - Rate limiting por IP
 * - Helmet (HTTP security headers)
 * - CORS configurado
 * - Password hashing (bcrypt simples via crypto)
 * - Token JWT simples mas seguro
 * - Input sanitization
 * - IP logging de tentativas falhas
 */

const crypto = require("crypto");
const { log, env } = require("./guard");

// ── Rate Limiter (sem dependência externa) ────────────────
const requestCounts = new Map();
const blockedIPs    = new Map();

function rateLimiter(maxRequests = 60, windowMs = 60000) {
  return (req, res, next) => {
    const ip  = req.ip || req.connection.remoteAddress || "unknown";
    const now = Date.now();

    // Check if blocked
    if (blockedIPs.has(ip)) {
      const unblockAt = blockedIPs.get(ip);
      if (now < unblockAt) {
        return res.status(429).json({ error: "Too many requests. Try again later." });
      }
      blockedIPs.delete(ip);
    }

    // Count requests
    if (!requestCounts.has(ip)) {
      requestCounts.set(ip, { count: 1, start: now });
    } else {
      const entry = requestCounts.get(ip);
      if (now - entry.start > windowMs) {
        entry.count = 1;
        entry.start = now;
      } else {
        entry.count++;
        if (entry.count > maxRequests) {
          blockedIPs.set(ip, now + windowMs);
          log.warn(`Rate limit exceeded — blocked IP: ${ip}`);
          return res.status(429).json({ error: "Too many requests. Try again later." });
        }
      }
    }
    next();
  };
}

// Stricter limiter for auth endpoints
function authRateLimiter() {
  return rateLimiter(10, 60000); // 10 attempts per minute
}

// ── Security Headers (replaces helmet) ───────────────────
function securityHeaders() {
  return (req, res, next) => {
    res.setHeader("X-Content-Type-Options",    "nosniff");
    res.setHeader("X-Frame-Options",           "DENY");
    res.setHeader("X-XSS-Protection",          "1; mode=block");
    res.setHeader("Referrer-Policy",           "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy",        "camera=(), microphone=(), geolocation=()");
    res.removeHeader("X-Powered-By");
    next();
  };
}

// ── CORS configured ───────────────────────────────────────
function corsConfig() {
  const publicUrl = env("PUBLIC_URL", "");
  const allowed   = [
    publicUrl,
    "https://lopesservices.top",
    "https://www.lopesservices.top",
    "http://localhost:3000",
    "http://localhost:5173",
  ].filter(Boolean);

  return (req, res, next) => {
    const origin = req.headers.origin;
    // Allow Vapi webhooks (no origin) and configured origins
    if (!origin || allowed.includes(origin) || origin.endsWith(".railway.app")) {
      res.setHeader("Access-Control-Allow-Origin",  origin || "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,x-admin-secret");
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  };
}

// ── Password hashing (no bcrypt dependency) ───────────────
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  try {
    // Support legacy plaintext passwords
    if (!stored.includes(":")) return password === stored;
    const [salt, hash] = stored.split(":");
    const attempt      = crypto.scryptSync(password, salt, 32).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(attempt, "hex"));
  } catch {
    return false;
  }
}

// ── Secure JWT token (replaces base64 only) ───────────────
function generateToken(tenantId) {
  const secret  = env("ADMIN_SECRET", "fallback-secret");
  const payload = JSON.stringify({ id: tenantId, iat: Date.now(), exp: Date.now() + 7 * 86400000 });
  const encoded = Buffer.from(payload).toString("base64url");
  const sig     = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

function verifyToken(token) {
  try {
    const secret  = env("ADMIN_SECRET", "fallback-secret");
    const [encoded, sig] = token.split(".");
    if (!encoded || !sig) return null;
    const expected = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (payload.exp < Date.now()) return null;
    return payload.id;
  } catch {
    return null;
  }
}

// ── Input sanitizer ───────────────────────────────────────
function sanitizeInput(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") {
      clean[k] = v
        .replace(/<script[^>]*>.*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/[<>]/g, "")
        .trim()
        .slice(0, 1000); // max 1000 chars per field
    } else if (typeof v === "object" && v !== null) {
      clean[k] = sanitizeInput(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

// ── Middleware: sanitize all req.body ─────────────────────
function sanitizeBody() {
  return (req, res, next) => {
    if (req.body) req.body = sanitizeInput(req.body);
    next();
  };
}

// ── Webhook signature verifier (for Vapi) ─────────────────
function verifyWebhookKey(key, expected) {
  if (!key || !expected) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(key), Buffer.from(expected));
  } catch {
    return false;
  }
}

module.exports = {
  rateLimiter,
  authRateLimiter,
  securityHeaders,
  corsConfig,
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  sanitizeInput,
  sanitizeBody,
  verifyWebhookKey,
};
