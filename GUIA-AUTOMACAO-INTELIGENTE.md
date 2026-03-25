# 🤖 GUIA DE AUTOMAÇÃO INTELIGENTE COM DISTRIBUIÇÃO POR EQUIPE

## O Sistema

Um sistema **totalmente automático** que:

1. ✅ Detecta quando uma nova house é agendada
2. ✅ Calcula a equipe mais próxima (usando Google Maps)
3. ✅ Verifica a carga de trabalho de cada equipe
4. ✅ Distribui para a equipe mais adequada (menor distância + menor carga)
5. ✅ Atualiza simultaneamente no painel agendador E no Gestor Financeiro Pró
6. ✅ Envia email de confirmação para cliente
7. ✅ Envia WhatsApp para cliente E para Fabíola

---

## 🚀 CONFIGURAÇÃO RÁPIDA

### 1. Instalar dependências
```bash
npm install axios nodemailer
```

### 2. Configurar variáveis de ambiente
Copiar `.env.automacao` para `.env` e preencher:

```bash
cp .env.automacao .env
nano .env  # Editar com suas credenciais
```

### 3. Integrar ao servidor
No seu `server.js` ou `app.js`:

```javascript
const express = require('express');
const RotasAutomacaoInteligente = require('./routes-automacao-inteligente');

const app = express();

// ... outros middlewares ...

// Adicionar rotas de automação
const rotasAutomacao = new RotasAutomacaoInteligente();
app.use('/api/automacao', rotasAutomacao.obterRouter());

app.listen(process.env.PORT || 3000);
```

---

## 📋 FLUXO COMPLETO PASSO-A-PASSO

### CENÁRIO: Cliente marca uma house pelo site

```
1️⃣ Cliente marca house no site (lopesservices.top)
   ↓
2️⃣ Sistema recebe dados: endereco, city, state, data
   ↓
3️⃣ PROCESSAMENTO AUTOMÁTICO:
   - Valida dados do cliente
   - Calcula distância até cada equipe (Google Maps)
   - Conta agendamentos atuais de cada equipe
   - Seleciona equipe com melhor score
   ↓
4️⃣ ATUALIZAÇÃO DUAL:
   - Adiciona house ao Painel Agendador
   - Sincroniza com Gestor Financeiro Pró
   ↓
5️⃣ NOTIFICAÇÕES:
   - Email para cliente (confirmação)
   - WhatsApp para cliente (com detalhes)
   - WhatsApp para Fabíola (nova casa atribuída)
   ↓
6️⃣ ✅ PRONTO! Equipe já sabe sobre o trabalho
```

---

## 🔌 ENDPOINTS DE API

### 1. Processar Nova House Agendada
**POST** `/api/automacao/processar-house-agendada`

Payload:
```json
{
  "clienteId": "CLIENTE-123",
  "endereco": "123 Main Street",
  "city": "Melbourne",
  "state": "FL",
  "dataPrevistaServico": "2024-03-30T10:00:00",
  "frequencia": "semanal",
  "latitude": 28.0836,
  "longitude": -80.6063
}
```

Resposta:
```json
{
  "sucesso": true,
  "houseId": "HOUSE-1711814400000",
  "equipe": "Equipe 1",
  "mensagem": "House agendada com sucesso para Equipe 1"
}
```

### 2. Consultar Distribuição das Equipes
**GET** `/api/automacao/distribuicao-equipes`

Resposta:
```json
{
  "titulo": "Distribuição de Equipes",
  "equipes": {
    "Equipe 1": {
      "totalClientes": 27,
      "agendamentosSemanais": 5,
      "receita": 6655.00
    },
    "Equipe 2": {
      "totalClientes": 27,
      "agendamentosSemanais": 3,
      "receita": 4817.22
    },
    "Equipe 3": {
      "totalClientes": 26,
      "agendamentosSemanais": 2,
      "receita": 5080.00
    }
  }
}
```

### 3. Selecionar Equipe (sem agendar)
**GET** `/api/automacao/selecionar-equipe?endereco=123%20Main&city=Melbourne&state=FL`

Resposta:
```json
{
  "equipeSelecionada": "Equipe 2",
  "avaliacaoDetalhada": {
    "distancia": 2.45,
    "agendamentosSemanais": 3,
    "cargaPercentual": 30
  }
}
```

### 4. Simular Distribuição de Múltiplas Houses
**POST** `/api/automacao/simular-distribuicao`

Payload:
```json
{
  "houses": [
    {
      "endereco": "123 Main Street",
      "city": "Melbourne",
      "state": "FL"
    },
    {
      "endereco": "456 Oak Avenue",
      "city": "Palm Bay",
      "state": "FL"
    }
  ]
}
```

### 5. Status do Sistema
**GET** `/api/automacao/status`

