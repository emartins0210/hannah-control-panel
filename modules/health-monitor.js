/**
 * MODULE: HEALTH MONITOR
 * 
 * Sistema de proteção que monitora saúde do servidor
 * - Verifica /health endpoint
 * - Monitora uso de memória
 * - Verifica processamento de leads
 * - Alerta se algo der errado
 * 
 * Roda: A cada 5 minutos
 * Ação: Log de saúde + alertas se problema
 */

const axios = require("axios");
const { log } = require("./guard");
const os = require("os");
const fs = require("fs");
const path = require("path");

// ── Configuration ─────────────────────────────────────

const MONITOR_CONFIG = {
  checkInterval: 5 * 60 * 1000,        // 5 minutes
  healthEndpoint: "http://localhost:3000/health",
  memoryThreshold: 300 * 1024 * 1024,  // 300 MB alert
  memoryMaximum: 400 * 1024 * 1024,    // 400 MB critical
  errorThreshold: 5,                    // Errors in 5 minutes
  responseTimeLimit: 5000,              // 5 second timeout
  logFile: path.join(__dirname, "../logs/health.log"),
};

// ── Logger for health monitor ─────────────────────────

function healthLog(status, message, data = {}) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${status}] ${message}`;
  
  // Console
  if (status === "ERROR") {
    log.error(line, data);
  } else if (status === "WARN") {
    log.warn(line, data);
  } else {
    log.info(line);
  }
  
  // File (if directory exists)
  try {
    const logDir = path.dirname(MONITOR_CONFIG.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(MONITOR_CONFIG.logFile, line + "\n");
  } catch (err) {
    // Silent fail if can't write to file
  }
}

// ── Health Check Object ───────────────────────────────

const healthCheck = {
  lastCheck: null,
  lastError: null,
  errorCount: 0,
  successCount: 0,
  startTime: new Date(),
  memory: {},
  cpu: {},
};

// ── Check Server Health ───────────────────────────────

async function checkServerHealth() {
  try {
    const response = await axios.get(MONITOR_CONFIG.healthEndpoint, {
      timeout: MONITOR_CONFIG.responseTimeLimit,
    });
    
    healthCheck.lastCheck = {
      status: response.data.status,
      service: response.data.service,
      tenants: response.data.tenants || 0,
      timestamp: new Date(),
      responseTime: response.headers["x-response-time"] || "unknown",
    };
    
    healthCheck.successCount++;
    healthCheck.errorCount = 0;
    
    healthLog("OK", `Server health check passed`, {
      status: response.data.status,
      tenants: response.data.tenants,
    });
    
    return true;
  } catch (err) {
    healthCheck.errorCount++;
    healthCheck.lastError = {
      message: err.message,
      code: err.code,
      timestamp: new Date(),
    };
    
    healthLog("ERROR", `Server health check FAILED`, {
      error: err.message,
      code: err.code,
      errorCount: healthCheck.errorCount,
    });
    
    // Alert if too many errors
    if (healthCheck.errorCount >= MONITOR_CONFIG.errorThreshold) {
      healthLog("WARN", `⚠️ CRITICAL: Server unresponsive for ${healthCheck.errorCount} checks!`);
    }
    
    return false;
  }
}

// ── Check Memory Usage ────────────────────────────────

function checkMemoryUsage() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const processMemory = process.memoryUsage();
  
  healthCheck.memory = {
    total: totalMem,
    free: freeMem,
    used: usedMem,
    usedPercent: Math.round((usedMem / totalMem) * 100),
    processHeap: processMemory.heapUsed,
    processRss: processMemory.rss,
  };
  
  const heapMB = Math.round(processMemory.heapUsed / 1024 / 1024);
  
  // Alert if memory is high
  if (processMemory.heapUsed > MONITOR_CONFIG.memoryThreshold) {
    healthLog("WARN", `⚠️ HIGH MEMORY USAGE: ${heapMB} MB`, {
      heapUsed: heapMB,
      threshold: MONITOR_CONFIG.memoryThreshold / 1024 / 1024,
    });
  }
  
  // Critical alert
  if (processMemory.heapUsed > MONITOR_CONFIG.memoryMaximum) {
    healthLog("ERROR", `🚨 CRITICAL MEMORY: ${heapMB} MB - Suggest restart!`, {
      heapUsed: heapMB,
      maximum: MONITOR_CONFIG.memoryMaximum / 1024 / 1024,
    });
  }
  
  return healthCheck.memory;
}

// ── Check CPU Usage ──────────────────────────────────

function checkCPUUsage() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  
  cpus.forEach((cpu) => {
    for (let type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  
  const usage = 100 - ~~((100 * totalIdle) / totalTick);
  healthCheck.cpu = {
    usage: usage,
    cores: cpus.length,
  };
  
  return healthCheck.cpu;
}

// ── Check File System ────────────────────────────────

function checkFileSystem() {
  try {
    const leadsFile = path.join(__dirname, "../config/leads.json");
    const tenantsFile = path.join(__dirname, "../config/tenants.json");
    
    const leadsSize = fs.existsSync(leadsFile)
      ? fs.statSync(leadsFile).size
      : 0;
    
    const tenantsSize = fs.existsSync(tenantsFile)
      ? fs.statSync(tenantsFile).size
      : 0;
    
    return {
      leadsSize: leadsSize,
      leadsCount: leadsSize > 0 ? Math.floor(leadsSize / 150) : 0, // rough estimate
      tenantsSize: tenantsSize,
    };
  } catch (err) {
    return { error: err.message };
  }
}

// ── Generate Health Report ────────────────────────────

function generateHealthReport() {
  const uptime = new Date() - healthCheck.startTime;
  const uptimeMinutes = Math.floor(uptime / 60000);
  const memPercent = healthCheck.memory.usedPercent || 0;
  
  return {
    timestamp: new Date().toISOString(),
    uptime: `${uptimeMinutes} minutes`,
    server: {
      status: healthCheck.lastCheck?.status || "unknown",
      lastCheck: healthCheck.lastCheck?.timestamp || null,
      errors: healthCheck.errorCount,
      successes: healthCheck.successCount,
    },
    memory: {
      heapUsed: `${Math.round(healthCheck.memory.processHeap / 1024 / 1024)} MB`,
      total: `${Math.round(healthCheck.memory.total / 1024 / 1024 / 1024)} GB`,
      free: `${Math.round(healthCheck.memory.free / 1024 / 1024)} MB`,
      percent: `${memPercent}%`,
      status: memPercent > 80 ? "⚠️ HIGH" : memPercent > 50 ? "MEDIUM" : "✅ OK",
    },
    cpu: {
      usage: `${healthCheck.cpu.usage}%`,
      cores: healthCheck.cpu.cores,
    },
  };
}

// ── Run Full Health Check ────────────────────────────

async function runFullHealthCheck() {
  healthLog("INFO", "════════════════════════════════════════");
  healthLog("INFO", "🏥 RUNNING FULL HEALTH CHECK");
  healthLog("INFO", "════════════════════════════════════════");
  
  // Check server
  const serverOk = await checkServerHealth();
  
  // Check memory
  checkMemoryUsage();
  
  // Check CPU
  checkCPUUsage();
  
  // Check files
  const filesInfo = checkFileSystem();
  
  // Generate report
  const report = generateHealthReport();
  
  healthLog("INFO", "Health Check Complete", {
    serverStatus: serverOk ? "✅ HEALTHY" : "❌ UNHEALTHY",
    memory: report.memory,
    cpu: report.cpu,
  });
  
  // Overall status
  if (serverOk && report.memory.percent < 80) {
    healthLog("OK", "✅ SYSTEM HEALTHY - All systems operational");
  } else if (!serverOk || report.memory.percent > 80) {
    healthLog("WARN", "⚠️ SYSTEM DEGRADED - Attention required");
  }
  
  return report;
}

// ── Auto-Cleanup on Memory Warning ──────────────────

function attemptMemoryCleanup() {
  if (healthCheck.memory.processHeap > MONITOR_CONFIG.memoryMaximum) {
    healthLog("WARN", "Attempting garbage collection...");
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      healthLog("OK", "Garbage collection executed");
    } else {
      healthLog("WARN", "Garbage collection not available (run with --expose-gc)");
    }
  }
}

// ── Start Monitoring ─────────────────────────────────

let monitorInterval = null;

function startMonitoring() {
  healthLog("OK", "🚀 Health Monitor Started");
  healthLog("INFO", `Check interval: every ${MONITOR_CONFIG.checkInterval / 1000} seconds`);
  healthLog("INFO", `Memory threshold: ${MONITOR_CONFIG.memoryThreshold / 1024 / 1024} MB`);
  
  // Run immediately
  runFullHealthCheck();
  
  // Run at interval
  monitorInterval = setInterval(async () => {
    await runFullHealthCheck();
    attemptMemoryCleanup();
  }, MONITOR_CONFIG.checkInterval);
  
  return monitorInterval;
}

function stopMonitoring() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    healthLog("OK", "🛑 Health Monitor Stopped");
    monitorInterval = null;
  }
}

// ── Get Current Status ───────────────────────────────

function getHealthStatus() {
  return {
    healthy: healthCheck.errorCount < MONITOR_CONFIG.errorThreshold,
    lastCheck: healthCheck.lastCheck,
    lastError: healthCheck.lastError,
    memory: healthCheck.memory,
    cpu: healthCheck.cpu,
    report: generateHealthReport(),
  };
}

// ── Export ───────────────────────────────────────────

module.exports = {
  startMonitoring,
  stopMonitoring,
  getHealthStatus,
  runFullHealthCheck,
  checkServerHealth,
  checkMemoryUsage,
  checkCPUUsage,
  checkFileSystem,
  generateHealthReport,
  healthLog,
};
