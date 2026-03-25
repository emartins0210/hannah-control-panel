#!/bin/bash

# ============================================================================
# 🚀 SETUP AUTOMÁTICO - HANNAH 3.0 (4 Módulos)
# ============================================================================
# Este script automatiza TODA a implementação dos 4 módulos
# - Health Monitor
# - Backup Manager
# - Google Ads Integration
# - Facebook Ads Integration
# ============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Funções de logging
log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

log_section() {
    echo -e "\n${CYAN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║ $1${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}\n"
}

# ============================================================================
# PASSO 1: VERIFICAR PRÉ-REQUISITOS
# ============================================================================

log_section "PASSO 1: Verificando Pré-Requisitos"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js não está instalado"
    echo "  Instale: https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node --version)
log_success "Node.js $NODE_VERSION encontrado"

# Verificar npm
if ! command -v npm &> /dev/null; then
    log_error "npm não está instalado"
    exit 1
fi
NPM_VERSION=$(npm --version)
log_success "npm $NPM_VERSION encontrado"

# Verificar git
if ! command -v git &> /dev/null; then
    log_warning "Git não está instalado (será necessário para deploy)"
else
    log_success "Git encontrado"
fi

# Verificar se estamos em um repositório git
if [ ! -d ".git" ]; then
    log_warning "Não estamos em um repositório git"
    log_info "Execute: git init"
fi

# ============================================================================
# PASSO 2: CRIAR ESTRUTURA DE PASTAS
# ============================================================================

log_section "PASSO 2: Criando Estrutura de Pastas"

mkdir -p modules
log_success "Pasta 'modules' criada"

mkdir -p config
log_success "Pasta 'config' criada"

mkdir -p backup
log_success "Pasta 'backup' criada"

mkdir -p logs
log_success "Pasta 'logs' criada"

# ============================================================================
# PASSO 3: COPIAR MÓDULOS
# ============================================================================

log_section "PASSO 3: Copiando Módulos de Código"

# Função para copiar módulo
copy_module() {
    local source=$1
    local dest=$2
    local name=$3
    
    if [ -f "$source" ]; then
        cp "$source" "$dest"
        log_success "✓ $name copiado para $dest"
    else
        log_warning "⚠ $name não encontrado em $source"
    fi
}

copy_module "modules_health-monitor.js" "modules/health-monitor.js" "Health Monitor"
copy_module "modules_backup-manager.js" "modules/backup-manager.js" "Backup Manager"
copy_module "modules_google-ads-integration.js" "modules/google-ads-integration.js" "Google Ads Integration"
copy_module "modules_facebook-ads-integration.js" "modules/facebook-ads-integration.js" "Facebook Ads Integration"

# ============================================================================
# PASSO 4: INSTALAR DEPENDÊNCIAS
# ============================================================================

log_section "PASSO 4: Instalando Dependências"

if grep -q '"axios"' package.json 2>/dev/null; then
    log_success "axios já está em package.json"
else
    log_info "Instalando axios..."
    npm install axios
    log_success "axios instalado"
fi

# ============================================================================
# PASSO 5: CRIAR/ATUALIZAR server.js
# ============================================================================

log_section "PASSO 5: Atualizando server.js"

if [ ! -f "server.js" ]; then
    log_warning "server.js não encontrado. Criando template..."
    cat > server.js << 'EOF'
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// ============================================================================
// HANNAH 3.0 MODULES
// ============================================================================

// Health Monitor
const healthMonitor = require('./modules/health-monitor');
healthMonitor.startMonitoring();
healthMonitor.attachToExpress(app);

// Backup Manager
const backupManager = require('./modules/backup-manager');
backupManager.startAutomaticBackups();

// Google Ads Integration
const GoogleAdsIntegration = require('./modules/google-ads-integration');
const googleAds = new GoogleAdsIntegration();
googleAds.initialize().catch(err => {
  console.error('[Google Ads] Initialization failed:', err.message);
});

app.get('/api/google-ads/report', (req, res) => {
  const report = googleAds.getPerformanceReport();
  res.json(report);
});

// Facebook Ads Integration
const FacebookAdsIntegration = require('./modules/facebook-ads-integration');
const facebookAds = new FacebookAdsIntegration();
facebookAds.initialize().catch(err => {
  console.error('[Facebook Ads] Initialization failed:', err.message);
});

app.get('/api/facebook-ads/report', (req, res) => {
  const report = facebookAds.getPerformanceReport();
  res.json(report);
});

// ============================================================================
// ROUTES
// ============================================================================

