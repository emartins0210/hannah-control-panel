/**
 * ROTAS DO AGENDADOR DE LIMPEZA
 * Para integrar ao gestorfinanceiropro.com.br
 * 
 * Uso:
 * const agendadorRouter = require('./agendador-route');
 * app.use('/api/agendador', agendadorRouter);
 */

const express = require('express');
const router = express.Router();

class AgendadorLimpeza {
  constructor(config = {}) {
    this.config = {
      tempoRegular: config.tempoRegular || 160,
      tempoDeep: config.tempoDeep || 270,
      intervaloMinimo: config.intervaloMinimo || 160,
      maxDeepPorCarro: config.maxDeepPorCarro || 2,
      maxRegularPorCarro: config.maxRegularPorCarro || 4,
      numCarros: config.numCarros || 3,
      horarios: config.horarios || ['08:00', '10:40', '13:20', '16:00'],
      coordPalmBay: config.coordPalmBay || { lat: 28.0436, lon: -80.3853 }
    };
  }

  calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  agendar(casas) {
    // Ordenar casas
    const casasOrdenadas = [...casas].sort((a, b) => {
      const distA = this.calcularDistancia(
        a.lat,
        a.lon,
        this.config.coordPalmBay.lat,
        this.config.coordPalmBay.lon
      );
      const distB = this.calcularDistancia(
        b.lat,
        b.lon,
        this.config.coordPalmBay.lat,
        this.config.coordPalmBay.lon
      );

      if (a.tipo !== b.tipo) {
        return a.tipo === 'Deep' ? -1 : 1;
      }
      return distA - distB;
    });

    // Criar carros
    const carros = Array(this.config.numCarros)
      .fill()
      .map((_, i) => ({
        id: i + 1,
        agendamentos: [],
        tempoTotal: 0,
        deepCount: 0,
        regularCount: 0
      }));

    // Alocar casas
    for (const casa of casasOrdenadas) {
      let melhorCarro = null;
      let menorTrabalho = Infinity;

      for (const carro of carros) {
        if (casa.tipo === 'Deep' && carro.deepCount >= this.config.maxDeepPorCarro) continue;
        if (casa.tipo === 'Regular' && carro.regularCount >= this.config.maxRegularPorCarro) continue;

        const horariosUnicos = new Set(carro.agendamentos.map((a) => a.horario)).size;
        if (horariosUnicos >= 3) continue;

        if (carro.tempoTotal < menorTrabalho) {
          menorTrabalho = carro.tempoTotal;
          melhorCarro = carro;
        }
      }

      if (!melhorCarro) continue;

      const tempo = casa.tipo === 'Deep' ? this.config.tempoDeep : this.config.tempoRegular;
      let horario = this.config.horarios[0];

      if (melhorCarro.agendamentos.length > 0) {
        const ultimoHorario = melhorCarro.agendamentos[melhorCarro.agendamentos.length - 1].horario;
        for (const h of this.config.horarios) {
          if (h > ultimoHorario) {
            horario = h;
            break;
          }
        }
      }

      melhorCarro.agendamentos.push({
        id: casa.id,
        endereco: casa.endereco,
        tipo: casa.tipo,
        horario: horario,
        tempo: tempo,
        distancia: this.calcularDistancia(
          casa.lat,
          casa.lon,
          this.config.coordPalmBay.lat,
          this.config.coordPalmBay.lon
        )
      });

      melhorCarro.tempoTotal += tempo;
      if (casa.tipo === 'Deep') {
        melhorCarro.deepCount++;
      } else {
        melhorCarro.regularCount++;
      }
    }

    return carros;
  }

