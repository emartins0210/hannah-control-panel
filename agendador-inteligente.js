/**
 * AGENDADOR INTELIGENTE DE LIMPEZA
 * Aloca casas aos carros respeitando constraints
 * - 2h40min (160 min) entre atendimentos
 * - Máximo 2 deep cleaning por carro
 * - Máximo 4 limpezas regulares por carro
 * - Prioriza casas próximas de Palm Bay
 */

class AgendadorLimpeza {
  constructor() {
    this.carros = [
      { id: 1, agendamentos: [], tempoTotal: 0, deepCount: 0, regularCount: 0 },
      { id: 2, agendamentos: [], tempoTotal: 0, deepCount: 0, regularCount: 0 },
      { id: 3, agendamentos: [], tempoTotal: 0, deepCount: 0, regularCount: 0 },
    ];

    this.config = {
      tempoRegular: 160, // 2h40min
      tempoDeep: 270, // 4h30min
      intervaloMinimo: 160, // 2h40min
      maxDeepPorCarro: 2,
      maxRegularPorCarro: 4,
      coordPalmBay: { lat: 28.0436, lon: -80.3853 },
    };

    this.horarios = ['08:00', '10:40', '13:20', '16:00'];
  }

  /**
   * Calcula distância entre dois pontos (Haversine)
   */
  calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Ordena casas por proximidade e tipo
   */
  ordenarCasas(casas) {
    return casas.sort((a, b) => {
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

      // Deep cleaning primeiro (mais complexo)
      if (a.tipo !== b.tipo) {
        return a.tipo === 'Deep' ? -1 : 1;
      }

      // Depois por proximidade
      return distA - distB;
    });
  }

  /**
   * Encontra carro com menos trabalho
   */
  encontrarMelhorCarro(tipoLimpeza) {
    let melhorCarro = null;
    let menorTrabalho = Infinity;

    for (const carro of this.carros) {
      // Verificar se pode adicionar mais casas
      if (tipoLimpeza === 'Deep' && carro.deepCount >= this.config.maxDeepPorCarro) {
        continue;
      }
      if (tipoLimpeza === 'Regular' && carro.regularCount >= this.config.maxRegularPorCarro) {
        continue;
      }

      // Verificar se tem espaço no horário (máximo 3 horários)
      const horariosUnicos = new Set(carro.agendamentos.map((a) => a.horario)).size;
      if (horariosUnicos >= 3) {
        continue;
      }

      // Carro com menos tempo total ganha
      if (carro.tempoTotal < menorTrabalho) {
        menorTrabalho = carro.tempoTotal;
        melhorCarro = carro;
      }
    }

    return melhorCarro;
  }

  /**
   * Sugere próximo horário baseado no último agendamento
   */
  sugerirHorario(carro) {
    if (carro.agendamentos.length === 0) {
      return this.horarios[0]; // Primeira casa no primeiro horário
    }

    const ultimoHorario = carro.agendamentos[carro.agendamentos.length - 1].horario;
    const horariosUsados = new Set(carro.agendamentos.map((a) => a.horario));

    // Encontra próximo horário disponível
    for (const horario of this.horarios) {
      if (horario > ultimoHorario && !horariosUsados.has(horario)) {
        return horario;
      }
    }

    // Se todos usados, volta ao primeiro
    return this.horarios[0];
  }