Resposta:
```json
{
  "sistema": "Automação Inteligente",
  "status": "ativo",
  "configuracoes": {
    "googleMapsIntegrado": true,
    "whatsappIntegrado": true,
    "gestorFinanceiroIntegrado": true,
    "emailIntegrado": true
  },
  "distribuicaoAtual": { ... }
}
```

---

## 🗺️ ALGORITMO DE SELEÇÃO INTELIGENTE

### Como funciona:

Para cada equipe, calcula um **score final**:

```
SCORE = (Distância × 0.6) + (Agendamentos Atuais × 2)
```

**Menor score = melhor equipe**

### Exemplo com 3 equipes:

| Equipe | Distância | Agendamentos | Score | Resultado |
|--------|-----------|--------------|-------|-----------|
| Equipe 1 | 5.2 km | 6 | 15.12 | ❌ |
| Equipe 2 | 2.1 km | 3 | **7.26** | ✅ **SELECIONADA** |
| Equipe 3 | 8.5 km | 2 | 9.10 | ❌ |

**Equipe 2 vence:** mais perto + menos sobrecarregada

---

## 🌍 INTEGRAÇÃO COM GOOGLE MAPS

### 1. Obter API Key

1. Ir para https://console.cloud.google.com
2. Criar novo projeto
3. Ativar: "Distance Matrix API" + "Maps JavaScript API"
4. Criar credenciais → API Key
5. Copiar para `.env`

```bash
GOOGLE_MAPS_API_KEY=AIzaSyD...seu_key_aqui...
```

### 2. Como funciona

- Usa **Distance Matrix API** para calcular distâncias reais
- Retorna distância em KM entre dois pontos
- Considera tráfego se configurado (`CONSIDERAR_TRAFEGO=true`)
- Fallback automático se API falhar

---

## 💬 INTEGRAÇÃO COM WHATSAPP BUSINESS API

### 1. Configurar WhatsApp Business API

1. Ir para https://www.whatsapp.com/business/
2. Criar aplicativo
3. Obter: `Phone ID` e `Access Token`
4. Adicionar ao `.env`

```bash
WHATSAPP_PHONE_ID=102345...
WHATSAPP_BUSINESS_TOKEN=EAAC...seu_token_aqui...
FABIOLA_WHATSAPP_PHONE=+12025551234
```

### 2. Mensagens Automáticas

**Para o Cliente:**
```
Olá João! 👋

Seu agendamento foi CONFIRMADO! ✅

📍 Local: 123 Main Street, Melbourne, FL
📅 Data: 30/03/2024
👥 Equipe: Equipe 2
🔄 Frequência: Semanal

Obrigado por escolher Fabíola Services! 🏠
```

**Para Fabíola:**
```
🔔 NOVO AGENDAMENTO - Equipe 2

Cliente: João Silva
📍 Local: 123 Main Street, Melbourne, FL
📅 Data: 30/03/2024
💰 Valor: $175.00
☎️ Telefone: (321) 555-1234

Status: Confirmado no sistema ✅
```

---

## 📧 INTEGRAÇÃO COM EMAIL

### 1. Configurar SMTP

Para Gmail:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_aplicacao  # NÃO é sua senha normal
```

**Como gerar senha de aplicação:**
1. Ativar 2FA na conta Google
2. Ir para https://myaccount.google.com/apppasswords
3. Selecionar "Mail" e "Windows Computer"
4. Copiar a senha gerada

### 2. Email de Confirmação

Cliente recebe:
```html
Assunto: ✅ Agendamento Confirmado - Fabíola Services

Olá João,

Seu agendamento foi confirmado com sucesso!

Detalhes:
- Data: 30/03/2024
- Local: 123 Main Street, Melbourne, FL
- Equipe: Equipe 2
- Frequência: Semanal

