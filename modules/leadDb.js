/**
 * MODULE: LEAD DATABASE
 * JSON-based storage with crash protection via guard.js
 */

const path = require("path");
const { safeReadJSON, safeWriteJSON, log } = require("./guard");

const DB_FILE = path.join(__dirname, "../config/leads.json");

function load() {
  const data = safeReadJSON(DB_FILE, { leads: [] });
  if (!Array.isArray(data.leads)) data.leads = [];
  return data;
}

function save(data) {
  return safeWriteJSON(DB_FILE, data);
}

function getByTenant(tenantId) {
  return load().leads.filter(l => l.tenantId === tenantId);
}

function getById(id) {
  return load().leads.find(l => l.id === id) || null;
}

function getByPhone(tenantId, phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  const leads  = load().leads.filter(l => l.tenantId === tenantId);
  leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return leads.find(l => {
    const d = (l.phone || "").replace(/\D/g, "");
    return d === digits || d.endsWith(digits.slice(-10)) || digits.endsWith(d.slice(-10));
  }) || null;
}

function getHistoryByPhone(tenantId, phone) {
  if (!phone) return [];
  const digits = phone.replace(/\D/g, "");
  const leads  = load().leads.filter(l => l.tenantId === tenantId);
  return leads
    .filter(l => {
      const d = (l.phone || "").replace(/\D/g, "");
      return d === digits || d.endsWith(digits.slice(-10)) || digits.endsWith(d.slice(-10));
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function create(lead) {
  const db = load();
  db.leads.push(lead);
  save(db);
  return lead;
}

function update(id, fields) {
  const db  = load();
  const idx = db.leads.findIndex(l => l.id === id);
  if (idx === -1) return null;
  db.leads[idx] = { ...db.leads[idx], ...fields, updatedAt: new Date().toISOString() };
  save(db);
  return db.leads[idx];
}

function getAll() {
  return load().leads;
}

module.exports = { getAll, getByTenant, getById, getByPhone, getHistoryByPhone, create, update };
