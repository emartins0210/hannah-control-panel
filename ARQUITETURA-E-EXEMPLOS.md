# 🏗️ ARQUITETURA DO SISTEMA DE AUTOMAÇÃO INTELIGENTE

## Diagrama de Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENTE / WEBSITE                            │
│                     (lopesservices.top)                             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ Novo agendamento
                               │
                ┌──────────────▼──────────────┐
                │   SISTEMA FABÍOLA           │
                │   (Painel Agendador)        │
                │                             │
                │  POST /api/automacao/      │
                │  processar-house-agendada  │
                └──────────────┬──────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐    ┌─────────────────┐    ┌──────────────┐
│  GOOGLE MAPS  │    │  SELEÇÃO DE     │    │  VALIDAÇÃO   │
│               │    │  EQUIPE ÓTIMA   │    │  DE DADOS    │
│  Distance     │    │                 │    │              │
│  Matrix API   │    │  Algoritmo:     │    │  • Cliente   │
│               │    │  Score = Dist + │    │  • Endereço  │
│               │    │  Carga Trabalho │    │  • Data      │
└───────────────┘    └─────────────────┘    └──────────────┘
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
                ┌──────────────▼──────────────┐
                │  REGISTRAR AGENDAMENTO     │
                │  • Equipe selecionada      │
                │  • House ID criado         │
                │  • Status: confirmado      │
                └──────────────┬──────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌──────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ PAINEL       │    │  GESTOR          │    │ NOTIFICAÇÕES    │
│ AGENDADOR    │    │  FINANCEIRO PRÓ  │    │                 │
│              │    │                  │    │ • Email         │
│ Adiciona:    │    │ Sincroniza:      │    │ • WhatsApp      │
│ • House      │    │ • Cliente        │    │   (Cliente)     │
│ • Equipe     │    │ • Agendamento    │    │ • WhatsApp      │
│ • Data       │    │ • Valor          │    │   (Fabíola)     │
│              │    │ • Frequência     │    │                 │
└──────────────┘    └──────────────────┘    └─────────────────┘
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
                ┌──────────────▼──────────────┐
                │  ✅ CONCLUÍDO              │
                │                             │
                │  • House agendada          │
                │  • Equipe sabe do trabalho │
                │  • Cliente confirmado      │
                │  • Sistema atualizado      │
                └──────────────────────────────┘
```

---

## Arquitetura de Componentes

```
┌──────────────────────────────────────────────────────────────────┐
│                     SERVIDOR PRINCIPAL                            │
│                   (server-com-automacao.js)                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  MIDDLEWARE                                              │   │
│  │  • CORS                                                  │   │
│  │  • Body Parser                                           │   │
│  │  • API Key Authentication                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                       │
│  ┌────────────────┐      │      ┌────────────────┐              │
│  │ ROTAS DO       │      │      │ ROTAS DE       │              │
│  │ AGENDADOR      │      │      │ AUTOMAÇÃO      │              │
│  ├────────────────┤      │      ├────────────────┤              │
│  │ /api/completo/ │◄─────┼─────►│ /api/automacao/│              │
│  │                │      │      │                │              │
│  │ • Clientes     │      │      │ • Processar    │              │
│  │ • Equipes      │      │      │ • Distribuir   │              │
│  │ • Agendamentos │      │      │ • Sincronizar  │              │
│  │ • Exportar     │      │      │ • Status       │              │
│  └────────────────┘      │      │ • Webhooks     │              │
│                          │      └────────────────┘              │
│  ┌──────────────────────▼──────────────────────┐               │
│  │  LÓGICA DE AUTOMAÇÃO                        │               │
│  │  (agendador-inteligente-com-automacao.js)  │               │
│  ├──────────────────────────────────────────────┤              │
│  │ • Validação de dados                        │              │
│  │ • Cálculo de distâncias (Google Maps)      │              │
│  │ • Seleção inteligente de equipe             │              │
│  │ • Sincronização com Gestor Financeiro       │              │
│  │ • Envio de notificações                     │              │
│  └──────────────────────────────────────────────┘              │
│          │              │              │                       │
└──────────┼──────────────┼──────────────┼─────────────────────┘
           │              │              │
           ▼              ▼              ▼
     ┌──────────┐   ┌──────────┐   ┌──────────┐
     │  DADOS   │   │INTEGRAÇÕES│  │NOTIFICAÇÕES
     │          │   │           │  │
     │ clientes.│   │Google     │  │Email SMTP
     │json      │   │Maps       │  │
     │          │   │           │  │WhatsApp
     │equipes   │   │Gestor     │  │Business
     │.json     │   │Financeiro │  │
     └──────────┘   │           │  │OAuth/Tokens
                    │WhatsApp   │  │
                    │API        │  │
                    │           │  │
                    └──────────┘  └──────────┘