app.get('/', (req, res) => {
  res.json({ 
    message: 'Hannah 3.0 API',
    status: 'running',
    endpoints: {
      health: '/health',
      googleAdsReport: '/api/google-ads/report',
      facebookAdsReport: '/api/facebook-ads/report',
      backupManual: '/api/backup/manual'
    }
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`\n[Hannah 3.0] Server running on port ${PORT}`);
  console.log(`[Hannah 3.0] Health: http://localhost:${PORT}/health`);
  console.log(`[Hannah 3.0] Google Ads: http://localhost:${PORT}/api/google-ads/report`);
  console.log(`[Hannah 3.0] Facebook Ads: http://localhost:${PORT}/api/facebook-ads/report\n`);
});
EOF
    log_success "server.js criado"
else
    log_info "server.js já existe. Verifique se tem os requires dos módulos:"
    log_info "  const healthMonitor = require('./modules/health-monitor');"
    log_info "  const backupManager = require('./modules/backup-manager');"
    log_info "  const GoogleAdsIntegration = require('./modules/google-ads-integration');"
    log_info "  const FacebookAdsIntegration = require('./modules/facebook-ads-integration');"
fi

# ============================================================================
# PASSO 6: CRIAR/ATUALIZAR .env
# ============================================================================

log_section "PASSO 6: Configurando Variáveis de Ambiente"

if [ ! -f ".env" ]; then
    log_info "Criando arquivo .env..."
    cat > .env << 'EOF'
# Google Ads
GOOGLE_ADS_CLIENT_ID=seu_client_id_aqui
GOOGLE_ADS_CLIENT_SECRET=seu_client_secret_aqui
GOOGLE_ADS_DEVELOPER_TOKEN=seu_developer_token_aqui
GOOGLE_ADS_REFRESH_TOKEN=seu_refresh_token_aqui
GOOGLE_ADS_CUSTOMER_ID=seu_customer_id_aqui
GOOGLE_ADS_LOGIN_CUSTOMER_ID=seu_login_customer_id_aqui

# Facebook Ads
FACEBOOK_ADS_ACCESS_TOKEN=seu_access_token_aqui
FACEBOOK_BUSINESS_ACCOUNT_ID=seu_business_account_id_aqui
FACEBOOK_AD_ACCOUNT_ID=seu_ad_account_id_aqui

# Hannah
HANNAH_URL=http://localhost:3000
EOF
    log_success ".env criado"
    log_warning "⚠ IMPORTANTE: Preencha as API keys em .env"
else
    log_success ".env já existe"
    log_info "Verifique se as seguintes variáveis estão preenchidas:"
    log_info "  - GOOGLE_ADS_CLIENT_ID"
    log_info "  - GOOGLE_ADS_CLIENT_SECRET"
    log_info "  - GOOGLE_ADS_DEVELOPER_TOKEN"
    log_info "  - FACEBOOK_ADS_ACCESS_TOKEN"
fi

# ============================================================================
# PASSO 7: CRIAR/ATUALIZAR .gitignore
# ============================================================================

log_section "PASSO 7: Atualizando .gitignore"

if [ ! -f ".gitignore" ]; then
    cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
backup/
logs/
*.log
.DS_Store
EOF
    log_success ".gitignore criado"
else
    if ! grep -q "backup/" .gitignore; then
        echo "backup/" >> .gitignore
        log_success "Adicionado 'backup/' ao .gitignore"
    fi
    if ! grep -q ".env" .gitignore; then
        echo ".env" >> .gitignore
        log_success "Adicionado '.env' ao .gitignore"
    fi
fi

# ============================================================================
# PASSO 8: CRIAR config/leads.json
# ============================================================================

log_section "PASSO 8: Criando Banco de Dados de Leads"

if [ ! -f "config/leads.json" ]; then
    echo "[]" > config/leads.json
    log_success "config/leads.json criado (vazio)"
else
    log_success "config/leads.json já existe"
fi

# ============================================================================
# PASSO 9: CRIAR SCRIPT DE TESTE
# ============================================================================

log_section "PASSO 9: Preparando Script de Teste"

if [ -f "TESTE_INTEGRACAO_ADS.js" ]; then
    log_success "Script de teste disponível"
    log_info "Execute com: node TESTE_INTEGRACAO_ADS.js"
else
    log_warning "Script de teste não encontrado"
fi

# ============================================================================
# RESUMO FINAL
# ============================================================================

log_section "✨ SETUP AUTOMÁTICO CONCLUÍDO!"

echo -e "${GREEN}${BOLD}Próximos Passos:${NC}\n"

echo "1️⃣  Preencher variáveis de ambiente:"
echo "   ${CYAN}nano .env${NC}"
echo "   (Adicione suas API keys do Google Ads e Facebook Ads)\n"

echo "2️⃣  Testar localmente:"
echo "   ${CYAN}npm start${NC}\n"

echo "3️⃣  Validar integração:"
echo "   ${CYAN}node TESTE_INTEGRACAO_ADS.js${NC}\n"

echo "4️⃣  Fazer commit:"
echo "   ${CYAN}git add .${NC}"
echo "   ${CYAN}git commit -m 'feat: add hannah 3.0 modules'${NC}"
echo "   ${CYAN}git push origin main${NC}\n"

echo "5️⃣  Deploy no Railway:"
echo "   ${CYAN}railway deploy${NC}\n"

echo -e "${GREEN}Documentação disponível:${NC}"
echo "  • COMECE_AQUI_IMPLEMENTACAO.md"
echo "  • INSTRUCOES_IMPLEMENTACAO_COMPLETA.md"
echo "  • RELATORIO_CAPACIDADES_HANNAH_3.0.md\n"

echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}Sistema pronto para uso!${NC} 🚀\n"

exit 0
