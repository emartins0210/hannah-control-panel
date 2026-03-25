const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const agendadorRouter = require('./agendador-route-completo');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ========== MIDDLEWARE ==========

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// CORS - Permitir acesso de qualquer lugar (será restringido em produção)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Servir arquivos estáticos
app.use(express.static('./'));

// Logger simples
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ========== ROTAS ==========

// API Routes
app.use('/api/completo', agendadorRouter);

// Raiz - Serve painel
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'painel-agendador-equipes.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

// Info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    nome: 'Agendador Fabíola Services',
    versao: '2.0.0',
    ambiente: NODE_ENV,
    endpoints: [
      'GET  /api/completo/clientes',
      'GET  /api/completo/cliente/:id',
      'POST /api/completo/cliente',
      'GET  /api/completo/equipes',
      'GET  /api/completo/equipe/:id',
      'POST /api/completo/casa',
      'POST /api/completo/agendar',
      'POST /api/completo/agendar-equipe'
    ]
  });
});

// ========== TRATAMENTO DE ERROS ==========

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

app.use((erro, req, res, next) => {
  console.error('Erro:', erro);
  res.status(500).json({ erro: erro.message || 'Erro interno do servidor' });
});

// ========== INICIAR SERVIDOR ==========

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 AGENDADOR FABÍOLA SERVICES - SERVIDOR INICIADO');
  console.log('='.repeat(70));
  console.log(`\n📊 Painel:       http://localhost:${PORT}`);
  console.log(`🔌 API:          http://localhost:${PORT}/api/completo`);
  console.log(`💚 Health:       http://localhost:${PORT}/health`);
  console.log(`ℹ️  Informações:  http://localhost:${PORT}/api/info`);
  console.log(`\n📁 Dados:        ./dados-clientes/`);
  console.log(`🌍 Ambiente:     ${NODE_ENV}`);
  console.log('\n' + '='.repeat(70) + '\n');
});

module.exports = app;
