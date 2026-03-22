/**
 * CLEANAI SAAS — TEST SUITE
 * Roda antes de qualquer deploy para garantir que nada vai quebrar.
 * 
 * Como usar:
 *   node test.js
 * 
 * No Railway, adicione ao Start Command:
 *   node test.js && node server.js
 */

require("dotenv").config();
const fs   = require("fs");
const path = require("path");

let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    const result = fn();
    if (result === false) throw new Error("returned false");
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${label}: ${err.message}`);
    failed++;
  }
}

async function testAsync(label, fn) {
  try {
    await fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${label}: ${err.message}`);
    failed++;
  }
}

console.log("\n🧪 CleanAI SaaS — Test Suite\n");

// ── 1. File existence ─────────────────────────────────────
console.log("📁 File Structure:");
const requiredFiles = [
  "server.js", "setup.js", "package.json", ".env.example",
  "modules/guard.js", "modules/vapi.js", "modules/leadDb.js",
  "modules/tenantDb.js", "modules/twilioNotify.js",
  "modules/googleCalendar.js", "modules/smsReminders.js",
  "routes/admin.js", "routes/webhook.js", "routes/vapiWebhook.js",
  "routes/clientAuth.js", "routes/clientLookup.js",
  "public/admin/index.html", "public/client/index.html",
  "public/form-integration.js", "config/leads.json", "config/tenants.json",
];
requiredFiles.forEach(f => {
  test(f, () => fs.existsSync(path.join(__dirname, f)));
});

// ── 2. Syntax check ───────────────────────────────────────
console.log("\n🔍 Syntax Check:");
const jsFiles = [
  "server.js", "setup.js",
  "modules/guard.js", "modules/vapi.js", "modules/leadDb.js",
  "modules/tenantDb.js", "modules/twilioNotify.js",
  "modules/googleCalendar.js", "modules/smsReminders.js",
  "routes/admin.js", "routes/webhook.js", "routes/vapiWebhook.js",
  "routes/clientAuth.js", "routes/clientLookup.js",
];
const { execSync } = require("child_process");
jsFiles.forEach(f => {
  test(f, () => {
    execSync(`node --check ${path.join(__dirname, f)}`, { stdio: "pipe" });
    return true;
  });
});

// ── 3. Module loading ─────────────────────────────────────
console.log("\n📦 Module Loading:");
const modules = [
  ["guard",          "./modules/guard"],
  ["leadDb",         "./modules/leadDb"],
  ["tenantDb",       "./modules/tenantDb"],
  ["vapi exports",   "./modules/vapi"],
  ["twilioNotify",   "./modules/twilioNotify"],
  ["googleCalendar", "./modules/googleCalendar"],
  ["smsReminders",   "./modules/smsReminders"],
];
modules.forEach(([label, mod]) => {
  test(label, () => { require(mod); return true; });
});

// ── 4. Config files ───────────────────────────────────────
console.log("\n📄 Config Files:");
test("tenants.json valid JSON", () => {
  JSON.parse(fs.readFileSync("./config/tenants.json", "utf8"));
  return true;
});
test("leads.json valid JSON", () => {
  JSON.parse(fs.readFileSync("./config/leads.json", "utf8"));
  return true;
});

// ── 5. Guard module ───────────────────────────────────────
console.log("\n🛡️  Guard Module:");
const { safeJSON, safeReadJSON, normalizePhone, sanitize, env } = require("./modules/guard");
test("safeJSON valid",     () => safeJSON('{"a":1}').a === 1);
test("safeJSON invalid",   () => safeJSON("broken", { x: 1 }).x === 1);
test("normalizePhone 10d", () => normalizePhone("3215550100") === "+13215550100");
test("normalizePhone 11d", () => normalizePhone("13215550100") === "+13215550100");
test("normalizePhone fmt", () => normalizePhone("(321) 555-0100") === "+13215550100");
test("sanitize string",    () => sanitize("  hello  ") === "hello");
test("sanitize null",      () => sanitize(null) === "");
test("env fallback",       () => env("NONEXISTENT_VAR_XYZ", "fallback") === "fallback");

// ── 6. Price calculation ──────────────────────────────────
console.log("\n💰 Price Calculation:");
const { buildSystemPrompt } = require("./modules/vapi");
const tenant = { aiName: "Hannah", companyName: "Test Co", serviceAreas: "Melbourne FL", id: "test" };
test("3bd standard → $195", () => buildSystemPrompt(tenant, { name: "Sarah", serviceType: "Standard Cleaning", bedrooms: "3", bathrooms: "2" }).includes("$195"));
test("4bd deep → $380",     () => buildSystemPrompt(tenant, { name: "John",  serviceType: "Deep Cleaning",     bedrooms: "4", bathrooms: "3" }).includes("$380"));
test("2bd airbnb → $150",   () => buildSystemPrompt(tenant, { name: "Bob",   serviceType: "Airbnb Turnover",   bedrooms: "2", bathrooms: "1" }).includes("$150"));
test("no range language",   () => !buildSystemPrompt(tenant, { name: "Amy",  serviceType: "Standard Cleaning", bedrooms: "3" }).includes("approximately"));
test("greeting uses name",  () => buildSystemPrompt(tenant, { name: "Mike",  serviceType: "Standard Cleaning", bedrooms: "2" }).includes("Hey Mike!"));
test("Facebook source",     () => buildSystemPrompt(tenant, { name: "Ana",   source: "facebook_ads" }).includes("Facebook"));
test("cold call source",    () => buildSystemPrompt(tenant, { name: "Tom",   source: "cold_call_outbound" }).includes("unexpected"));

// ── 7. DB operations ──────────────────────────────────────
console.log("\n🗄️  Database:");
const leadDb   = require("./modules/leadDb");
const tenantDb = require("./modules/tenantDb");
test("leadDb.getAll returns array",    () => Array.isArray(leadDb.getAll()));
test("tenantDb.getAll returns array",  () => Array.isArray(tenantDb.getAll()));
test("leadDb.getById unknown → null",  () => leadDb.getById("nonexistent") === null);
test("tenantDb.getById unknown → null",() => tenantDb.getById("nonexistent") === null);

// ── Summary ───────────────────────────────────────────────
console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed. Fix before deploying.\n`);
  process.exit(1);
} else {
  console.log(`\n✅ All tests passed. Safe to deploy!\n`);
  process.exit(0);
}
