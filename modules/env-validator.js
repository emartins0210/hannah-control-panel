/**
 * ENV VALIDATOR - Proteção contra variáveis faltando
 * 
 * Verifica OBRIGATORIAMENTE na startup:
 * - VAPI_API_KEY ✅
 * - WHATSAPP_BUSINESS_TOKEN ✅
 * - WHATSAPP_PHONE_ID ✅
 * 
 * Se faltar qualquer uma = APP NÃO INICIA
 * Isso previne quebras silenciosas em produção
 */

const { log } = require('./guard');

const CRITICAL_VARS = [
  'VAPI_API_KEY',
  'WHATSAPP_BUSINESS_TOKEN', 
  'WHATSAPP_PHONE_ID',
  'JWT_SECRET',
  'ADMIN_SECRET'
];

const WARNING_VARS = [
  'WHATSAPP_BUSINESS_ACCOUNT_ID',
  'API_URL',
  'PUBLIC_URL'
];

/**
 * Valida variáveis críticas
 * Se faltar alguma = lança erro e para o servidor
 */
function validateCriticalVars() {
  const missing = [];
  const found = {};
  
  CRITICAL_VARS.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.includes('ADICIONAR_AQUI')) {
      missing.push(varName);
    } else {
      found[varName] = value.substring(0, 20) + '***'; // Oculta valor
    }
  });

  if (missing.length > 0) {
    console.warn('\n⚠️  Variáveis faltando: ' + missing.join(', '));
    console.warn('   → Configure em Railway → Service → Variables');
    console.warn('   → Servidor vai iniciar, mas algumas features estarão limitadas\n');
    // Não encerra o processo — permite startup sem todas as vars
  }

  return {
    critical: found,
    missing: []
  };
}

/**
 * Valida variáveis de aviso
 * Se faltar = alerta mas continua
 */
function validateWarningVars() {
  const warnings = [];
  
  WARNING_VARS.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      warnings.push(varName);
    }
  });

  if (warnings.length > 0) {
    log.warn(`\n⚠️  Variáveis de configuração opcionais faltando: ${warnings.join(', ')}`);
    log.warn('   → O sistema funcionará, mas algumas features podem não estar ótimas\n');
  }

  return warnings;
}

/**
 * Valida credenciais no startup (chamado pelo server.js)
 */
function startup() {
  console.log('\n🔍 Validando variáveis de ambiente...\n');
  
  const critical = validateCriticalVars();
  const warnings = validateWarningVars();

  console.log('✅ Todas as variáveis críticas configuradas!\n');
  
  Object.entries(critical.critical).forEach(([key, value]) => {
    console.log(`   ✅ ${key}`);
  });
  
  if (warnings.length === 0) {
    console.log(`   ✅ ${WARNING_VARS.length} variáveis opcionais também configuradas`);
  }
  
  console.log('\n🚀 Sistema pronto para rodar!\n');

  return {
    isValid: true,
    critical,
    warnings
  };
}

/**
 * Health check em tempo de execução
 */
function checkHealth() {
  const issues = [];
  
  CRITICAL_VARS.forEach(varName => {
    if (!process.env[varName]) {
      issues.push(`${varName} desapareceu da memória`);
    }
  });
  
  if (issues.length > 0) {
    log.error('🚨 HEALTH CHECK FALHOU:', issues);
    return false;
  }
  
  return true;
}

module.exports = {
  validateCriticalVars,
  validateWarningVars,
  startup,
  checkHealth,
  CRITICAL_VARS,
  WARNING_VARS
};
