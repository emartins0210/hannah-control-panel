/**
 * AGENDADOR INTELIGENTE COM AUTOMAÇÃO
 * - Distribuição automática de equipes por proximidade geográfica
 * - Integração com Gestor Financeiro Pró
 * - Sincronização automática de clientes
 * - Balanceamento de carga por equipe
 * - Otimização por distância usando Google Maps
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const axios = require('axios');

class AutomacaoAgendador {
  constructor(config = {}) {
    this.config = {
      googleMapsApiKey: config.googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY,
      whatsappToken: config.whatsappToken || process.env.WHATSAPP_BUSINESS_TOKEN,
      whatsappPhoneId: config.whatsappPhoneId || process.env.WHATSAPP_PHONE_ID,
      gestorFinanceiroUrl: config.gestorFinanceiroUrl || process.env.GESTOR_FINANCEIRO_URL,
      gestorFinanceiroToken: config.gestorFinanceiroToken || process.env.GESTOR_FINANCEIRO_TOKEN,
      emailConfig: config.emailConfig || {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM || 'noreply@fabiolaservices.com'
      },
      fabiolaPhone: config.fabiolaPhone || process.env.FABIOLA_WHATSAPP_PHONE,
      ...config
    };

    this.equipes = this.carregarEquipes();
    this.clientes = this.carregarClientes();
    this.mailer = this.inicializarEmail();
  }

  /**
   * PASSO 1: RECEBER NOVA CASA AGENDADA
   * Detecta quando uma nova casa é marcada
   */
  async processarNovaHouseAgendada(dadosHouse) {
    console.log('🏠 Nova casa agendada:', dadosHouse);

    try {
      // 1. Validar dados
      this.validarDadosHouse(dadosHouse);

      // 2. Determinar melhor equipe (por proximidade + carga)
      const equipeOptimizada = await this.selecionarEquipeOtimizada(dadosHouse);
      console.log('👥 Equipe selecionada:', equipeOptimizada.nome);

      // 3. Adicionar ao agendador
      const houseRegistro = await this.adicionarHouseAoAgendador(dadosHouse, equipeOptimizada);

      // 4. Sincronizar com Gestor Financeiro Pró
      await this.sincronizarComGestorFinanceiro(houseRegistro);

      // 5. Enviar notificações
      await this.enviarNotificacoes(houseRegistro, dadosHouse);

      return {
        sucesso: true,
        houseId: houseRegistro.id,
        equipe: equipeOptimizada.nome,
        mensagem: `House agendada com sucesso para ${equipeOptimizada.nome}`
      };

    } catch (erro) {
      console.error('❌ Erro ao processar nova house:', erro);
      return { sucesso: false, erro: erro.message };
    }
  }

  /**
   * PASSO 2: SELEÇÃO INTELIGENTE DE EQUIPE
   * Considera:
   * - Distância geográfica (Google Maps)
   * - Carga atual da equipe (quantidade de agendamentos na semana)
   * - Localização das casas agendadas (agrupar por região)
   */
  async selecionarEquipeOtimizada(dadosHouse) {
    console.log('🗺️ Calculando equipe otimizada...');

    const avaliacao = [];

    for (const equipe of this.equipes) {
      // 1. Calcular distância média da equipe até a nova house
      const distanciaMedia = await this.calcularDistanciaEquipe(equipe, dadosHouse);

      // 2. Contar agendamentos da semana
      const agendamentosSemanais = this.contarAgendamentosSemanais(equipe.id);

      // 3. Calcular score de prioridade
      // Menor distância = melhor
      // Menor carga de trabalho = melhor
      const score = {
        equipeId: equipe.id,
        nome: equipe.nome,
        distancia: distanciaMedia,
        agendamentosSemanais,
        cargaPercentual: (agendamentosSemanais / 10) * 100, // Assumindo máx 10 por semana
        scoreTotal: (distanciaMedia * 0.6) + (agendamentosSemanais * 2), // Peso para distância
      };

      avaliacao.push(score);
      console.log(`  ${equipe.nome}: ${distanciaMedia.toFixed(2)}km, ${agendamentosSemanais} agendamentos`);
    }

    // Retornar equipe com menor score
    const equipeMelhor = avaliacao.sort((a, b) => a.scoreTotal - b.scoreTotal)[0];
    
    // Atualizar equipe com informações da avaliação
    const equipeFull = this.equipes.find(e => e.id === equipeMelhor.equipeId);
    equipeFull.avaliacao = equipeMelhor;

    return equipeFull;
  }

  /**
   * Calcular distância média da equipe até a nova localização
   */
  async calcularDistanciaEquipe(equipe, novaHouse) {
    if (!this.config.googleMapsApiKey) {
      console.warn('⚠️ Google Maps API key não configurada, usando distância aleatória');
      return Math.random() * 50; // Fallback
    }

    try {
      let distanciaTotal = 0;
      const clientesEquipe = this.clientes.filter(c => c.equipeId === equipe.id);

      if (clientesEquipe.length === 0) {
        // Se equipe vazia, assume localização central
        return await this.calcularDistanciaGoogleMaps(
          { endereco: equipe.enderecoCentral || 'Melbourne, FL' },
          novaHouse
        );
      }

      // Calcular distância para os 3 clientes mais próximos da equipe
      for (let i = 0; i < Math.min(3, clientesEquipe.length); i++) {
        const distancia = await this.calcularDistanciaGoogleMaps(
          clientesEquipe[i],
          novaHouse
        );
        distanciaTotal += distancia;
      }

      return distanciaTotal / Math.min(3, clientesEquipe.length);

    } catch (erro) {
      console.error('Erro ao calcular distância:', erro);
      return 50; // Distância padrão em caso de erro
    }
  }

  /**
   * Usar Google Maps Distance Matrix API
   */
  async calcularDistanciaGoogleMaps(origem, destino) {
    try {
      const urlOrigem = encodeURIComponent(origem.endereco || `${origem.city}, ${origem.state}`);
      const urlDestino = encodeURIComponent(`${destino.endereco}, ${destino.city}, ${destino.state}`);

      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${urlOrigem}&destinations=${urlDestino}&key=${this.config.googleMapsApiKey}`;

      const response = await axios.get(url);

      if (response.data.rows[0].elements[0].status === 'OK') {
        // Retornar distância em quilômetros
        return response.data.rows[0].elements[0].distance.value / 1000;
      }

      return 50; // Padrão se não encontrar

    } catch (erro) {
      console.error('Erro Google Maps:', erro.message);
      return 50;
    }
  }

  /**
   * Contar agendamentos da semana atual
   */
  contarAgendamentosSemanais(equipeId) {
    const agora = new Date();
    const inicioSemana = new Date(agora);
    inicioSemana.setDate(agora.getDate() - agora.getDay());
    
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 7);

    return (this.clientes
      .filter(c => c.equipeId === equipeId && c.agendamentos && c.agendamentos.length > 0)
      .reduce((total, cliente) => {
        const agendamentosSemanais = cliente.agendamentos.filter(a => {
          const dataAgendamento = new Date(a.data);
          return dataAgendamento >= inicioSemana && dataAgendamento <= fimSemana;
        });
        return total + agendamentosSemanais.length;
      }, 0)
    );
  }

  /**
   * PASSO 3: ADICIONAR HOUSE AO AGENDADOR
   */
  async adicionarHouseAoAgendador(dadosHouse, equipe) {
    const houseRegistro = {
      id: `HOUSE-${Date.now()}`,
      clienteId: dadosHouse.clienteId,
      equipeId: equipe.id,
      endereco: dadosHouse.endereco,
      city: dadosHouse.city,
      state: dadosHouse.state,
      latitude: dadosHouse.latitude,
      longitude: dadosHouse.longitude,
      dataAgendamento: new Date().toISOString(),
      dataPrevistaServico: dadosHouse.dataPrevistaServico,
      frequencia: dadosHouse.frequencia || 'semanal',
      statusAgendamento: 'confirmado',
      statusNotificacoes: {
        emailEnviado: false,
        whatsappEnviado: false,
        gestorFinanceiroAtualizado: false
      }
    };

    // Adicionar ao cliente
    const cliente = this.clientes.find(c => c.id === dadosHouse.clienteId);
    if (cliente) {
      if (!cliente.casas) cliente.casas = [];
      cliente.casas.push(houseRegistro);
      if (!cliente.agendamentos) cliente.agendamentos = [];
      cliente.agendamentos.push({
        houseId: houseRegistro.id,
        data: dadosHouse.dataPrevistaServico,
        equipeId: equipe.id
      });
    }

    // Salvar
    this.salvarClientes();
    
    return houseRegistro;
  }

  /**
   * PASSO 4: SINCRONIZAR COM GESTOR FINANCEIRO PRÓ
   */
  async sincronizarComGestorFinanceiro(houseRegistro) {
    try {
      if (!this.config.gestorFinanceiroUrl) {
        console.warn('⚠️ Gestor Financeiro URL não configurado');
        return false;
      }

      const cliente = this.clientes.find(c => c.id === houseRegistro.clienteId);
      const equipe = this.equipes.find(e => e.id === houseRegistro.equipeId);

      const payload = {
        acao: 'adicionar_agendamento',
        clienteId: cliente.id,
        clienteNome: `${cliente.firstName} ${cliente.lastName}`,
        email: cliente.email,
        telefone: cliente.phone,
        endereco: houseRegistro.endereco,
        city: houseRegistro.city,
        state: houseRegistro.state,
        dataAgendamento: houseRegistro.dataPrevistaServico,
        equipeResponsavel: equipe.nome,
        valor: cliente.charge || 0,
        frequencia: houseRegistro.frequencia,
        statusSincronizacao: 'pendente_confirmacao'
      };

      const response = await axios.post(
        `${this.config.gestorFinanceiroUrl}/api/agendamentos`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.config.gestorFinanceiroToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Sincronizado com Gestor Financeiro');
      return response.data;

    } catch (erro) {
      console.error('❌ Erro ao sincronizar com Gestor Financeiro:', erro.message);
      return false;
    }
  }

  /**
   * PASSO 5: ENVIAR NOTIFICAÇÕES
   */
  async enviarNotificacoes(houseRegistro, dadosHouse) {
    const cliente = this.clientes.find(c => c.id === houseRegistro.clienteId);
    const equipe = this.equipes.find(e => e.id === houseRegistro.equipeId);

    // Email para cliente
    await this.enviarEmailConfirmacao(cliente, houseRegistro, equipe);

    // WhatsApp para cliente
    await this.enviarWhatsappCliente(cliente, houseRegistro, equipe);

    // WhatsApp para Fabíola (equipe)
    await this.enviarWhatsappEquipe(equipe, cliente, houseRegistro);
  }

  /**
   * Enviar email de confirmação
   */
  async enviarEmailConfirmacao(cliente, house, equipe) {
    try {
      if (!this.mailer) return false;

      const htmlConteudo = `
        <h2>Agendamento Confirmado! ✅</h2>
        <p>Olá <strong>${cliente.firstName}</strong>,</p>
        <p>Seu agendamento foi confirmado com sucesso!</p>
        
        <h3>Detalhes do Agendamento:</h3>
        <ul>
          <li><strong>Data:</strong> ${new Date(house.dataPrevistaServico).toLocaleDateString('pt-BR')}</li>
          <li><strong>Local:</strong> ${house.endereco}, ${house.city}, ${house.state}</li>
          <li><strong>Equipe:</strong> ${equipe.nome}</li>
          <li><strong>Frequência:</strong> ${house.frequencia}</li>
        </ul>
        
        <p>Entraremos em contato em breve para confirmar mais detalhes.</p>
        <p><strong>Fabíola Services</strong></p>
      `;

      await this.mailer.sendMail({
        to: cliente.email,
        subject: '✅ Agendamento Confirmado - Fabíola Services',
        html: htmlConteudo
      });

      console.log(`📧 Email enviado para ${cliente.email}`);
      return true;

    } catch (erro) {
      console.error('Erro ao enviar email:', erro);
      return false;
    }
  }

  /**
   * Enviar mensagem WhatsApp para cliente
   */
  async enviarWhatsappCliente(cliente, house, equipe) {
    try {
      if (!this.config.whatsappToken || !this.config.whatsappPhoneId) {
        console.warn('⚠️ WhatsApp não configurado');
        return false;
      }

      const telefone = cliente.phone.replace(/\D/g, ''); // Remove caracteres especiais
      const data = new Date(house.dataPrevistaServico).toLocaleDateString('pt-BR');

      const mensagem = `
Olá ${cliente.firstName}! 👋

Seu agendamento foi CONFIRMADO! ✅

📍 Local: ${house.endereco}, ${house.city}, ${house.state}
📅 Data: ${data}
👥 Equipe: ${equipe.nome}
🔄 Frequência: ${house.frequencia}

Obrigado por escolher Fabíola Services! 🏠
      `;

      const response = await axios.post(
        `https://graph.instagram.com/v17.0/${this.config.whatsappPhoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: telefone,
          type: 'text',
          text: { body: mensagem.trim() }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.whatsappToken}`
          }
        }
      );

      console.log(`💬 WhatsApp enviado para ${telefone}`);
      return true;

    } catch (erro) {
      console.error('Erro ao enviar WhatsApp ao cliente:', erro.message);
      return false;
    }
  }

  /**
   * Enviar notificação WhatsApp para equipe/Fabíola
   */
  async enviarWhatsappEquipe(equipe, cliente, house) {
    try {
      if (!this.config.whatsappToken || !this.config.fabiolaPhone) {
        console.warn('⚠️ WhatsApp Fabíola não configurado');
        return false;
      }

      const telefone = this.config.fabiolaPhone.replace(/\D/g, '');
      const data = new Date(house.dataPrevistaServico).toLocaleDateString('pt-BR');

      const mensagem = `
🔔 NOVO AGENDAMENTO - ${equipe.nome}

Cliente: ${cliente.firstName} ${cliente.lastName}
📍 Local: ${house.endereco}, ${house.city}, ${house.state}
📅 Data: ${data}
💰 Valor: $${cliente.charge || 'N/A'}
☎️ Telefone: ${cliente.phone}

Status: Confirmado no sistema ✅
      `;

      const response = await axios.post(
        `https://graph.instagram.com/v17.0/${this.config.whatsappPhoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: telefone,
          type: 'text',
          text: { body: mensagem.trim() }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.whatsappToken}`
          }
        }
      );

      console.log(`💬 WhatsApp enviado para Fabíola`);
      return true;

    } catch (erro) {
      console.error('Erro ao enviar WhatsApp à equipe:', erro.message);
      return false;
    }
  }

  /**
   * UTILIDADES
   */
  validarDadosHouse(dados) {
    if (!dados.clienteId) throw new Error('clienteId é obrigatório');
    if (!dados.endereco) throw new Error('endereco é obrigatório');
    if (!dados.city) throw new Error('city é obrigatório');
    if (!dados.state) throw new Error('state é obrigatório');
    if (!dados.dataPrevistaServico) throw new Error('dataPrevistaServico é obrigatório');

    const cliente = this.clientes.find(c => c.id === dados.clienteId);
    if (!cliente) throw new Error(`Cliente ${dados.clienteId} não encontrado`);
  }

  inicializarEmail() {
    try {
      if (!this.config.emailConfig.host) {
        console.warn('⚠️ Email SMTP não configurado');
        return null;
      }

      return nodemailer.createTransport({
        host: this.config.emailConfig.host,
        port: this.config.emailConfig.port,
        secure: true,
        auth: {
          user: this.config.emailConfig.user,
          pass: this.config.emailConfig.pass
        }
      });
    } catch (erro) {
      console.warn('Erro ao inicializar email:', erro.message);
      return null;
    }
  }

  carregarEquipes() {
    try {
      const dados = fs.readFileSync(
        path.join(__dirname, 'dados-clientes', 'equipes.json'),
        'utf8'
      );
      return JSON.parse(dados);
    } catch {
      return [
        { id: 'team-1', nome: 'Equipe 1', enderecoCentral: 'Melbourne, FL' },
        { id: 'team-2', nome: 'Equipe 2', enderecoCentral: 'Melbourne, FL' },
        { id: 'team-3', nome: 'Equipe 3', enderecoCentral: 'Melbourne, FL' }
      ];
    }
  }

  carregarClientes() {
    try {
      const dados = fs.readFileSync(
        path.join(__dirname, 'dados-clientes', 'clientes.json'),
        'utf8'
      );
      return JSON.parse(dados);
    } catch {
      return [];
    }
  }

  salvarClientes() {
    fs.writeFileSync(
      path.join(__dirname, 'dados-clientes', 'clientes.json'),
      JSON.stringify(this.clientes, null, 2)
    );
  }

  obterRelatorioDistribuicao() {
    const relatorio = {};
    for (const equipe of this.equipes) {
      const clientesEquipe = this.clientes.filter(c => c.equipeId === equipe.id);
      const agendamentosSemanais = this.contarAgendamentosSemanais(equipe.id);
      
      relatorio[equipe.nome] = {
        totalClientes: clientesEquipe.length,
        agendamentosSemanais,
        receita: clientesEquipe.reduce((sum, c) => sum + (c.charge || 0), 0)
      };
    }
    return relatorio;
  }
}

module.exports = AutomacaoAgendador;
