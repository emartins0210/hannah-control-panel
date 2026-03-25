#!/usr/bin/env node

/**
 * 🚀 SETUP AUTOMÁTICO - HANNAH 3.0 (4 Módulos)
 * 
 * Script Node.js que automatiza TODA a implementação
 * Funciona em Windows, Mac e Linux
 * 
 * Uso: node setup-automatico.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Funções de logging
const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  section: (msg) => {
    console.log(`\n${colors.cyan}╔════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║ ${msg.padEnd(44)}║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════╝${colors.reset}\n`);
  }
};

class SetupAutomatico {
  constructor() {
    this.baseDir = process.cwd();
    this.success = true;
    this.modulosCopiados = 0;
  }

  /**
   * PASSO 1: Verificar pré-requisitos
   */
  verificarPreRequisitos() {
    log.section('PASSO 1: Verificando Pré-Requisitos');

    // Verificar Node.js
    const nodeVersion = process.version;
    log.success(`Node.js ${nodeVersion} encontrado`);

    // Verificar npm
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      log.success(`npm ${npmVersion} encontrado`);
    } catch (error) {
      log.error('npm não está instalado');
      this.success = false;
    }

    // Verificar Git (opcional)
    try {
      execSync('git --version', { encoding: 'utf8', stdio: 'pipe' });
      log.success('Git encontrado');
    } catch (error) {
      log.warning('Git não está instalado (será necessário para deploy)');
    }

    // Verificar se tem package.json
    if (fs.existsSync('package.json')) {
      log.success('package.json encontrado');
    } else {
      log.warning('package.json não encontrado. Execute: npm init -y');
    }
  }

  /**
   * PASSO 2: Criar pastas
   */
  criarPastas() {
    log.section('PASSO 2: Criando Estrutura de Pastas');

    const pastas = ['modules', 'config', 'backup', 'logs'];
    
    pastas.forEach(pasta => {
      const caminho = path.join(this.baseDir, pasta);
      if (!fs.existsSync(caminho)) {
        fs.mkdirSync(caminho, { recursive: true });
        log.success(`Pasta '${pasta}' criada`);
      } else {
        log.success(`Pasta '${pasta}' já existe`);
      }
    });
  }

  /**
   * PASSO 3: Copiar módulos
   */
  copiarModulos() {
    log.section('PASSO 3: Copiando Módulos de Código');

    const modulos = [
      {
        origem: 'modules_health-monitor.js',
        destino: path.join(this.baseDir, 'modules', 'health-monitor.js'),
        nome: 'Health Monitor'
      },
      {
        origem: 'modules_backup-manager.js',
        destino: path.join(this.baseDir, 'modules', 'backup-manager.js'),
        nome: 'Backup Manager'
      },
      {
        origem: 'modules_google-ads-integration.js',
        destino: path.join(this.baseDir, 'modules', 'google-ads-integration.js'),
        nome: 'Google Ads Integration'
      },
      {
        origem: 'modules_facebook-ads-integration.js',
        destino: path.join(this.baseDir, 'modules', 'facebook-ads-integration.js'),
        nome: 'Facebook Ads Integration'
      }
    ];

    modulos.forEach(mod => {
      if (fs.existsSync(mod.origem)) {
        fs.copyFileSync(mod.origem, mod.destino);
        log.success(`${mod.nome} copiado`);
        this.modulosCopiados++;
      } else {
        log.warning(`${mod.nome} não encontrado em ${mod.origem}`);
      }
    });
  }

  /**
   * PASSO 4: Instalar dependências
   */
  instalarDependencias() {
    log.section('PASSO 4: Instalando Dependências');

    try {
      const packageJsonPath = path.join(this.baseDir, 'package.json');
      let packageJson = {};

      if (fs.existsSync(packageJsonPath)) {
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      } else {
        packageJson = {
          name: 'hannah-3.0',
          version: '1.0.0',
          main: 'server.js',
          scripts: {
            start: 'node server.js',
            test: 'node TESTE_INTEGRACAO_ADS.js'
          }
        };
      }

      // Verificar axios
      if (packageJson.dependencies && packageJson.dependencies.axios) {
        log.success('axios já está em package.json');
      } else {
        log.info('Instalando axios...');
        execSync('npm install axios', { stdio: 'inherit' });
        log.success('axios instalado');
      }
    } catch (error) {
      log.error(`Erro ao instalar dependências: ${error.message}`);
      this.success = false;
    }
  }

  /**
   * PASSO 5: Criar/atualizar server.js
   */
  criarServer() {
    log.section('PASSO 5: Criando/Atualizando server.js');

    const serverPath = path.join(this.baseDir, 'server.js');

    const serverContent = `const express = require('express');
const path = require('path');
require('dotenv').config();

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
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      googleAdsReport: '/api/google-ads/report',
      facebookAdsReport: '/api/facebook-ads/report',
      backupManual: '/api/backup/manual'
    }
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
  console.error('[Hannah] Error:', err);
  res.status(500).json({
    error: err.message,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log('\\n' + '='.repeat(50));
  console.log('[Hannah 3.0] Server running on port', PORT);
  console.log('='.repeat(50));
  console.log('[Hannah 3.0] Health: http://localhost:\${PORT}/health');
  console.log('[Hannah 3.0] Google Ads: http://localhost:\${PORT}/api/google-ads/report');
  console.log('[Hannah 3.0] Facebook Ads: http://localhost:\${PORT}/api/facebook-ads/report');
  console.log('='.repeat(50) + '\\n');
});

module.exports = app;
`;

    if (!fs.existsSync(serverPath)) {
      fs.writeFileSync(serverPath, serverContent, 'utf8');
      log.success('server.js criado');
    } else {
      log.success('server.js já existe');
      log.info('Verifique se contém os requires dos módulos');
    }
  }

  /**
   * PASSO 6: Criar .env
   */
  criarEnv() {
    log.section('PASSO 6: Configurando Variáveis de Ambiente');

    const envPath = path.join(this.baseDir, '.env');

    const envContent = `# Google Ads
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
NODE_ENV=development
`;

    if (!fs.existsSync(envPath)) {
      fs.writeFileSync(envPath, envContent, 'utf8');
      log.success('.env criado');
      log.warning('⚠ IMPORTANTE: Preencha as API keys em .env');
    } else {
      log.success('.env já existe');
      log.info('Verifique se as API keys estão preenchidas');
    }
  }

  /**
   * PASSO 7: Criar .gitignore
   */
  criarGitignore() {
    log.section('PASSO 7: Atualizando .gitignore');

    const gitignorePath = path.join(this.baseDir, '.gitignore');
    const gitignoreContent = `node_modules/
.env
.env.local
.env.*.local
backup/
logs/
*.log
.DS_Store
.vscode/
*.swp
`;

    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, gitignoreContent, 'utf8');
      log.success('.gitignore criado');
    } else {
      log.success('.gitignore já existe');
    }
  }

  /**
   * PASSO 8: Criar config/leads.json
   */
  criarDatabase() {
    log.section('PASSO 8: Criando Banco de Dados de Leads');

    const dbPath = path.join(this.baseDir, 'config', 'leads.json');

    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify([], null, 2), 'utf8');
      log.success('config/leads.json criado (vazio)');
    } else {
      log.success('config/leads.json já existe');
    }
  }

  /**
   * PASSO 9: Resumo final
   */
  resumoFinal() {
    log.section('✨ SETUP AUTOMÁTICO CONCLUÍDO!');

    if (this.success) {
      console.log(`${colors.green}${colors.bold}Próximos Passos:${colors.reset}\n`);

      console.log(`1️⃣  Preencher variáveis de ambiente:`);
      console.log(`   ${colors.cyan}nano .env${colors.reset} (ou abra com seu editor)\n`);

      console.log(`2️⃣  Instalar dotenv (para carregar .env):`);
      console.log(`   ${colors.cyan}npm install dotenv${colors.reset}\n`);

      console.log(`3️⃣  Testar localmente:`);
      console.log(`   ${colors.cyan}npm start${colors.reset}\n`);

      console.log(`4️⃣  Em outro terminal, validar integração:`);
      console.log(`   ${colors.cyan}node TESTE_INTEGRACAO_ADS.js${colors.reset}\n`);

      console.log(`5️⃣  Fazer commit:`);
      console.log(`   ${colors.cyan}git add .${colors.reset}`);
      console.log(`   ${colors.cyan}git commit -m "feat: add hannah 3.0 modules"${colors.reset}`);
      console.log(`   ${colors.cyan}git push origin main${colors.reset}\n`);

      console.log(`6️⃣  Deploy no Railway:`);
      console.log(`   ${colors.cyan}railway deploy${colors.reset}\n`);

      console.log(`${colors.green}Documentação disponível:${colors.reset}`);
      console.log(`  • COMECE_AQUI_IMPLEMENTACAO.md`);
      console.log(`  • INSTRUCOES_IMPLEMENTACAO_COMPLETA.md`);
      console.log(`  • RELATORIO_CAPACIDADES_HANNAH_3.0.md\n`);

      console.log(`${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
      console.log(`${colors.green}Sistema pronto para uso!${colors.reset} 🚀\n`);
    } else {
      console.log(`${colors.red}Alguns passos falharam. Verifique os erros acima.${colors.reset}\n`);
    }
  }

  /**
   * Executar todo o setup
   */
  async executar() {
    console.log(`\n${colors.cyan}╔════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║   SETUP AUTOMÁTICO - HANNAH 3.0            ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════╝${colors.reset}\n`);

    try {
      this.verificarPreRequisitos();
      this.criarPastas();
      this.copiarModulos();
      this.instalarDependencias();
      this.criarServer();
      this.criarEnv();
      this.criarGitignore();
      this.criarDatabase();
      this.resumoFinal();
    } catch (error) {
      log.error(`Erro fatal: ${error.message}`);
      process.exit(1);
    }
  }
}

// Executar setup
const setup = new SetupAutomatico();
setup.executar().catch(err => {
  log.error(`Erro: ${err.message}`);
  process.exit(1);
});
