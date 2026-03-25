const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const agendadorRouter = require('./agendador-route-multicliente');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Servir arquivos estáticos
app.use(express.static('./'));

// Rotas da API
app.use('/api/multicliente', agendadorRouter);

// Rota raiz - servir painel
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'painel-agendador-multicliente.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📊 Painel disponível em http://localhost:${PORT}`);
  console.log(`📚 Documentação da API: http://localhost:${PORT}/api/multicliente`);
});