  validar(carros) {
    const erros = [];
    const avisos = [];

    for (const carro of carros) {
      const horariosUnicos = new Set(carro.agendamentos.map((a) => a.horario)).size;

      if (horariosUnicos > 3) {
        erros.push(`Carro ${carro.id}: ${horariosUnicos} horários (máximo 3)`);
      }

      if (carro.deepCount > this.config.maxDeepPorCarro) {
        erros.push(`Carro ${carro.id}: ${carro.deepCount} deep cleaning (máximo ${this.config.maxDeepPorCarro})`);
      }

      if (carro.regularCount > this.config.maxRegularPorCarro) {
        erros.push(`Carro ${carro.id}: ${carro.regularCount} limpezas regulares (máximo ${this.config.maxRegularPorCarro})`);
      }

      if (carro.agendamentos.some((a) => a.distancia > 10)) {
        avisos.push(`Carro ${carro.id}: Algumas casas estão a mais de 10km de Palm Bay`);
      }
    }

    return {
      valido: erros.length === 0,
      erros,
      avisos
    };
  }
}

// ===== ROTAS =====

// POST /api/agendador/agendar
// Agenda casas aos carros
router.post('/agendar', (req, res) => {
  try {
    const { casas, config } = req.body;

    if (!casas || !Array.isArray(casas) || casas.length === 0) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Casas não fornecidas ou array vazio'
      });
    }

    const agendador = new AgendadorLimpeza(config);
    const carros = agendador.agendar(casas);
    const validacao = agendador.validar(carros);

    res.json({
      sucesso: true,
      carros,
      validacao,
      resumo: {
        totalCasas: casas.length,
        casasAgendadas: carros.reduce((sum, c) => sum + c.agendamentos.length, 0),
        tempoTotalMinutos: carros.reduce((sum, c) => sum + c.tempoTotal, 0),
        tempoMedioPorCarro: Math.round(
          carros.reduce((sum, c) => sum + c.tempoTotal, 0) / carros.length
        )
      }
    });
  } catch (erro) {
    console.error('Erro ao agendar:', erro);
    res.status(500).json({
      sucesso: false,
      erro: erro.message
    });
  }
});

// GET /api/agendador/config
// Retorna configuração padrão
router.get('/config', (req, res) => {
  const agendador = new AgendadorLimpeza();
  res.json({
    config: agendador.config
  });
});

// PUT /api/agendador/config
// Atualiza configuração
router.put('/config', (req, res) => {
  try {
    const { config } = req.body;
    // Aqui você salvaria em banco de dados
    res.json({
      sucesso: true,
      mensagem: 'Configuração atualizada',
      config
    });
  } catch (erro) {
    res.status(500).json({
      sucesso: false,
      erro: erro.message
    });
  }
});

// POST /api/agendador/validar
// Valida um agendamento
router.post('/validar', (req, res) => {
  try {
    const { carros, config } = req.body;

    if (!carros || !Array.isArray(carros)) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Carros não fornecidos ou não é um array'
      });
    }

    const agendador = new AgendadorLimpeza(config);
    const validacao = agendador.validar(carros);

    res.json({
      sucesso: true,
      validacao
    });
  } catch (erro) {
    console.error('Erro ao validar:', erro);
    res.status(500).json({
      sucesso: false,
      erro: erro.message
    });
  }
});

// POST /api/agendador/exportar-mailpad
// Exporta para formato Mailpad
router.post('/exportar-mailpad', (req, res) => {
  try {
    const { carros } = req.body;

    if (!carros || !Array.isArray(carros)) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Carros não fornecidos'
      });
    }

    const mailpadFormat = carros.map((carro) => ({
      grupo: `Carro ${carro.id}`,
      agendamentos: carro.agendamentos.map((ag) => ({
        id: ag.id,
        horario: ag.horario,
        endereco: ag.endereco,
        tipo: ag.tipo,
        duracao: ag.tempo
      }))
    }));

    res.json({
      sucesso: true,
      mailpad: mailpadFormat
    });
  } catch (erro) {
    console.error('Erro ao exportar:', erro);
    res.status(500).json({
      sucesso: false,
      erro: erro.message
    });
  }
});

module.exports = router;
