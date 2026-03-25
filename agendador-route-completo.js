const express = require('express');
const { GerenciadorClientes, AgendadorLimpezaCompleto } = require('./agendador-completo');

const router = express.Router();
const gerenciador = new GerenciadorClientes('./dados-clientes');
const agendador = new AgendadorLimpezaCompleto(gerenciador);

// ========== EQUIPES ==========

router.get('/equipes', (req, res) => {
  try {
    const equipes = gerenciador.equipes.obterEquipes();
    res.json({ equipes });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

router.get('/equipe/:equipeId', (req, res) => {
  try {
    const equipe = gerenciador.equipes.obterEquipe(req.params.equipeId);
    if (!equipe) {
      return res.status(404).json({ erro: 'Equipe não encontrada' });
    }
    const clientes = gerenciador.listarClientesPorEquipe(req.params.equipeId);
    res.json({ equipe, clientes });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// ========== CLIENTES ==========

router.post('/cliente', (req, res) => {
  try {
    const { nome, telefone, email, endereco, cidade, estado, zip, status, valor, frequencia, diagemana, equipeId } = req.body;

    if (!nome || !telefone || !email) {
      return res.status(400).json({ erro: 'Nome, telefone e email são obrigatórios' });
    }

    const cliente = gerenciador.adicionarCliente({
      nome, telefone, email, endereco, cidade, estado, zip, status, valor, frequencia, diagemana, equipeId
    });

    res.json({ sucesso: true, cliente });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

router.get('/clientes', (req, res) => {
  try {
    const clientes = gerenciador.listarClientes();
    res.json({ clientes });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

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

router.put('/cliente/:clienteId/equipe', (req, res) => {
  try {
    const { equipeId } = req.body;
    const resultado = gerenciador.atualizarEquipeCliente(req.params.clienteId, equipeId);
    
    if (!resultado) {
      return res.status(404).json({ erro: 'Cliente não encontrado' });
    }

    const cliente = gerenciador.obterCliente(req.params.clienteId);
    res.json({ sucesso: true, cliente });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// ========== CASAS ==========

router.post('/casa', (req, res) => {
  try {
    const { clienteId, endereco, lat, lon, tipo } = req.body;

    if (!endereco || lat === undefined || lon === undefined || !tipo) {
      return res.status(400).json({ erro: 'Endereço, lat, lon e tipo são obrigatórios' });
    }

    const casa = gerenciador.adicionarCasa(clienteId, { endereco, lat, lon, tipo });

    if (!casa) {
      return res.status(404).json({ erro: 'Cliente não encontrado' });
    }

    res.json({ sucesso: true, casa });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

router.get('/casas/:clienteId', (req, res) => {
  try {
    const casas = gerenciador.obterCasas(req.params.clienteId);
    res.json({ casas });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// ========== AGENDAMENTOS ==========

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

router.get('/agendamentos/:clienteId', (req, res) => {
  try {
    const agendamentos = gerenciador.obterAgendamentos(req.params.clienteId);
    res.json({ agendamentos });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

router.post('/agendar-equipe', (req, res) => {
  try {
    const { equipeId } = req.body;
    const clientes = gerenciador.listarClientesPorEquipe(equipeId);
    const agendamentos = [];

    for (const cliente of clientes) {
      const resultado = agendador.agendar(cliente.id);
      if (!resultado.erro) {
        agendamentos.push(resultado);
      }
    }

    res.json({ sucesso: true, agendamentos });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// ========== CONFIGURAÇÕES ==========

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

// ========== EXPORTAÇÃO ==========

router.get('/exportar-json', (req, res) => {
  try {
    const clientes = gerenciador.listarClientes();
    const equipes = gerenciador.equipes.obterEquipes();

    res.json({
      clientes,
      equipes,
      exportadoEm: new Date().toISOString()
    });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

module.exports = router;
