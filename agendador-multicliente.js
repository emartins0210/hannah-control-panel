const fs = require('fs');
const path = require('path');

class GerenciadorClientes {
  constructor(dataDir = './dados-clientes') {
    this.dataDir = dataDir;
    this.clientes = {};
    this.inicializar();
  }

  inicializar() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.carregarClientes();
  }

  carregarClientes() {
    const clientesFile = path.join(this.dataDir, 'clientes.json');
    if (fs.existsSync(clientesFile)) {
      const data = fs.readFileSync(clientesFile, 'utf8');
      this.clientes = JSON.parse(data);
    }
  }

  salvarClientes() {
    const clientesFile = path.join(this.dataDir, 'clientes.json');
    fs.writeFileSync(clientesFile, JSON.stringify(this.clientes, null, 2));
  }

  adicionarCliente(clienteData) {
    const clienteId = clienteData.id || `cliente_${Date.now()}`;
    this.clientes[clienteId] = {
      id: clienteId,
      nome: clienteData.nome,
      telefone: clienteData.telefone,
      email: clienteData.email,
      endereco: clienteData.endereco,
      cidade: clienteData.cidade,
      status: clienteData.status || 'ativo',
      valor: clienteData.valor || 0,
      casas: [],
      agendamentos: [],
      config: {
        numCarros: 3,
        maxHorariosRepetidos: 3,
        maxCasasHorario: 4,
        tempoLimpezaRegular: 2.67,
        tempoDeepClean: 4.5,
        maxDeepCleanDia: 2,
        maxLimpezaRegularDia: 4,
        locationPriority: { lat: 28.2634, lon: -80.7282 }
      }
    };
    this.salvarClientes();
    return this.clientes[clienteId];
  }

  obterCliente(clienteId) {
    return this.clientes[clienteId] || null;
  }

  listarClientes() {
    return Object.values(this.clientes);
  }

  adicionarCasa(clienteId, casaData) {
    const cliente = this.obterCliente(clienteId);
    if (!cliente) return null;

    const casa = {
      id: casaData.id || `casa_${Date.now()}`,
      endereco: casaData.endereco,
      lat: parseFloat(casaData.lat),
      lon: parseFloat(casaData.lon),
      tipo: casaData.tipo,
      distancia: 0
    };

    casa.distancia = this.calcularDistancia(
      casa.lat, casa.lon,
      cliente.config.locationPriority.lat,
      cliente.config.locationPriority.lon
    );

    cliente.casas.push(casa);
    this.salvarClientes();
    return casa;
  }

  obterCasas(clienteId) {
    const cliente = this.obterCliente(clienteId);
    return cliente ? cliente.casas : [];
  }

  calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  salvarAgendamento(clienteId, agendamento) {
    const cliente = this.obterCliente(clienteId);
    if (!cliente) return null;

    cliente.agendamentos.push(agendamento);
    this.salvarClientes();
    return agendamento;
  }

  obterAgendamentos(clienteId) {
    const cliente = this.obterCliente(clienteId);
    return cliente ? cliente.agendamentos : [];
  }
}

class AgendadorLimpezaMultiCliente {
  constructor(gerenciador) {
    this.gerenciador = gerenciador;
  }

  calcularDistancia(lat1, lon1, lat2, lon2) {
    return this.gerenciador.calcularDistancia(lat1, lon1, lat2, lon2);
  }

  ordenarCasas(casas) {
    return casas.sort((a, b) => {
      if (a.tipo !== b.tipo) return a.tipo === 'deepclean' ? -1 : 1;
      return a.distancia - b.distancia;
    });
  }

  encontrarMelhorCarro(carros, tipoLimpeza) {
    let carrosDisponiveis = Object.entries(carros).map(([num, data]) => ({
      num: parseInt(num),
      trabalho: data.trabalho,
      deepclean: data.deepclean
    }));

    if (tipoLimpeza === 'deepclean') {
      carrosDisponiveis = carrosDisponiveis.filter(c => c.deepclean < 2);
    }

    return carrosDisponiveis.reduce((melhor, carro) => 
      carro.trabalho < melhor.trabalho ? carro : melhor
    );
  }

  agendar(clienteId) {
    const cliente = this.gerenciador.obterCliente(clienteId);
    if (!cliente) return { erro: 'Cliente não encontrado' };

    const casas = this.ordenarCasas([...cliente.casas]);
    const config = cliente.config;

    const carros = {
      1: { trabalho: 0, deepclean: 0, agendas: [] },
      2: { trabalho: 0, deepclean: 0, agendas: [] },
      3: { trabalho: 0, deepclean: 0, agendas: [] }
    };

    const horarios = ['08:00', '10:40', '15:10'];

    for (const casa of casas) {
      const melhor = this.encontrarMelhorCarro(carros, casa.tipo);
      const tempoLimpeza = casa.tipo === 'deepclean' ? config.tempoDeepClean : config.tempoLimpezaRegular;

      const agendaCarro = carros[melhor.num].agendas;
      const horarioIndex = agendaCarro.length % horarios.length;

      carros[melhor.num].agendas.push({
        carro: melhor.num,
        casa: casa.id,
        endereco: casa.endereco,
        horario: horarios[horarioIndex],
        tipo: casa.tipo,
        tempo: tempoLimpeza
      });

      carros[melhor.num].trabalho += tempoLimpeza;
      if (casa.tipo === 'deepclean') carros[melhor.num].deepclean++;
    }

    const agendamento = {
      id: `agendamento_${Date.now()}`,
      clienteId,
      data: new Date().toISOString(),
      carros
    };

    this.gerenciador.salvarAgendamento(clienteId, agendamento);
    return agendamento;
  }
}

module.exports = {
  GerenciadorClientes,
  AgendadorLimpezaMultiCliente
};