```

---

## Exemplos de Implementação Prática

### Exemplo 1: Agendamento Simples (cURL)

```bash
curl -X POST http://localhost:3000/api/automacao/processar-house-agendada \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_chave_aqui" \
  -d '{
    "clienteId": "CLIENTE-789",
    "endereco": "555 Oak Street",
    "city": "Palm Bay",
    "state": "FL",
    "dataPrevistaServico": "2024-04-10T14:00:00",
    "frequencia": "quinzenal",
    "latitude": 28.0489,
    "longitude": -80.5855
  }'

# Resposta:
# {
#   "sucesso": true,
#   "houseId": "HOUSE-1711814400000",
#   "equipe": "Equipe 2",
#   "mensagem": "House agendada com sucesso para Equipe 2"
# }
```

### Exemplo 2: Agendamento via JavaScript (Frontend)

```javascript
async function agendarHouseNovoCliente(dados) {
  try {
    const resposta = await fetch('/api/automacao/processar-house-agendada', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': document.querySelector('[data-api-key]').value
      },
      body: JSON.stringify({
        clienteId: dados.clienteId,
        endereco: dados.endereco,
        city: dados.city,
        state: dados.state,
        dataPrevistaServico: dados.data,
        frequencia: 'semanal'
      })
    });

    const resultado = await resposta.json();

    if (resultado.sucesso) {
      mostrarNotificacao(`✅ Agendado para ${resultado.equipe}`, 'sucesso');
      atualizarDashboard();
    } else {
      mostrarNotificacao(`❌ Erro: ${resultado.erro}`, 'erro');
    }

    return resultado;

  } catch (erro) {
    console.error('Erro ao agendar:', erro);
    mostrarNotificacao('❌ Erro de conexão', 'erro');
  }
}
```

### Exemplo 3: Integração com Website (Node.js)

```javascript
// sincronizar-site-com-agendador.js
const axios = require('axios');

class SincronizadorSite {
  constructor() {
    this.urlAgendador = 'http://localhost:3000/api/automacao';
    this.urlSite = process.env.LOPES_SERVICES_API_URL;
    this.tokenSite = process.env.LOPES_SERVICES_API_TOKEN;
  }

  async sincronizarNovoAgendamentoDoSite(evento) {
    try {
      // 1. Receber evento do webhook do site
      const { cliente, house } = evento;

      // 2. Validar dados
      if (!cliente.id || !house.endereco) {
        throw new Error('Dados incompletos');
      }

      // 3. Enviar para agendador
      const resposta = await axios.post(
        `${this.urlAgendador}/processar-house-agendada`,
        {
          clienteId: cliente.id,
          endereco: house.endereco,
          city: house.city,
          state: house.state,
          dataPrevistaServico: house.dataPrevista,
          frequencia: house.frequencia || 'semanal'
        },
        {
          headers: {
            'X-API-Key': process.env.API_KEY
          }
        }
      );

      console.log(`✅ House ${resposta.data.houseId} agendada para ${resposta.data.equipe}`);
      return resposta.data;

    } catch (erro) {
      console.error('❌ Erro ao sincronizar:', erro.message);
      throw erro;
    }
  }

  // Configurar webhook no servidor
  configurarWebhook(app) {
    app.post('/webhook/site-novo-agendamento', async (req, res) => {
      try {
        const resultado = await this.sincronizarNovoAgendamentoDoSite(req.body);
        res.json({ sucesso: true, resultado });
      } catch (erro) {
        res.status(400).json({ sucesso: false, erro: erro.message });
      }
    });
  }
}

module.exports = SincronizadorSite;
```

### Exemplo 4: Monitoramento em Tempo Real

```javascript
// monitorar-automacao.js
const axios = require('axios');

async function monitorarAutomacao() {
  setInterval(async () => {
    try {
      // 1. Verificar status geral
      const status = await axios.get('http://localhost:3000/api/automacao/status');
      console.log('Status do Sistema:', status.data.status);

      // 2. Verificar distribuição
      const dist = await axios.get('http://localhost:3000/api/automacao/distribuicao-equipes');
      console.log('\n📊 Distribuição Atual:');
      for (const [equipe, dados] of Object.entries(dist.data.equipes)) {
        console.log(`${equipe}: ${dados.totalClientes} clientes, ${dados.agendamentosSemanais} esta semana`);
      }

      // 3. Alertar se equipe sobrecarregada
      for (const [equipe, dados] of Object.entries(dist.data.equipes)) {
        if (dados.agendamentosSemanais > 10) {
          console.warn(`⚠️ ALERTA: ${equipe} está sobrecarregada!`);
        }
      }

    } catch (erro) {
      console.error('Erro ao monitorar:', erro.message);
    }
  }, 60000); // A cada minuto
}

