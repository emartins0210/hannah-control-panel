const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'seu_secret_aqui_MUDE_EM_PRODUCAO';

// ========== MIDDLEWARE ==========
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.static('./'));

// ========== CARREGA DADOS ==========
function carregarClientes() {
  try {
    const data = fs.readFileSync('./dados-clientes/clientes.json', 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Erro ao carregar clientes:', err);
    return {};
  }
}

function carregarUsuarios() {
  try {
    const data = fs.readFileSync('./usuarios.json', 'utf8');
    return JSON.parse(data).usuarios;
  } catch (err) {
    console.error('Erro ao carregar usuários:', err);
    return [];
  }
}

let usuarios = carregarUsuarios();
let clientesDb = carregarClientes();

// ========== MIDDLEWARE DE AUTENTICAÇÃO ==========
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ erro: 'Token inválido ou expirado' });
  }
}

// ========== ROTAS DE AUTENTICAÇÃO ==========

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
  }

  const usuario = usuarios.find(u => u.email === email && u.senha === senha);

  if (!usuario) {
    return res.status(401).json({ erro: 'Email ou senha inválidos' });
  }

  const token = jwt.sign({
    id: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    tipo: usuario.tipo,
    clienteId: usuario.clienteId
  }, JWT_SECRET, { expiresIn: '30d' });

  res.json({
    sucesso: true,
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo
    }
  });
});

// Verificar Token
app.get('/api/auth/verify', verificarToken, (req, res) => {
  res.json({
    valido: true,
    usuario: req.usuario
  });
});

// ========== ROTAS PROTEGIDAS ==========

// Obter clientes (admin vê todos, cliente vê apenas seu)
app.get('/api/completo/clientes', verificarToken, (req, res) => {
  try {
    clientesDb = carregarClientes();
    
    if (req.usuario.tipo === 'admin') {
      // Admin vê todos
      const clientesArray = Object.values(clientesDb);
      return res.json({
        sucesso: true,
        clientes: clientesArray,
        total: clientesArray.length
      });
    } else if (req.usuario.tipo === 'cliente') {
      // Cliente vê apenas seu
      const clienteId = req.usuario.clienteId;
      const clienteData = clientesDb[clienteId];

      if (!clienteData) {
        return res.status(404).json({ erro: 'Cliente não encontrado' });
      }

      return res.json({
        sucesso: true,
        clientes: [clienteData],
        total: 1
      });
    }

    res.status(403).json({ erro: 'Tipo de usuário inválido' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar clientes', detalhes: err.message });
  }
});

// Obter cliente específico
app.get('/api/completo/cliente/:id', verificarToken, (req, res) => {
  try {
    const clienteId = req.params.id;
    clientesDb = carregarClientes();
    const cliente = clientesDb[clienteId];

    if (!cliente) {
      return res.status(404).json({ erro: 'Cliente não encontrado' });
    }

    // Validar acesso
    if (req.usuario.tipo === 'cliente' && req.usuario.clienteId !== clienteId) {
      return res.status(403).json({ erro: 'Você não tem acesso a este cliente' });
    }

    res.json({ sucesso: true, cliente });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar cliente', detalhes: err.message });
  }
});

// Adicionar cliente (apenas admin)
app.post('/api/completo/cliente', verificarToken, (req, res) => {
  if (req.usuario.tipo !== 'admin') {
    return res.status(403).json({ erro: 'Apenas administrador pode adicionar clientes' });
  }

  try {
    const novoCliente = req.body;
    const clienteId = `cliente_${Date.now()}`;
    
    novoCliente.id = clienteId;
    novoCliente.dataCriacao = new Date().toISOString();
    novoCliente.agendamentos = [];
    novoCliente.casas = [];

    clientesDb[clienteId] = novoCliente;
    
    fs.writeFileSync('./dados-clientes/clientes.json', JSON.stringify(clientesDb, null, 2));

    res.json({
      sucesso: true,
      mensagem: 'Cliente adicionado com sucesso',
      cliente: novoCliente
    });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao adicionar cliente', detalhes: err.message });
  }
});

// Obter equipes
app.get('/api/completo/equipes', verificarToken, (req, res) => {
  const equipes = [
    { id: 'team-1', nome: '🟦 Equipe 1', cor: '#3b82f6' },
    { id: 'team-2', nome: '🟩 Equipe 2', cor: '#10b981' },
    { id: 'team-3', nome: '🟪 Equipe 3', cor: '#8b5cf6' }
  ];

  res.json({ sucesso: true, equipes });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    autenticacao: 'ativada'
  });
});

// Raiz - Redireciona para login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'painel-login.html'));
});

// ========== SERVIDOR INICIANDO ==========
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 SERVIDOR FABÍOLA SERVICES - COM AUTENTICAÇÃO');
  console.log('='.repeat(60));
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
  console.log(`🔐 Autenticação: ATIVADA (JWT)`);
  console.log(`📊 API: http://localhost:${PORT}/api/completo`);
  console.log(`\n📝 Credenciais Demo:`);
  console.log(`   Admin: fabiola@lopeservices.com / admin123456`);
  console.log(`   Cliente: contact@aventine.com / aventine123`);
  console.log('='.repeat(60) + '\n');
});

module.exports = app;
