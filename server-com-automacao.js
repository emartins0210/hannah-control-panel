/**
 * SERVIDOR COMPLETO COM AUTOMAÇÃO INTELIGENTE
 * Express server com:
 * - Roteamento de agendador completo
 * - Roteamento de automação inteligente
 * - Sincronização com Gestor Financeiro
 * - Notificações automáticas
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

// Importar rotas
const RotasAgendadorCompleto = require('./agendador-route-completo');
const RotasAutomacaoInteligente = require('./routes-automacao-inteligente');

// Inicializar aplicação
const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));

// Body parser
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Static files
app.use(express.static('public'));

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// API Key middleware (opcional)
const verificarApiKey = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(401).json({ erro: 'API Key inválida' });
    }
  }
  next();
};

// ============================================================
// ROTAS DE AUTOMAÇÃO INTELIGENTE
// ============================================================

// Rotas de automação (com proteção opcional)
const rotasAutomacao = new RotasAutomacaoInteligente();
app.use('/api/automacao', verificarApiKey, rotasAutomacao.obterRouter());

// ============================================================
// ROTAS DO AGENDADOR COMPLETO
// ============================================================

// Rotas do agendador original
const rotasAgendador = new RotasAgendadorCompleto();
app.use('/api/completo', rotasAgendador.obterRouter());

// ============================================================
// ROTAS DE SAÚDE E STATUS
// ============================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Info
app.get('/api/info', (req, res) => {
  res.json({
    sistema: 'Agendador de Limpeza Fabíola Services',
    versao: '3.0.0',
    modulos: [
      'Agendador Completo',
      'Automação Inteligente',
      'Google Maps Integration',
      'WhatsApp Notifications',
      'Email Notifications',
      'Gestor Financeiro Sync'
    ],
    endpoints: {
      agendador: '/api/completo',
      automacao: '/api/automacao',
      status: '/api/info',
      health: '/health'
    }
  });
});

// ============================================================
// ROTAS DE DASHBOARD
// ============================================================

// Dashboard principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'painel-agendador-equipes.html'));
});

// Dashboard alternativo (se existir)
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'painel-agendador-equipes.html'));
});

// ============================================================
// WEBHOOKS (Integrações externas)
// ============================================================

// Webhook do Gestor Financeiro (redirecionado para automação)
app.post('/webhooks/gestor-financeiro', (req, res) => {
  res.redirect(307, '/api/automacao/webhook/gestor-financeiro');
});

// Webhook do WhatsApp
app.post('/webhooks/whatsapp', (req, res) => {
  res.redirect(307, '/api/automacao/webhook/whatsapp');
});

// ============================================================
// EXPORTAÇÃO DE DADOS
// ============================================================

// Exportar todos os dados (JSON)
app.get('/api/exportar-json', (req, res) => {
  const fs = require('fs');
  const pathClientes = path.join(__dirname, 'dados-clientes', 'clientes.json');
  const pathEquipes = path.join(__dirname, 'dados-clientes', 'equipes.json');

  try {
    const clientes = JSON.parse(fs.readFileSync(pathClientes, 'utf8'));
    const equipes = JSON.parse(fs.readFileSync(pathEquipes, 'utf8'));

    res.json({
      exportacao: {
        data: new Date().toISOString(),
        totalClientes: clientes.length,
        totalEquipes: equipes.length
      },
      clientes,
      equipes
    });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// ============================================================
// TRATAMENTO DE ERROS
// ============================================================

// 404
app.use((req, res) => {
  res.status(404).json({
    erro: 'Rota não encontrada',
    caminho: req.path,
    metodo: req.method,
    dica: 'Verifique /api/info para endpoints disponíveis'
  });
});

// Erro geral
app.use((erro, req, res, next) => {
  console.error('Erro:', erro);
  res.status(500).json({
    erro: 'Erro interno do servidor',
    mensagem: process.env.NODE_ENV === 'development' ? erro.message : 'Erro desconhecido'
  });
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║     🚀 FABÍOLA SERVICES - AGENDADOR INTELIGENTE 3.0      ║
║                                                            ║
║  ✅ Servidor iniciado com sucesso                        ║
║  🌐 URL: http://localhost:${PORT}                        ║
║  📍 Ambiente: ${NODE_ENV}                             ║
║                                                            ║
║  📚 APIs disponíveis:                                     ║
║     • Agendador: /api/completo                            ║
║     • Automação: /api/automacao                           ║
║     • Dashboard: /                                        ║
║                                                            ║
║  📖 Documentação: /api/info                               ║
║  ❤️  Health: /health                                      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);

  // Mostrar módulos carregados
  console.log('Módulos carregados:');
  console.log('  ✓ Agendador Completo');
  console.log('  ✓ Automação Inteligente');
  if (process.env.GOOGLE_MAPS_API_KEY) console.log('  ✓ Google Maps Integration');
  if (process.env.WHATSAPP_BUSINESS_TOKEN) console.log('  ✓ WhatsApp Notifications');
  if (process.env.SMTP_HOST) console.log('  ✓ Email Notifications');
  if (process.env.GESTOR_FINANCEIRO_URL) console.log('  ✓ Gestor Financeiro Sync');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido, encerrando...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT recebido, encerrando...');
  process.exit(0);
});

module.exports = app;
