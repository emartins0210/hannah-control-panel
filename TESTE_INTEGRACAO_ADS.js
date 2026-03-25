/**
 * Script de Teste - Validação de Integração
 * 
 * Este script testa se todos os 4 módulos estão funcionando:
 * - Health Monitor
 * - Backup Manager
 * - Google Ads Integration
 * - Facebook Ads Integration
 * 
 * Uso:
 * node TESTE_INTEGRACAO_ADS.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}\n`)
};

class IntegrationTester {
  constructor() {
    this.baseUrl = process.env.HANNAH_URL || 'http://localhost:3000';
    this.results = {
      healthMonitor: false,
      backupManager: false,
      googleAds: false,
      facebookAds: false
    };
    this.errors = [];
  }

  /**
   * Teste 1: Health Monitor
   */
  async testHealthMonitor() {
    log.section('TESTE 1: Health Monitor');
    
    try {
      const response = await axios.get(`${this.baseUrl}/health`);
      
      if (response.status === 200 && response.data.status) {
        log.success(`Health Monitor respondendo`);
        log.info(`Status: ${response.data.status}`);
        log.info(`Uptime: ${response.data.uptime}`);
        log.info(`CPU: ${response.data.cpu}`);
        log.info(`Memory: ${response.data.memory}`);
        this.results.healthMonitor = true;
      } else {
        log.error('Health Monitor retornou resposta inválida');
        this.errors.push('Health Monitor: resposta inválida');
      }
    } catch (error) {
      log.error(`Health Monitor: ${error.message}`);
      this.errors.push(`Health Monitor: ${error.message}`);
      
      if (error.code === 'ECONNREFUSED') {
        log.warning('Servidor não está rodando em ' + this.baseUrl);
      }
    }
  }

  /**
   * Teste 2: Backup Manager
   */
  async testBackupManager() {
    log.section('TESTE 2: Backup Manager');
    
    try {
      // Testar criação manual de backup
      const response = await axios.post(`${this.baseUrl}/api/backup/manual`);
      
      if (response.status === 200 && response.data.success) {
        log.success('Backup criado com sucesso');
        log.info(`Arquivo: ${response.data.backupFile}`);
        log.info(`Tamanho: ${response.data.size}`);
        this.results.backupManager = true;
      } else {
        log.error('Backup retornou resposta inválida');
        this.errors.push('Backup Manager: resposta inválida');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        log.warning('Endpoint de backup não encontrado');
        log.info('Dica: Adicione o endpoint ao server.js');
        this.errors.push('Backup Manager: endpoint não configurado');
      } else {
        log.error(`Backup Manager: ${error.message}`);
        this.errors.push(`Backup Manager: ${error.message}`);
      }
    }
  }

  /**
   * Teste 3: Google Ads API
   */
  async testGoogleAds() {
    log.section('TESTE 3: Google Ads Integration');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/google-ads/report`);
      
      if (response.status === 200 && response.data.campaigns) {
        log.success('Google Ads API conectado');
        log.info(`Total de campanhas: ${response.data.campaigns.length}`);
        log.info(`Gasto total: $${response.data.totalSpent}`);
        log.info(`Total de cliques: ${response.data.totalClicks}`);
        log.info(`Total de conversões: ${response.data.totalConversions}`);
        
        if (response.data.campaigns.length > 0) {
          log.info('\nCampanhas:');
          response.data.campaigns.slice(0, 3).forEach(campaign => {
            console.log(`  • ${campaign.name}: $${campaign.spend} (${campaign.clicks} cliques)`);
          });
        }
        
        this.results.googleAds = true;
      } else {
        log.error('Google Ads retornou resposta inválida');
        this.errors.push('Google Ads: resposta inválida');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        log.warning('Endpoint de Google Ads não encontrado');
        log.info('Dica: Adicione o endpoint ao server.js');
        this.errors.push('Google Ads: endpoint não configurado');
      } else if (error.message.includes('401')) {
        log.warning('Erro de autenticação com Google Ads');
        log.info('Dica: Verifique API keys no .env');
        this.errors.push('Google Ads: autenticação falhou');
      } else {
        log.error(`Google Ads: ${error.message}`);
        this.errors.push(`Google Ads: ${error.message}`);
      }
    }
  }

  /**
   * Teste 4: Facebook Ads API
   */
  async testFacebookAds() {
    log.section('TESTE 4: Facebook Ads Integration');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/facebook-ads/report`);
      
      if (response.status === 200 && response.data.campaigns) {
        log.success('Facebook Ads API conectado');
        log.info(`Total de campanhas: ${response.data.campaigns.length}`);
        log.info(`Gasto total: $${response.data.totalSpent}`);
        log.info(`Total de impressões: ${response.data.totalImpressions}`);
        log.info(`Total de cliques: ${response.data.totalClicks}`);
        
        if (response.data.campaigns.length > 0) {
          log.info('\nCampanhas:');
          response.data.campaigns.slice(0, 3).forEach(campaign => {
            console.log(`  • ${campaign.name}: $${campaign.spend} (${campaign.impressions} impressões)`);
          });
        }
        
        this.results.facebookAds = true;
      } else {
        log.error('Facebook Ads retornou resposta inválida');
        this.errors.push('Facebook Ads: resposta inválida');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        log.warning('Endpoint de Facebook Ads não encontrado');
        log.info('Dica: Adicione o endpoint ao server.js');
        this.errors.push('Facebook Ads: endpoint não configurado');
      } else if (error.message.includes('401')) {
        log.warning('Erro de autenticação com Facebook Ads');
        log.info('Dica: Verifique API keys no .env');
        this.errors.push('Facebook Ads: autenticação falhou');
      } else {
        log.error(`Facebook Ads: ${error.message}`);
        this.errors.push(`Facebook Ads: ${error.message}`);
      }
    }
  }

  /**
   * Testar arquivo de configuração
   */
  async testConfiguration() {
    log.section('CONFIGURAÇÃO DO SISTEMA');
    
    // Verificar .env
    if (fs.existsSync('.env')) {
      log.success('.env existe');
    } else {
      log.error('.env não encontrado');
      this.errors.push('Arquivo .env não encontrado');
    }

    // Verificar modules
    const modulesDir = './modules';
    if (fs.existsSync(modulesDir)) {
      const modules = fs.readdirSync(modulesDir);
      log.success(`Pasta modules existe (${modules.length} módulos)`);
      
      const requiredModules = [
        'health-monitor.js',
        'backup-manager.js',
        'google-ads-integration.js',
        'facebook-ads-integration.js'
      ];
      
      requiredModules.forEach(mod => {
        if (modules.includes(mod)) {
          log.success(`  ✓ ${mod}`);
        } else {
          log.warning(`  ✗ ${mod} não encontrado`);
          this.errors.push(`Módulo ${mod} não encontrado`);
        }
      });
    } else {
      log.error('Pasta modules não encontrada');
      this.errors.push('Pasta modules não existe');
    }

    // Verificar config
    if (fs.existsSync('./config/leads.json')) {
      const leads = JSON.parse(fs.readFileSync('./config/leads.json', 'utf8'));
      log.success(`config/leads.json existe (${leads.length} leads)`);
    } else {
      log.warning('config/leads.json não encontrado (será criado automaticamente)');
    }

    // Verificar backup
    if (fs.existsSync('./backup')) {
      const backups = fs.readdirSync('./backup');
      log.success(`Pasta backup existe (${backups.length} backups)`);
    } else {
      log.warning('Pasta backup não existe (será criada ao fazer primeiro backup)');
    }
  }

  /**
   * Exibir resumo dos testes
   */
  printSummary() {
    log.section('RESUMO DOS TESTES');
    
    const passed = Object.values(this.results).filter(r => r).length;
    const total = Object.keys(this.results).length;
    const percentage = (passed / total) * 100;
    
    console.log(`Testes Passando: ${passed}/${total} (${percentage.toFixed(1)}%)\n`);
    
    if (this.results.healthMonitor) {
      log.success('Health Monitor');
    } else {
      log.error('Health Monitor');
    }
    
    if (this.results.backupManager) {
      log.success('Backup Manager');
    } else {
      log.error('Backup Manager');
    }
    
    if (this.results.googleAds) {
      log.success('Google Ads Integration');
    } else {
      log.error('Google Ads Integration');
    }
    
    if (this.results.facebookAds) {
      log.success('Facebook Ads Integration');
    } else {
      log.error('Facebook Ads Integration');
    }
    
    if (this.errors.length > 0) {
      log.section('PROBLEMAS ENCONTRADOS');
      this.errors.forEach((err, i) => {
        console.log(`${i + 1}. ${err}`);
      });
      log.info('Veja INSTRUCOES_IMPLEMENTACAO_COMPLETA.md para soluções');
    } else {
      log.section('PARABÉNS! 🎉');
      log.success('Todos os módulos estão funcionando corretamente!');
      log.success('Hannah 3.0 está pronto para escalar!');
    }
  }

  /**
   * Executar todos os testes
   */
  async runAll() {
    console.log('\n' + colors.cyan + '╔════════════════════════════════════════════╗' + colors.reset);
    console.log(colors.cyan + '║   TESTE DE INTEGRAÇÃO - HANNAH 3.0          ║' + colors.reset);
    console.log(colors.cyan + '╚════════════════════════════════════════════╝' + colors.reset + '\n');
    
    log.info(`Testando servidor em: ${this.baseUrl}\n`);
    
    await this.testConfiguration();
    await this.testHealthMonitor();
    await this.testBackupManager();
    await this.testGoogleAds();
    await this.testFacebookAds();
    
    this.printSummary();
  }
}

// Executar testes
const tester = new IntegrationTester();
tester.runAll().catch(err => {
  log.error(`Erro fatal: ${err.message}`);
  process.exit(1);
});
