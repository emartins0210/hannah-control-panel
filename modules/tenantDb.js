/**
 * MODULE: TENANT DATABASE
 * JSON-based storage with crash protection via guard.js
 */

const path = require("path");
const { safeReadJSON, safeWriteJSON } = require("./guard");

const DB_FILE = path.join(__dirname, "../config/tenants.json");

function load() {
  const data = safeReadJSON(DB_FILE, { tenants: [] });
  if (!Array.isArray(data.tenants)) data.tenants = [];
  return data;
}

function save(data) {
  return safeWriteJSON(DB_FILE, data);
}

function getAll() {
  return load().tenants;
}

function getById(id) {
  return load().tenants.find(t => t.id === id) || null;
}

function getByWebhookKey(key) {
  return load().tenants.find(t => t.webhookKey === key) || null;
}

function create(tenant) {
  const db = load();
  db.tenants.push(tenant);
  save(db);
  return tenant;
}

function update(id, fields) {
  const db  = load();
  const idx = db.tenants.findIndex(t => t.id === id);
  if (idx === -1) return null;
  db.tenants[idx] = { ...db.tenants[idx], ...fields, updatedAt: new Date().toISOString() };
  save(db);
  return db.tenants[idx];
}

function remove(id) {
  const db = load();
  db.tenants = db.tenants.filter(t => t.id !== id);
  save(db);
}

module.exports = { getAll, getById, getByWebhookKey, create, update, remove };
