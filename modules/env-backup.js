/**
 * Environment Backup Manager
 * Securely backs up critical environment variables and provides recovery mechanism
 * Prevents credential loss by maintaining encrypted backups of critical configs
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BACKUP_DIR = path.join(__dirname, '../backups');
const BACKUP_FILE = path.join(BACKUP_DIR, '.env.backup');
const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || 'hannah-ai-backup-key';

// Ensure backup directory exists
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`✓ Backup directory created: ${BACKUP_DIR}`);
  }
}

// Encrypt data for storage
function encrypt(text) {
  const hash = crypto
    .createHash('sha256')
    .update(ENCRYPTION_KEY)
    .digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', hash, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Decrypt data from storage
function decrypt(text) {
  const hash = crypto
    .createHash('sha256')
    .update(ENCRYPTION_KEY)
    .digest();
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', hash, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Critical variables that must be backed up
const CRITICAL_VARS = [
  'VAPI_API_KEY',
  'WHATSAPP_BUSINESS_TOKEN',
  'WHATSAPP_PHONE_ID',
  'JWT_SECRET',
  'ADMIN_SECRET'
];

// Backup critical environment variables
function backupCriticalVars() {
  ensureBackupDir();

  const backup = {};
  const timestamp = new Date().toISOString();
  const missingVars = [];

  CRITICAL_VARS.forEach((varName) => {
    const value = process.env[varName];
    if (value && !value.includes('ADICIONAR_AQUI_')) {
      backup[varName] = value;
    } else {
      missingVars.push(varName);
    }
  });

  if (Object.keys(backup).length === 0) {
    console.warn('⚠ No critical variables to backup');
    return false;
  }

  const backupData = {
    timestamp,
    version: '1.0',
    variables: backup,
    count: Object.keys(backup).length
  };

  try {
    const encrypted = encrypt(JSON.stringify(backupData));
    fs.writeFileSync(BACKUP_FILE, encrypted, { mode: 0o600 });
    console.log(
      `✓ Backup created: ${Object.keys(backup).length} critical variables backed up`
    );
    if (missingVars.length > 0) {
      console.log(`  ⚠ Missing variables: ${missingVars.join(', ')}`);
    }
    return true;
  } catch (error) {
    console.error(`✗ Backup failed: ${error.message}`);
    return false;
  }
}

// Restore critical environment variables from backup
function restoreFromBackup() {
  if (!fs.existsSync(BACKUP_FILE)) {
    console.warn(
      '⚠ No backup file found at',
      BACKUP_FILE
    );
    return false;
  }

  try {
    const encrypted = fs.readFileSync(BACKUP_FILE, 'utf8');
    const decrypted = decrypt(encrypted);
    const backupData = JSON.parse(decrypted);

    let restored = 0;
    Object.entries(backupData.variables).forEach(([key, value]) => {
      if (!process.env[key] || process.env[key].includes('ADICIONAR_AQUI_')) {
        process.env[key] = value;
        restored++;
      }
    });

    console.log(
      `✓ Restored ${restored} variables from backup (${backupData.timestamp})`
    );
    return restored > 0;
  } catch (error) {
    console.error(`✗ Restore failed: ${error.message}`);
    return false;
  }
}

// Check backup integrity
function checkBackupIntegrity() {
  if (!fs.existsSync(BACKUP_FILE)) {
    return { status: 'missing', message: 'No backup file found' };
  }

  try {
    const stats = fs.statSync(BACKUP_FILE);
    const encrypted = fs.readFileSync(BACKUP_FILE, 'utf8');
    const decrypted = decrypt(encrypted);
    const backupData = JSON.parse(decrypted);

    return {
      status: 'valid',
      timestamp: backupData.timestamp,
      variables: Object.keys(backupData.variables),
      count: backupData.count,
      fileSize: stats.size,
      lastModified: stats.mtime
    };
  } catch (error) {
    return {
      status: 'corrupted',
      message: error.message
    };
  }
}

// Verify backup has all required variables
function verifyBackupCompletes() {
  if (!fs.existsSync(BACKUP_FILE)) {
    return {
      complete: false,
      missing: CRITICAL_VARS,
      message: 'No backup exists'
    };
  }

  try {
    const encrypted = fs.readFileSync(BACKUP_FILE, 'utf8');
    const decrypted = decrypt(encrypted);
    const backupData = JSON.parse(decrypted);
    const backupVars = Object.keys(backupData.variables);
    const missing = CRITICAL_VARS.filter((v) => !backupVars.includes(v));

    return {
      complete: missing.length === 0,
      missing,
      count: backupVars.length,
      hasAll: missing.length === 0
    };
  } catch (error) {
    return {
      complete: false,
      missing: CRITICAL_VARS,
      error: error.message
    };
  }
}

// Delete backup (use with caution)
function deleteBackup() {
  try {
    if (fs.existsSync(BACKUP_FILE)) {
      fs.unlinkSync(BACKUP_FILE);
      console.log('✓ Backup deleted');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`✗ Delete failed: ${error.message}`);
    return false;
  }
}

module.exports = {
  backupCriticalVars,
  restoreFromBackup,
  checkBackupIntegrity,
  verifyBackupCompletes,
  deleteBackup,
  ensureBackupDir,
  CRITICAL_VARS,
  BACKUP_FILE
};
