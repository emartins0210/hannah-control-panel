/**
 * Health Monitor - Monitora a saúde do servidor Hannah AI
 * Roda a cada 5 minutos
 * Verifica: CPU, Memória, Erros, Chamadas
 * 
 * Uso:
 * const healthMonitor = require("./modules/health-monitor");
 * healthMonitor.startMonitoring();
 */

const fs = require("fs");
const path = require("path");

let callCount = 0;
let errorCount = 0;
let lastCheckTime = Date.now();

const log = {
  info: (...args) => console.log(`[HEALTH] [${new Date().toISOString()}]`, ...args),
  warn: (...args) => console.warn(`[HEALTH-WARN] [${new Date().toISOString()}]`, ...args),
  error: (...args) => console.error(`[HEALTH-ERROR] [${new Date().toISOString()}]`, ...args),
};

// Função para obter uso de memória
function getMemoryUsage() {
  const used = process.memoryUsage();
  return {
    rss: Math.round(used.rss / 1024 / 1024), // MB
    heapUsed: Math.round(used.heapUsed / 1024 / 1024),
    heapTotal: Math.round(used.heapTotal / 1024 / 1024),
    external: Math.round(used.external / 1024 / 1024),
  };
}

// Função para obter informações de CPU (aproximado)
function getCPULoad() {
  const loadavg = require("os").loadavg();
  const cpus = require("os").cpus().length;
  return {
    load1: loadavg[0].toFixed(2),
    load5: loadavg[1].toFixed(2),
    load15: loadavg[2].toFixed(2),
    cpuCount: cpus,
  };
}

// Função para verificar saúde
function checkHealth() {
  const now = Date.now();
  const uptime = process.uptime();
  const memory = getMemoryUsage();
  const cpu = getCPULoad();

  const health = {
    timestamp: new Date().toISOString(),
    status: "ok",
    uptime: Math.floor(uptime),
    memory,
    cpu,
    calls: callCount,
    errors: errorCount,
    checks: {
      memory: memory.heapUsed < 400 ? "✅" : "⚠️ ",
      cpu: cpu.load1 < 2 ? "✅" : "⚠️ ",
      errors: errorCount === 0 ? "✅" : "⚠️ ",
    },
  };

  // Alertas se algo estiver errado
  if (memory.heapUsed > 400) {
    health.status = "warning";
    log.warn(`Alta memória detectada: ${memory.heapUsed}MB`);
  }

  if (cpu.load1 > 2) {
    health.status = "warning";
    log.warn(`Alta CPU detectada: ${cpu.load1}`);
  }

  if (errorCount > 5) {
    health.status = "warning";
    log.warn(`Muitos erros: ${errorCount}`);
  }

  log.info(
    `Status: ${health.status} | Memória: ${memory.heapUsed}/${memory.heapTotal}MB | ` +
    `Uptime: ${Math.floor(uptime / 60)}min | Chamadas: ${callCount} | Erros: ${errorCount}`
  );

  return health;
}

// Registrador de eventos
function recordCall() {
  callCount++;
}

function recordError(error) {
  errorCount++;
  log.error(`Erro registrado: ${error.message || error}`);
}

// Health check endpoint (para ser usado em HTTP)
function getHealthStatus() {
  return checkHealth();
}

// Iniciar monitoramento automático
let monitoringInterval = null;

function startMonitoring() {
  if (monitoringInterval) {
    log.warn("Monitoramento já está rodando");
    return;
  }

  log.info("🏥 Iniciando Health Monitor...");
  
  // Primeira verificação imediata
  checkHealth();

  // Verificar a cada 5 minutos
  monitoringInterval = setInterval(() => {
    checkHealth();
  }, 5 * 60 * 1000); // 5 minutos

  // Também verificar a cada 1 minuto para desenvolvimento
  // setInterval(() => checkHealth(), 60 * 1000); // 1 minuto

  log.info("✅ Health Monitor iniciado (checagem a cada 5 min)");
}

function stopMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    log.info("⏹️  Health Monitor parado");
  }
}

// Integração com Express (se disponível)
function attachToExpress(app) {
  app.get("/health", (req, res) => {
    res.json(getHealthStatus());
  });

  app.get("/health/full", (req, res) => {
    res.json({
      ...getHealthStatus(),
      details: {
        callCount,
        errorCount,
        nodeVersion: process.version,
        platform: process.platform,
      },
    });
  });

  log.info("✅ Health endpoints attachados (/health, /health/full)");
}

module.exports = {
  startMonitoring,
  stopMonitoring,
  checkHealth,
  getHealthStatus,
  recordCall,
  recordError,
  attachToExpress,
};
