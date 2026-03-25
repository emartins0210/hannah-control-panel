/**
 * ROTAS DE AUTOMAÇÃO INTELIGENTE
 * Endpoints para:
 * - Processar nova house agendada
 * - Sincronizar com Gestor Financeiro
 * - Consultar distribuição por equipe
 * - Webhooks para integrações externas
 */

const express = require('express');
const AutomacaoAgendador = require('./agendador-inteligente-com-automacao');

class RotasAutomacaoInteligente {
  constructor() {
    this.router = express.Router();
    this.automacao = new AutomacaoAgendador();
    this.configurarRotas();
  }

  configurarRotas() {
    /**
     * POST /automacao/processar-house-agendada
     * Processa uma nova house agendada
     */
    this.router.post('/processar-house-agendada', async (req, res) => {
      try {
        const { clienteId, endereco, city, state, dataPrevistaServico, frequencia, latitude, longitude } = req.body;

        // Validação básica
        if (!clienteId || !endereco || !city || !state || !dataPrevistaServico) {
          return res.status(400).json({
            erro: 'Campos obrigatórios faltando',
            requeridos: ['clienteId', 'endereco', 'city', 'state', 'dataPrevistaServico']
          });
        }

        // Processar através do agendador inteligente
        const resultado = await this.automacao.processarNovaHouseAgendada({
          clienteId,
          endereco,
          city,
          state,
          dataPrevistaServico,
          frequencia: frequencia || 'semanal',
          latitude,
          longitude
        });

        if (resultado.sucesso) {
          res.status(201).json({
            mensagem: 'House processada com sucesso',
            ...resultado
          });
        } else {
          res.status(400).json({
            erro: 'Falha ao processar house',
            detalhes: resultado.erro
          });
        }

      } catch (erro) {
        console.error('Erro na rota:', erro);
        res.status(500).json({ erro: erro.message });
      }
    });

    /**
     * GET /automacao/distribuicao-equipes
     * Obtém relatório de distribuição das equipes
     */
    this.router.get('/distribuicao-equipes', (req, res) => {
      try {
        const relatorio = this.automacao.obterRelatorioDistribuicao();
        res.json({
          titulo: 'Distribuição de Equipes',
          data: new Date().toISOString(),
          equipes: relatorio
        });
      } catch (erro) {
        res.status(500).json({ erro: erro.message });
      }
    });

    /**
     * POST /automacao/webhook/gestor-financeiro
     * Webhook para receber eventos do Gestor Financeiro Pró
     */
    this.router.post('/webhook/gestor-financeiro', async (req, res) => {
      try {
        const { acao, clienteId, dados } = req.body;

        console.log(`📨 Webhook Gestor Financeiro: ${acao}`);

        switch (acao) {
          case 'novo_agendamento':
            // Sincronizar novo agendamento do Gestor para o Agendador
            const resultado = await this.automacao.processarNovaHouseAgendada(dados);
            res.json({ sucesso: true, resultado });
            break;

          case 'atualizar_cliente':
            // Atualizar informações do cliente
            res.json({ sucesso: true, mensagem: 'Cliente atualizado' });
            break;

          case 'cancelar_agendamento':
            // Cancelar agendamento
            res.json({ sucesso: true, mensagem: 'Agendamento cancelado' });
            break;

          default:
            res.status(400).json({ erro: 'Ação não reconhecida' });
        }

      } catch (erro) {
        console.error('Erro no webhook:', erro);
        res.status(500).json({ erro: erro.message });
      }
    });

    /**
     * POST /automacao/webhook/whatsapp
     * Webhook para receber confirmações do WhatsApp
     */
    this.router.post('/webhook/whatsapp', (req, res) => {
      try {
        const { mensagem_id, status, telefone } = req.body;

        console.log(`✅ WhatsApp confirmação: ${telefone} - ${status}`);

        // Atualizar status da notificação no banco de dados
        // TODO: Implementar atualização de status

        res.json({ sucesso: true });

      } catch (erro) {
        console.error('Erro no webhook WhatsApp:', erro);
        res.status(500).json({ erro: erro.message });
      }
    });

    /**
     * GET /automacao/selecionar-equipe
     * Query para testar seleção de equipe sem agendar
     */
    this.router.get('/selecionar-equipe', async (req, res) => {
      try {
        const { endereco, city, state } = req.query;

        if (!endereco || !city || !state) {
          return res.status(400).json({
            erro: 'Parâmetros obrigatórios: endereco, city, state'
          });
        }

        const equipeOtimizada = await this.automacao.selecionarEquipeOtimizada({
          endereco,
          city,
          state
        });

        res.json({
          equipeSelecionada: equipeOtimizada.nome,
          avaliacaoDetalhada: equipeOtimizada.avaliacao,
          mensagem: `Equipe recomendada: ${equipeOtimizada.nome}`
        });

      } catch (erro) {
        res.status(500).json({ erro: erro.message });
      }
    });

    /**
     * GET /automacao/simular-distribuicao
     * Simula a distribuição de múltiplas houses
     */
    this.router.post('/simular-distribuicao', async (req, res) => {
      try {
        const { houses } = req.body;

        if (!Array.isArray(houses)) {
          return res.status(400).json({ erro: 'Envie um array de houses' });
        }

        const simulacao = [];

        for (const house of houses) {
          const equipe = await this.automacao.selecionarEquipeOtimizada(house);
          simulacao.push({
            endereco: house.endereco,
            city: house.city,
            equipeSelecionada: equipe.nome,
            distancia: equipe.avaliacao?.distancia || 'N/A'
          });
        }

        res.json({
          titulo: 'Simulação de Distribuição',
          total: simulacao.length,
          distribuicao: simulacao
        });

      } catch (erro) {
        res.status(500).json({ erro: erro.message });
      }
    });

    /**
     * GET /automacao/status
     * Status do sistema de automação
     */
    this.router.get('/status', (req, res) => {
      const relatorio = this.automacao.obterRelatorioDistribuicao();
      
      res.json({
        sistema: 'Automação Inteligente',
        status: 'ativo',
        timestamp: new Date().toISOString(),
        configuracoes: {
          googleMapsIntegrado: !!this.automacao.config.googleMapsApiKey,
          whatsappIntegrado: !!this.automacao.config.whatsappToken,
          gestorFinanceiroIntegrado: !!this.automacao.config.gestorFinanceiroUrl,
          emailIntegrado: !!this.automacao.mailer
        },
        distribuicaoAtual: relatorio
      });
    });
  }

  obterRouter() {
    return this.router;
  }
}

module.exports = RotasAutomacaoInteligente;
