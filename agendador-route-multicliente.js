const express = require('express');
const { GerenciadorClientes, AgendadorLimpezaMultiCliente } = require('./agendador-multicliente');

const router = express.Router();
const gerenciador = new GerenciadorClientes('./dados-clientes');
const agendador = new AgendadorLimpezaMultiCliente(gerenciador);

// Middleware para validar clienteId
router.use((req, res, next) => {
  const { clienteId } = req.body || req.query || req.params;
  if (!clienteId) {
    return res.status(400).json({ erro: 'clienteId é obrigatório' });
  }
  next();
});

// POST /api/multicliente/cliente - Criar novo cliente
router.post('/cliente', (req, res) => {
  try {
    const { nome, telefone, email, endereco, cidade, status, valor } = req.body;
    
    if (!nome || !telefone || !email) {
      return res.status(400).json({ erro: 'Nome, telefone e email são obrigatórios' });
    }

    const cliente = gerenciador.adicionarCliente({
      nome, telefone, email, endereco, cidade, status, valor
    });

    res.json({ sucesso: true, cliente });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// GET /api/multicliente/clientes - Listar todos os clientes
router.get('/clientes', (req, res) => {
  try {
    const clientes = gerenciador.listarClientes();
    res.json({ clientes });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// GET /api/multicliente/cliente/:clienteId - Obter cliente específico
router.get('/cliente/:clienteId', (req, res) => {
  try {
    const cliente = gerenciador.obterCliente(req.params.clienteId);
    if (!cliente) {
      return res.status(404).json({ erro: 'Cliente não encontrado' });
    }
    res.json({ cliente });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// POST /api/multicliente/casa - Adicionar casa para cliente
router.post('/casa', (req, res) => {
  try {
    const { clienteId, id, endereco, lat, lon, tipo } = req.body;

    if (!endereco || lat === undefined || lon === undefined || !tipo) {
      return res.status(400).json({ erro: 'Endereço, lat, lon e tipo são obrigatórios' });
    }

    const casa = gerenciador.adicionarCasa(clienteId, { id, endereco, lat, lon, tipo });
    
    if (!casa) {
      return res.status(404).json({ erro: 'Cliente não encontrado' });
    }

    res.json({ sucesso: true, casa });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// GET /api/multicliente/casas/:clienteId - Obter casas de um cliente
router.get('/casas/:clienteId', (req, res) => {
  try {
    const casas = gerenciador.obterCasas(req.params.clienteId);
    res.json({ casas });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// POST /api/multicliente/agendar - Agendar casas para um cliente
router.post('/agendar', (req, res) => {
  try {
    const { clienteId } = req.body;

    const resultado = agendador.agendar(clienteId);
    
    if (resultado.erro) {
      return res.status(404).json(resultado);
    }

    res.json({ sucesso: true, agendamento: resultado });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// GET /api/multicliente/agendamentos/:clienteId - Obter agendamentos de um cliente
router.get('/agendamentos/:clienteId', (req, res) => {
  try {
    const agendamentos = gerenciador.obterAgendamentos(req.params.clienteId);
    res.json({ agendamentos });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// PUT /api/multicliente/config/:clienteId - Atualizar configuração do cliente
router.put('/config/:clienteId', (req, res) => {
  try {
    const cliente = gerenciador.obterCliente(req.params.clienteId);
    
    if (!cliente) {
      return res.status(404).json({ erro: 'Cliente não encontrado' });
    }

    const { numCarros, maxHorariosRepetidos, maxCasasHorario, tempoLimpezaRegular, tempoDeepClean, maxDeepCleanDia, maxLimpezaRegularDia } = req.body;

    if (numCarros) cliente.config.numCarros = numCarros;
    if (maxHorariosRepetidos) cliente.config.maxHorariosRepetidos = maxHorariosRepetidos;
    if (maxCasasHorario) cliente.config.maxCasasHorario = maxCasasHorario;
    if (tempoLimpezaRegular) cliente.config.tempoLimpezaRegular = tempoLimpezaRegular;
    if (tempoDeepClean) cliente.config.tempoDeepClean = tempoDeepClean;
    if (maxDeepCleanDia) cliente.config.maxDeepCleanDia = maxDeepCleanDia;
    if (maxLimpezaRegularDia) cliente.config.maxLimpezaRegularDia = maxLimpezaRegularDia;

    gerenciador.salvarClientes();
    res.json({ sucesso: true, config: cliente.config });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

module.exports = router;
