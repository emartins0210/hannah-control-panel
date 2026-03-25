/**
 * MODULE: BACKUP MANAGER
 * 
 * Sistema automático de backup para dados críticos
 * - Faz backup de leads.json a cada 1 hora
 * - Mantém últimos 30 dias de backups
 * - Permite restauração rápida
 * - Compacta backups antigos
 * 
 * Roda: A cada 1 hora
 * Ação: Copia config/leads.json para backup/
 */

const fs = require("fs");
const path = require("path");
const { log } = require("./guard");

// ── Configuration ─────────────────────────────────────

const BACKUP_CONFIG = {
  backupInterval: 60 * 60 * 1000,           // 1 hour
  backupDir: path.join(__dirname, "../backup"),
  leadsFile: path.join(__dirname, "../config/leads.json"),
  tenantsFile: path.join(__dirname, "../config/tenants.json"),
  maxBackupDays: 30,                        // Keep 30 days
  compressOlderThan: 7,                     // Compress backups older than 7 days
};

// ── Logger for backup ────────────────────────────────

function backupLog(status, message, data = {}) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [BACKUP] [${status}] ${message}`;
  
  if (status === "ERROR") {
    log.error(line, data);
  } else if (status === "WARN") {
    log.warn(line, data);
  } else {
    log.info(line);
  }
}

// ── Ensure backup directory exists ────────────────────

function ensureBackupDir() {
  try {
    if (!fs.existsSync(BACKUP_CONFIG.backupDir)) {
      fs.mkdirSync(BACKUP_CONFIG.backupDir, { recursive: true });
      backupLog("OK", `Created backup directory: ${BACKUP_CONFIG.backupDir}`);
    }
    return true;
  } catch (err) {
    backupLog("ERROR", `Could not create backup directory: ${err.message}`);
    return false;
  }
}

// ── Generate backup filename ──────────────────────────

function getBackupFilename(fileType = "leads") {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  
  return `${fileType}_${year}${month}${day}_${hours}${minutes}.json`;
}

// ── Get backup file size ─────────────────────────────

function getFileSize(filepath) {
  try {
    if (!fs.existsSync(filepath)) return 0;
    return fs.statSync(filepath).size;
  } catch {
    return 0;
  }
}

// ── Get file age in days ─────────────────────────────

function getFileAgeDays(filepath) {
  try {
    if (!fs.existsSync(filepath)) return Infinity;
    const stat = fs.statSync(filepath);
    const ageMs = Date.now() - stat.mtime.getTime();
    return ageMs / (1000 * 60 * 60 * 24);
  } catch {
    return Infinity;
  }
}

// ── Backup single file ───────────────────────────────

function backupFile(sourceFile, backupName = null) {
  try {
    if (!fs.existsSync(sourceFile)) {
      backupLog("WARN", `Source file not found: ${sourceFile}`);
      return false;
    }
    
    const filename = backupName || getBackupFilename(path.basename(sourceFile, ".json"));
    const backupPath = path.join(BACKUP_CONFIG.backupDir, filename);
    
    // Read source
    const content = fs.readFileSync(sourceFile, "utf8");
    
    // Write backup
    fs.writeFileSync(backupPath, content, "utf8");
    
    const sizeKB = Math.round(content.length / 1024);
    backupLog("OK", `✅ Backed up ${path.basename(sourceFile)} (${sizeKB} KB)`, {
      file: filename,
      size: `${sizeKB} KB`,
    });
    
    return true;
  } catch (err) {
    backupLog("ERROR", `Backup failed: ${err.message}`);
    return false;
  }
}

// ── Clean old backups ────────────────────────────────

function cleanOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_CONFIG.backupDir);
    let deletedCount = 0;
    let deletedSize = 0;
    
    files.forEach((file) => {
      const filepath = path.join(BACKUP_CONFIG.backupDir, file);
      const ageDays = getFileAgeDays(filepath);
      
      // Remove if older than max backup days
      if (ageDays > BACKUP_CONFIG.maxBackupDays) {
        const size = getFileSize(filepath);
        fs.unlinkSync(filepath);
        deletedCount++;
        deletedSize += size;
      }
    });
    
    if (deletedCount > 0) {
      const sizeKB = Math.round(deletedSize / 1024);
      backupLog("OK", `🗑️  Cleaned ${deletedCount} old backups (freed ${sizeKB} KB)`, {
        deleted: deletedCount,
        freed: `${sizeKB} KB`,
      });
    }
    
    return true;
  } catch (err) {
    backupLog("ERROR", `Cleanup failed: ${err.message}`);
    return false;
  }
}

// ── Get backup statistics ────────────────────────────

function getBackupStats() {
  try {
    if (!fs.existsSync(BACKUP_CONFIG.backupDir)) {
      return {
        backupCount: 0,
        totalSize: 0,
        oldestBackup: null,
        newestBackup: null,
      };
    }
    
    const files = fs.readdirSync(BACKUP_CONFIG.backupDir);
    let totalSize = 0;
    let oldestTime = Infinity;
    let newestTime = 0;
    let oldestFile = null;
    let newestFile = null;
    
    files.forEach((file) => {
      const filepath = path.join(BACKUP_CONFIG.backupDir, file);
      const stat = fs.statSync(filepath);
      const mtime = stat.mtime.getTime();
      
      totalSize += stat.size;
      
      if (mtime < oldestTime) {
        oldestTime = mtime;
        oldestFile = file;
      }
      if (mtime > newestTime) {
        newestTime = mtime;
        newestFile = file;
      }
    });
    
    return {
      backupCount: files.length,
      totalSizeMB: Math.round(totalSize / 1024 / 1024),
      oldestBackup: oldestFile,
      newestBackup: newestFile,
      oldestDate: oldestTime === Infinity ? null : new Date(oldestTime),
      newestDate: newestTime === 0 ? null : new Date(newestTime),
    };
  } catch (err) {
    backupLog("ERROR", `Could not get stats: ${err.message}`);
    return null;
  }
}

// ── List all backups ─────────────────────────────────

function listBackups() {
  try {
    if (!fs.existsSync(BACKUP_CONFIG.backupDir)) {
      return [];
    }
    
    const files = fs.readdirSync(BACKUP_CONFIG.backupDir);
    const backups = files.map((file) => {
      const filepath = path.join(BACKUP_CONFIG.backupDir, file);
      const stat = fs.statSync(filepath);
      
      return {
        name: file,
        size: stat.size,
        sizeMB: Math.round(stat.size / 1024 / 1024 * 100) / 100,
        created: stat.mtime,
        ageDays: Math.round(getFileAgeDays(filepath) * 100) / 100,
      };
    });
    
    // Sort by date descending (newest first)
    return backups.sort((a, b) => b.created - a.created);
  } catch (err) {
    backupLog("ERROR", `Could not list backups: ${err.message}`);
    return [];
  }
}

// ── Restore backup ───────────────────────────────────

function restoreBackup(backupFilename) {
  try {
    const backupPath = path.join(BACKUP_CONFIG.backupDir, backupFilename);
    
    if (!fs.existsSync(backupPath)) {
      backupLog("ERROR", `Backup file not found: ${backupFilename}`);
      return false;
    }
    
    // Determine target file type
    let targetFile = BACKUP_CONFIG.leadsFile;
    if (backupFilename.includes("tenants")) {
      targetFile = BACKUP_CONFIG.tenantsFile;
    }
    
    // Create safety backup of current file
    const safetyBackup = path.join(
      BACKUP_CONFIG.backupDir,
      `safety_${new Date().getTime()}.json`
    );
    if (fs.existsSync(targetFile)) {
      fs.copyFileSync(targetFile, safetyBackup);
    }
    
    // Restore from backup
    const content = fs.readFileSync(backupPath, "utf8");
    fs.writeFileSync(targetFile, content, "utf8");
    
    const sizeKB = Math.round(content.length / 1024);
    backupLog("OK", `✅ RESTORED from backup: ${backupFilename} (${sizeKB} KB)`, {
      backup: backupFilename,
      restored: path.basename(targetFile),
    });
    
    return true;
  } catch (err) {
    backupLog("ERROR", `Restore failed: ${err.message}`);
    return false;
  }
}

// ── Run full backup cycle ────────────────────────────

async function runBackupCycle() {
  backupLog("INFO", "════════════════════════════════════════");
  backupLog("INFO", "📦 BACKUP CYCLE STARTED");
  backupLog("INFO", "════════════════════════════════════════");
  
  // Ensure backup dir exists
  if (!ensureBackupDir()) {
    backupLog("ERROR", "Could not proceed without backup directory");
    return false;
  }
  
  // Backup leads.json
  const leadsOk = backupFile(BACKUP_CONFIG.leadsFile);
  
  // Backup tenants.json
  const tenantsOk = backupFile(BACKUP_CONFIG.tenantsFile);
  
  // Clean old backups
  cleanOldBackups();
  
  // Get stats
  const stats = getBackupStats();
  backupLog("INFO", "📊 Backup Statistics", stats);
  
  const success = leadsOk && tenantsOk;
  if (success) {
    backupLog("OK", "✅ BACKUP CYCLE COMPLETED SUCCESSFULLY");
  } else {
    backupLog("ERROR", "❌ BACKUP CYCLE COMPLETED WITH ERRORS");
  }
  
  return success;
}

// ── Start automatic backups ──────────────────────────

let backupInterval = null;

function startAutomaticBackups() {
  backupLog("OK", "🚀 Automatic Backups Started");
  backupLog("INFO", `Backup interval: every ${BACKUP_CONFIG.backupInterval / 1000 / 60} minutes`);
  backupLog("INFO", `Backup directory: ${BACKUP_CONFIG.backupDir}`);
  backupLog("INFO", `Retention: ${BACKUP_CONFIG.maxBackupDays} days`);
  
  // Run immediately
  runBackupCycle();
  
  // Run at interval
  backupInterval = setInterval(async () => {
    await runBackupCycle();
  }, BACKUP_CONFIG.backupInterval);
  
  return backupInterval;
}

function stopAutomaticBackups() {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupLog("OK", "🛑 Automatic Backups Stopped");
    backupInterval = null;
  }
}

// ── Export ───────────────────────────────────────────

module.exports = {
  startAutomaticBackups,
  stopAutomaticBackups,
  runBackupCycle,
  backupFile,
  restoreBackup,
  listBackups,
  getBackupStats,
  cleanOldBackups,
  backupLog,
  BACKUP_CONFIG,
};