monitorarAutomacao();
```

---

## Configuração Avançada

### Usar Múltiplos Idiomas

No `.env`:
```bash
LANGUAGE=pt-BR
TIMEZONE=America/New_York
```

Exemplo em `agendador-inteligente-com-automacao.js`:
```javascript
const mensagensWhatsApp = {
  'pt-BR': {
    confirmacao: 'Seu agendamento foi confirmado! ✅',
    equipe: 'Equipe: {equipe}'
  },
  'en-US': {
    confirmacao: 'Your appointment has been confirmed! ✅',
    equipe: 'Team: {equipe}'
  }
};
```

### Implementar Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // 100 requisições
});

app.use('/api/automacao/', limiter);
```

### Criptografar Dados Sensíveis

```javascript
const crypto = require('crypto');

function criptografarClienteId(clienteId) {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.CRIPTOGRAFIA_CHAVE);
  let criptografado = cipher.update(clienteId, 'utf8', 'hex');
  criptografado += cipher.final('hex');
  return criptografado;
}
```

### Implementar Cache

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutos

async function obterDistribuicaoComCache() {
  const cached = cache.get('distribuicao');
  if (cached) return cached;

  const distribuicao = await automacao.obterRelatorioDistribuicao();
  cache.set('distribuicao', distribuicao);
  return distribuicao;
}
```

---

## Testes Automatizados

### Teste de Unidade

```javascript
// __tests__/automacao.test.js
const AutomacaoAgendador = require('../agendador-inteligente-com-automacao');

describe('AutomacaoAgendador', () => {
  let automacao;

  beforeEach(() => {
    automacao = new AutomacaoAgendador();
  });

  test('deve validar dados de house', () => {
    expect(() => {
      automacao.validarDadosHouse({ clienteId: 'TEST' }); // Falta dados
    }).toThrow('endereco é obrigatório');
  });

  test('deve selecionar melhor equipe', async () => {
    const equipe = await automacao.selecionarEquipeOtimizada({
      endereco: '123 Test',
      city: 'Melbourne',
      state: 'FL'
    });

    expect(equipe).toBeDefined();
    expect(equipe.nome).toMatch(/Equipe [1-3]/);
  });
});
```

### Teste de Integração

```bash
# Executar suite de testes
npm test

# Teste E2E (ponta a ponta)
npm run test:e2e
```

---

## Otimizações Recomendadas

### 1. Usar banco de dados (MongoDB)

```javascript
// models/House.js
const mongoose = require('mongoose');

const houseSchema = new mongoose.Schema({
  id: String,
  clienteId: String,
  equipeId: String,
  endereco: String,
  city: String,
  state: String,
  dataPrevista: Date,
  statusAgendamento: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('House', houseSchema);
```

### 2. Implementar fila de tarefas (Bull/Redis)

```javascript
const Queue = require('bull');
const notificacaoQueue = new Queue('notificacoes', process.env.REDIS_URL);

notificacaoQueue.process(async (job) => {
  console.log(`Enviando notificação: ${job.data.tipo}`);
  await enviarNotificacao(job.data);
});

// Adicionar à fila
notificacaoQueue.add({
  tipo: 'email',
  cliente: 'cliente@email.com',
  assunto: 'Agendamento Confirmado'
});
```

### 3. Implementar GraphQL (alternativa ao REST)

```javascript
const { graphql, buildSchema } = require('graphql');

const schema = buildSchema(`
  type Equipe {
    id: String!
    nome: String!
    totalClientes: Int!
    agendamentosSemanais: Int!
  }

  type Query {
    equipes: [Equipe!]!
    selecionarEquipe(endereco: String!, city: String!): Equipe!
  }

  type Mutation {
    agendarHouse(
      clienteId: String!,
      endereco: String!,
      city: String!,
      state: String!
    ): String!
  }
`);
```

---

## Troubleshooting Avançado

### Debug de Performance

```javascript
// performance-monitor.js
const PerformanceObserver = require('perf_hooks').PerformanceObserver;

const obs = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration.toFixed(2)}ms`);
  });
});

obs.observe({ entryTypes: ['measure'] });

// Em seu código:
performance.mark('inicio-selecao-equipe');
// ... código ...
performance.mark('fim-selecao-equipe');
performance.measure('selecao-equipe', 'inicio-selecao-equipe', 'fim-selecao-equipe');
```

### Logging Estruturado

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'erro.log', level: 'error' }),
    new winston.transports.File({ filename: 'combinado.log' })
  ]
});

logger.info('House agendada', {
  houseId: 'HOUSE-123',
  equipe: 'Equipe 1',
  timestamp: new Date()
});
```

---

## Conclusão

Este sistema oferece:

✅ **Automação Total** - Sem intervenção manual necessária  
✅ **Inteligência** - Considera distância e carga de trabalho  
✅ **Síncronia** - Atualiza múltiplos sistemas automaticamente  
✅ **Notificações** - Cliente e equipe informados instantaneamente  
✅ **Escalabilidade** - Preparado para crescimento  
✅ **Monitoramento** - Rastreie tudo em tempo real  

**Tempo para implementação:** 4-6 horas  
**ROI esperado:** Redução de 80% em tempo administrativo  

