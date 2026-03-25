/**
 * Backup Manager - Cria backup automático de leads
 * Roda a cada 1 hora
 * Mantém últimos 30 dias de backups
 * 
 * Uso:
 * const backupManager = require("./modules/backup-manager");
 * backupManager.startAutomaticBackups();
 * backupManager.listBackups();
 * backupManager.restoreBackup("leads_20260322_1430.json");
 */

const fs = require("fs");
const path = require("path");

const LEADS_FILE = path.join(__dirname, "../config/leads.json");
const BACKUP_DIR = path.join(__dirname, "../backup");
const BACKUP_RETENTION_DAYS = 30;

const log = {
  info: (...args) => console.log(`[BACKUP] [${new Date().toISOString()}]`, ...args),
  warn: (...args) => console.warn(`[BACKUP-WARN] [${new Date().toISOString()}]`, ...args),
  error: (...args) => console.error(`[BACKUP-ERROR] [${new Date().toISOString()}]`, ...args),
};

// Criar diretório de backup se não existir
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    log.info(`📁 Diretório de backup criado: ${BACKUP_DIR}`);
  }
}

// Gerar nome do arquivo de backup
function generateBackupFilename() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `leads_${year}${month}${day}_${hours}${minutes}.json`;
}

// Criar backup
function createBackup() {
  try {
    ensureBackupDir();

    // Verificar se arquivo de leads existe
    if (!fs.existsSync(LEADS_FILE)) {
      log.warn("⚠️  Arquivo de leads não encontrado, criando backup vazio");
      const emptyData = { leads: [], backupedAt: new Date().toISOString() };
      const backupPath = path.join(BACKUP_DIR, generateBackupFilename());
      fs.writeFileSync(backupPath, JSON.stringify(emptyData, null, 2));
      log.info(`✅ Backup vazio criado: ${path.basename(backupPath)}`);
      return backupPath;
    }

    // Ler arquivo original
    const data = fs.readFileSync(LEADS_FILE, "utf-8");
    const parsed = JSON.parse(data);

    // Adicionar metadata de backup
    const backupData = {
      ...parsed,
      _metadata: {
        backedupAt: new Date().toISOString(),
        originalFile: LEADS_FILE,
        leadCount: parsed.leads ? parsed.leads.length : 0,
      },
    };

    // Salvar backup com novo nome
    const backupPath = path.join(BACKUP_DIR, generateBackupFilename());
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

    const leadsCount = backupData._metadata.leadCount;
    log.info(`✅ Backup criado: ${path.basename(backupPath)} (${leadsCount} leads)`);

    return backupPath;
  } catch (error) {
    log.error(`❌ Erro ao criar backup: ${error.message}`);
    return null;
  }
}

// Listar backups disponíveis
function listBackups() {
  try {
    ensureBackupDir();

    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".json"));

    if (files.length === 0) {
      log.info("📭 Nenhum backup encontrado");
      return [];
    }

    const backups = files.map((filename) => {
      const filepath = path.join(BACKUP_DIR, filename);
      const stat = fs.statSync(filepath);
      return {
        filename,
        path: filepath,
        size: `${(stat.size / 1024).toFixed(2)} KB`,
        created: stat.birthtime,
        modified: stat.mtime,
      };
    });

    log.info(`📦 ${backups.length} backups encontrados`);
    return backups.sort((a, b) => b.modified - a.modified);
  } catch (error) {
    log.error(`Erro ao listar backups: ${error.message}`);
    return [];
  }
}

// Restaurar backup
function restoreBackup(filename) {
  try {
    const backupPath = path.join(BACKUP_DIR, filename);

    if (!fs.existsSync(backupPath)) {
      log.error(`❌ Backup não encontrado: ${filename}`);
      return false;
    }

    // Criar backup do arquivo atual antes de restaurar
    if (fs.existsSync(LEADS_FILE)) {
      const safetyBackup = path.join(
        BACKUP_DIR,
        `safety_${Date.now()}_${path.basename(LEADS_FILE)}`
      );
      fs.copyFileSync(LEADS_FILE, safetyBackup);
      log.info(`🔒 Backup de segurança criado: ${path.basename(safetyBackup)}`);
    }

    // Restaurar
    const data = fs.readFileSync(backupPath, "utf-8");
    fs.writeFileSync(LEADS_FILE, data);

    log.info(`✅ Backup restaurado: ${filename}`);
    return true;
  } catch (error) {
    log.error(`❌ Erro ao restaurar backup: ${error.message}`);
    return false;
  }
}

// Limpar backups antigos (mais de 30 dias)
function cleanupOldBackups() {
  try {
    const now = Date.now();
    const maxAge = BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    const backups = listBackups();
    let deletedCount = 0;

    for (const backup of backups) {
      const age = now - backup.modified.getTime();

      if (age > maxAge) {
        fs.unlinkSync(backup.path);
        log.info(`🗑️  Backup antigo removido: ${backup.filename} (${Math.floor(age / (24 * 60 * 60 * 1000))} dias)`);
        deletedCount++;
      }
    }

    if (deletedCount === 0) {
      log.info("✅ Nenhum backup antigo para remover");
    } else {
      log.info(`✅ ${deletedCount} backups antigos removidos`);
    }

    return deletedCount;
  } catch (error) {
    log.error(`Erro ao limpar backups antigos: ${error.message}`);
    return 0;
  }
}

// Iniciar backups automáticos
let backupInterval = null;

function startAutomaticBackups() {
  if (backupInterval) {
    log.warn("Backups automáticos já estão rodando");
    return;
  }

  log.info("📦 Iniciando backups automáticos...");

  // Primeiro backup imediato
  createBackup();
  cleanupOldBackups();

  // Backup a cada 1 hora
  backupInterval = setInterval(() => {
    createBackup();
    cleanupOldBackups();
  }, 60 * 60 * 1000); // 1 hora

  // Para desenvolvimento, descomente:
  // setInterval(() => {
  //   createBackup();
  //   cleanupOldBackups();
  // }, 5 * 60 * 1000); // 5 minutos

  log.info("✅ Backups automáticos iniciados (a cada 1 hora)");
}

function stopAutomaticBackups() {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
    log.info("⏹️  Backups automáticos parados");
  }
}

// Status dos backups
function getBackupStatus() {
  const backups = listBackups();
  const lastBackup = backups[0];

  return {
    enabled: backupInterval !== null,
    totalBackups: backups.length,
    lastBackup: lastBackup
      ? {
          filename: lastBackup.filename,
          created: lastBackup.modified,
          size: lastBackup.size,
        }
      : null,
    backupDir: BACKUP_DIR,
    retentionDays: BACKUP_RETENTION_DAYS,
  };
}

module.exports = {
  createBackup,
  listBackups,
  restoreBackup,
  cleanupOldBackups,
  startAutomaticBackups,
  stopAutomaticBackups,
  getBackupStatus,
};