  /**
   * Aloca casas aos carros
   */
  alocarCasas(casas) {
    const casasOrdenadas = this.ordenarCasas(casas);

    for (const casa of casasOrdenadas) {
      const melhorCarro = this.encontrarMelhorCarro(casa.tipo);

      if (!melhorCarro) {
        console.warn(
          `⚠️  Casa ${casa.id} não pôde ser alocada (limite de capacidade atingido)`
        );
        continue;
      }

      const tempo = casa.tipo === 'Deep' ? this.config.tempoDeep : this.config.tempoRegular;
      const horario = this.sugerirHorario(melhorCarro);

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
        ),
      });

      melhorCarro.tempoTotal += tempo;
      if (casa.tipo === 'Deep') {
        melhorCarro.deepCount++;
      } else {
        melhorCarro.regularCount++;
      }
    }

    return this.carros;
  }

  /**
   * Formata para exibição
   */
  formatarResultado() {
    let resultado = '\n╔════════════════════════════════════════════════════════════╗\n';
    resultado += '║         SCHEDULE OTIMIZADO DE LIMPEZA - HANNAH 3.0          ║\n';
    resultado += '╚════════════════════════════════════════════════════════════╝\n\n';

    for (const carro of this.carros) {
      resultado += `\n🚗 CARRO ${carro.id}\n`;
      resultado += `   Tempo Total: ${this.formatarTempo(carro.tempoTotal)}\n`;
      resultado += `   Deep Cleaning: ${carro.deepCount}/${this.config.maxDeepPorCarro}\n`;
      resultado += `   Limpeza Regular: ${carro.regularCount}/${this.config.maxRegularPorCarro}\n`;
      resultado += `   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

      for (const agendamento of carro.agendamentos) {
        const icon = agendamento.tipo === 'Deep' ? '🔍' : '🧹';
        resultado += `   ${agendamento.horario} - ${icon} ${agendamento.tipo.padEnd(7)} | ${agendamento.endereco}\n`;
        resultado += `              └─ ${agendamento.tempo} min | ${agendamento.distancia.toFixed(1)} km de Palm Bay\n`;
      }
    }

    resultado += '\n╔════════════════════════════════════════════════════════════╗\n';
    resultado += '║                    VALIDAÇÃO DE CONSTRAINTS               ║\n';
    resultado += '╚════════════════════════════════════════════════════════════╝\n\n';

    this.validarConstraints();

    return resultado;
  }

  /**
   * Valida se todos os constraints foram respeitados
   */
  validarConstraints() {
    console.log('✅ VERIFICAÇÕES:');

    for (const carro of this.carros) {
      const horariosUnicos = new Set(carro.agendamentos.map((a) => a.horario)).size;
      console.log(
        `   Carro ${carro.id}: ${horariosUnicos} horários (máx 3) - ${horariosUnicos <= 3 ? '✅' : '❌'}`
      );

      console.log(
        `   Carro ${carro.id}: ${carro.deepCount} deep cleaning (máx 2) - ${carro.deepCount <= this.config.maxDeepPorCarro ? '✅' : '❌'}`
      );

      console.log(
        `   Carro ${carro.id}: ${carro.regularCount} limpezas regulares (máx 4) - ${carro.regularCount <= this.config.maxRegularPorCarro ? '✅' : '❌'}`
      );
    }

    console.log('\n✅ DISTÂNCIA:');
    const todasPertoPalmBay = this.carros.every((carro) =>
      carro.agendamentos.every((agendamento) => agendamento.distancia < 10)
    );
    console.log(`   Casas próximas de Palm Bay (<10km) - ${todasPertoPalmBay ? '✅' : '⚠️'}`);
  }

  /**
   * Formata tempo em horas e minutos
   */
  formatarTempo(minutos) {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Exporta para JSON
   */
  exportarJSON() {
    return JSON.stringify(
      this.carros.map((carro) => ({
        carro: carro.id,
        agendamentos: carro.agendamentos,
        tempoTotal: `${this.formatarTempo(carro.tempoTotal)}`,
        deepCount: carro.deepCount,
        regularCount: carro.regularCount,
      })),
      null,
      2
    );
  }
}

// ===== EXEMPLO DE USO =====

const casas = [
  { id: 1, endereco: 'Rua A, 100 - Palm Bay', lat: 28.0436, lon: -80.3853, tipo: 'Regular' },
  { id: 2, endereco: 'Rua B, 200 - Palm Bay', lat: 28.0450, lon: -80.3850, tipo: 'Regular' },
  { id: 3, endereco: 'Rua C, 300 - Melbourne', lat: 28.0600, lon: -80.3900, tipo: 'Deep' },
  { id: 4, endereco: 'Rua D, 400 - Palm Bay', lat: 28.0440, lon: -80.3860, tipo: 'Regular' },
  { id: 5, endereco: 'Rua E, 500 - Brevard', lat: 28.0700, lon: -80.4000, tipo: 'Regular' },
  { id: 6, endereco: 'Rua F, 600 - Palm Bay', lat: 28.0445, lon: -80.3855, tipo: 'Deep' },
  { id: 7, endereco: 'Rua G, 700 - Melbourne', lat: 28.0650, lon: -80.3950, tipo: 'Regular' },
  { id: 8, endereco: 'Rua H, 800 - Palm Bay', lat: 28.0435, lon: -80.3860, tipo: 'Regular' },
];

const agendador = new AgendadorLimpeza();
agendador.alocarCasas(casas);
console.log(agendador.formatarResultado());
console.log('\n📊 JSON EXPORT:');
console.log(agendador.exportarJSON());

module.exports = AgendadorLimpeza;