Entraremos em contato em breve.
Fabíola Services
```

---

## 🔗 SINCRONIZAÇÃO COM GESTOR FINANCEIRO PRÓ

### 1. Configurar conexão

```bash
GESTOR_FINANCEIRO_URL=https://gestor.seu-dominio.com/api
GESTOR_FINANCEIRO_TOKEN=seu_token_aqui
```

### 2. Dados sincronizados

Quando uma house é agendada, o sistema envia:

```json
{
  "acao": "adicionar_agendamento",
  "clienteId": "CLIENTE-123",
  "clienteNome": "João Silva",
  "email": "joao@email.com",
  "telefone": "(321) 555-1234",
  "endereco": "123 Main Street",
  "city": "Melbourne",
  "state": "FL",
  "dataAgendamento": "2024-03-30",
  "equipeResponsavel": "Equipe 2",
  "valor": 175.00,
  "frequencia": "semanal",
  "statusSincronizacao": "pendente_confirmacao"
}
```

### 3. Webhooks (integração reversa)

Gestor Financeiro pode enviar eventos de volta:

**POST** `/api/automacao/webhook/gestor-financeiro`

```json
{
  "acao": "novo_agendamento",
  "clienteId": "CLIENTE-456",
  "dados": { ... house data ... }
}
```

---

## 💾 INTEGRAÇÃO COM LOPESSERVICES.TOP

### Opção 1: API REST (Recomendado)

Se o site tiver API:
```bash
LOPES_SERVICES_INTEGRATION_TYPE=api
LOPES_SERVICES_API_URL=https://api.lopesservices.top/v1
LOPES_SERVICES_API_TOKEN=seu_token_aqui
```

Então:
```javascript
const response = await axios.get(
  `${process.env.LOPES_SERVICES_API_URL}/clientes`,
  { headers: { Authorization: `Bearer ${process.env.LOPES_SERVICES_API_TOKEN}` } }
);
```

### Opção 2: Web Scraping

```bash
LOPES_SERVICES_INTEGRATION_TYPE=scraping
LOPES_SERVICES_URL=https://lopesservices.top
LOPES_SERVICES_USERNAME=seu_usuario
LOPES_SERVICES_PASSWORD=sua_senha
```

Usar biblioteca `puppeteer`:
```javascript
npm install puppeteer
```

### Opção 3: Upload de CSV

```bash
LOPES_SERVICES_INTEGRATION_TYPE=csv
```

E fazer upload via endpoint:
```
POST /api/automacao/importar-clientes
```

---

## 🧪 TESTANDO A AUTOMAÇÃO

### 1. Verificar status do sistema
```bash
curl http://localhost:3000/api/automacao/status
```

### 2. Simular novo agendamento
```bash
curl -X POST http://localhost:3000/api/automacao/processar-house-agendada \
  -H "Content-Type: application/json" \
  -d '{
    "clienteId": "CLIENTE-789",
    "endereco": "999 Test Lane",
    "city": "Melbourne",
    "state": "FL",
    "dataPrevistaServico": "2024-03-31T10:00:00",
    "frequencia": "semanal"
  }'
```

### 3. Consultar distribuição
```bash
curl http://localhost:3000/api/automacao/distribuicao-equipes
```

### 4. Testar seleção de equipe
```bash
curl "http://localhost:3000/api/automacao/selecionar-equipe?endereco=123%20Main&city=Melbourne&state=FL"
```

---

## ⚙️ CONFIGURAÇÕES AVANÇADAS

### Limitar carga por equipe
```bash
MAX_AGENDAMENTOS_SEMANA=10  # Máximo 10 por semana
```

### Considerar horário de trabalho
```bash
HORARIO_INICIO=08:00
HORARIO_FIM=17:00
DIAS_TRABALHO=1,2,3,4,5  # Seg-Sex
```

### Raio de distância máxima
```bash
MAX_DISTANCIA_EQUIPE=30  # 30 km
```

### Timezone
```bash
TIMEZONE=America/New_York
```

---

## 🚨 TROUBLESHOOTING

### "Google Maps API Error"
- Verificar se API Key é válida
- Verificar se Distance Matrix API está ativada
- Verificar se a key tem permissões corretas

### "WhatsApp: Invalid Token"
- Verificar token no painel do WhatsApp Business
- Verificar se Phone ID está correto
- Testar manualmente no sandbox

### "Gestor Financeiro: Timeout"
- Verificar se URL é acessível
- Verificar se token está válido
- Verificar conectividade de rede

### "Email não é enviado"
- Verificar credenciais SMTP
- Para Gmail: verificar se senha de aplicação foi gerada
- Verificar se menos segurança está ativada
- Verificar logs de erro

---

## 📊 MONITORAMENTO

### Logs disponíveis
```bash
tail -f logs/automacao.log
```

### Métricas por equipe
```bash
curl http://localhost:3000/api/automacao/distribuicao-equipes | jq
```

### Health check
```bash
curl http://localhost:3000/api/automacao/status
```

---

## 🔐 SEGURANÇA

### Ativar API Key em produção
```javascript
// No servidor, verificar API key
app.use('/api/automacao', (req, res, next) => {
  if (req.headers['x-api-key'] !== process.env.API_KEY) {
    return res.status(401).json({ erro: 'Não autorizado' });
  }
  next();
});
```

### Usar HTTPS em produção
```bash
NODE_ENV=production
HTTPS=true
```

### Limpar logs antigos
```bash
LOG_RETENTION_DAYS=30
```

---

## 📞 SUPORTE

Para dúvidas ou problemas:
1. Verificar logs: `tail -f logs/`
2. Testar endpoints manualmente
3. Verificar configurações em `.env`
4. Consultar documentação da API

