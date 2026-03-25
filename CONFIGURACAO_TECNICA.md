# Documentação Técnica - Hannah AI VAPI Setup

## Arquitetura de Sistema

```
┌─────────────────┐
│  Cliente Twilio │
│  +1 321 384-9782│
└────────┬────────┘
         │
         ↓
┌──────────────────────┐
│   VAPI Platform      │
│ (Phone Number ID:    │
│  02ccb30c-ab0d-4982) │
└────────┬─────────────┘
         │
         ↓
┌──────────────────────┐
│   Railway Server     │
│  (overflowing-heart) │
└────────┬─────────────┘
         │
         ↓
┌──────────────────────┐
│  Hannah AI Assistant │
│  (cleanai-saas)      │
└──────────────────────┘
```

---

## Fluxo de Chamada Telefônica

1. **Cliente disca +1 321 384-9782**
   - Twilio recebe a chamada
   - Twilio roteia para VAPI

2. **VAPI processa a chamada**
   - Consulta Phone Number ID: `02ccb30c-ab0d-4982-87cd-3007e040ea4e`
   - Procura assistente correspondente
   - Inicia webhook para Railway

3. **Railway recebe webhook VAPI**
   - Valida assinatura de webhook
   - Consulta `config/tenants.json`
   - Busca tenant com ID "hannah"
   - Inicia conversa com assistente

4. **Hannah AI responde**
   - Reproduz áudio para cliente
   - Captura entrada de voz
   - Processa linguagem natural
   - Responde e coleta dados

5. **Dados são salvos**
   - Informações de lead salvos em `config/leads.json`
   - Registro de chamada armazenado
   - Webhook de conclusão enviado

---

## Arquivos de Configuração Críticos

### 1. `config/tenants.json`

**Propósito:** Mapear assistentes para VAPI Phone Number IDs

**Conteúdo Atual:**
```json
{
  "tenants": [
    {
      "id": "hannah",
      "vapiPhoneNumberId": "02ccb30c-ab0d-4982-87cd-3007e040ea4e"
    }
  ]
}
```

**Campo Explicado:**
- `tenants`: Array de configurações de assistentes
- `id`: Identificador único do assistente (usado internamente)
- `vapiPhoneNumberId`: ID único da linha Twilio no VAPI

**Como Adicionar Novo Assistente:**
```json
{
  "tenants": [
    {
      "id": "hannah",
      "vapiPhoneNumberId": "02ccb30c-ab0d-4982-87cd-3007e040ea4e"
    },
    {
      "id": "novo_assistente",
      "vapiPhoneNumberId": "NOVO_VAPI_PHONE_NUMBER_ID"
    }
  ]
}
```

### 2. `config/leads.json`

**Propósito:** Armazenar dados coletados em chamadas

**Estrutura:**
```json
{
  "leads": [
    {
      "id": "lead_id_único",
      "assistante": "hannah",
      "telefone_cliente": "+1 321 XXX XXXX",
      "nome": "Nome do Cliente",
      "email": "cliente@email.com",
      "descricao_problema": "Descrição do problema...",
      "status": "novo|contato|agendado|convertido",
      "data_criacao": "2026-03-22T14:30:00Z",
      "data_atualizacao": "2026-03-22T14:35:00Z"
    }
  ]
}
```

### 3. `.env` (Variáveis de Ambiente)

**Variáveis Críticas:**
```
VAPI_PRIVATE_KEY=seu_vapi_private_key_aqui
TWILIO_ACCOUNT_SID=seu_account_sid_twilio
TWILIO_AUTH_TOKEN=seu_auth_token_twilio
```

**Onde Obter:**
- **VAPI Key:** https://dashboard.vapi.ai/settings
- **Twilio SID/Token:** https://console.twilio.com/project/settings

---

## Variáveis de Ambiente Necessárias

| Variável | Descrição | Onde Obter |
|----------|-----------|-----------|
| `VAPI_PRIVATE_KEY` | Chave privada para API VAPI | VAPI Dashboard > Settings |
| `TWILIO_ACCOUNT_SID` | ID da conta Twilio | Twilio Console > Settings |
| `TWILIO_AUTH_TOKEN` | Token de autenticação Twilio | Twilio Console > Settings |
| `RAILWAY_TOKEN` | Token para deploy automático | Railway > Project Settings |
| `NODE_ENV` | Ambiente (production/development) | production |

---

## Endpoints e Webhooks

### Webhook VAPI para Railway

**Endpoint:** `POST /api/vapi-webhook`

**Headers Esperados:**
```
Content-Type: application/json
Authorization: Bearer {VAPI_SIGNATURE}
```

**Body (Exemplo):**
```json
{
  "phoneNumberId": "02ccb30c-ab0d-4982-87cd-3007e040ea4e",
  "status": "ringing|active|ended",
  "call": {
    "id": "call_id_único",
    "startedAt": "2026-03-22T14:30:00Z",
    "endedAt": "2026-03-22T14:35:00Z",
    "duration": 300
  },
  "messages": [
    {
      "role": "user|assistant",
      "content": "Texto da mensagem",
      "timestamp": "2026-03-22T14:30:15Z"
    }
  ]
}
```

---

## Modules do Projeto

### `modules/vapi.js`
- Comunicação com API VAPI
- Roteamento de chamadas
- Validação de webhooks

### `modules/tenantDb.js`
- Carregamento de configuração de tenants
- Busca de assistente por ID
- Gerenciamento de múltiplos assistentes

### `modules/leadDb.js`
- Salvamento de leads coletados
- Atualização de status de leads
- Busca de leads por critério

### `modules/twilioNotify.js`
- Notificações SMS para clientes
- Confirmação de atendimento
- Lembretes de agendamentos

---

## Processo de Deploy

### Pré-requisitos
```bash
git clone https://github.com/seu-user/cleanai-saas.git
cd cleanai-saas
npm install
```

### Estrutura de Branches
```
main (Production)
 ├── Triggers deploy automático no Railway
 ├── Toda alteração faz push para produção
 └── Requer testes antes de merge

develop (Staging)
 └── Branch para testes antes de merge em main
```

### Etapas de Deploy

1. **Desenvolver Localmente**
   ```bash
   git checkout develop
   git pull origin develop
   npm test
   ```

2. **Fazer Commit e Push**
   ```bash
   git add .
   git commit -m "descrição da alteração"
   git push origin develop
   ```

3. **Criar Pull Request**
   - GitHub → Pull Requests → New PR
   - Base: main | Compare: develop
   - Descrever alterações
   - Aguardar review

4. **Merge para Main**
   - Aprovação de review
   - Merge pull request
   - GitHub Actions inicia automaticamente

5. **Railway Deploy**
   - GitHub Actions executa
   - Build da imagem Docker
   - Deploy para produção
   - Servidor inicia com nova configuração

### Verificações Pós-Deploy

```bash
# 1. Verificar status da aplicação
curl https://seu-dominio/health

# 2. Verificar logs do Railway
railway logs -f

# 3. Testar webhook VAPI
curl -X POST https://seu-dominio/api/vapi-webhook \
  -H "Content-Type: application/json" \
  -d '{...}'

# 4. Testar ligação para novo número
# Discar +1 321 384-9782
```

---

## Monitoramento e Logs

### Logs Disponíveis

**Railway Dashboard:**
- Logs em tempo real
- Deploy status
- Métricas de CPU/memória
- Histórico de deployments

**VAPI Dashboard:**
- Histórico de chamadas
- Transcrições de conversa
- Métricas de qualidade
- Logs de erro

**Local (Desenvolvimento):**
```bash
# Ver logs em tempo real
npm start

# Ver logs com mais detalhes
NODE_ENV=development npm start
```

---

## Segurança e Boas Práticas

### Proteção de Credenciais
✅ Nunca commitar `.env` no Git  
✅ Usar variáveis de ambiente no Railway  
✅ Rotacionar tokens regularmente  
✅ Usar autenticação de webhook (VAPI signature)  

### Rate Limiting
- Máximo 100 chamadas/minuto por número
- Máximo 1000 leads/dia por assistente
- Timeout de 30 minutos por chamada

### Validação de Dados
- Validar E-mail antes de salvar
- Sanitizar telefone (apenas dígitos + país)
- Limpar input de texto (remover HTML/scripts)

---

## Troubleshooting Técnico

### Problema: Chamadas não chegam no assistente

**Diagnóstico:**
1. Verificar no VAPI dashboard se phone number está "Active"
2. Confirmar webhook URL correto em VAPI settings
3. Verificar status de deploy no Railway
4. Validar tenants.json está correto

**Logs a Procurar:**
```
[VAPI] Webhook received for phoneNumberId: 02ccb30c-ab0d-4982-87cd-3007e040ea4e
[VAPI] Routing to tenant: hannah
[ASSISTANT] Starting call with Hannah AI
```

### Problema: Servidor não reinicia após deploy

**Solução:**
1. Ir para Railway Dashboard
2. Selecionar projeto "overflowing-heart"
3. Clicar no botão "Restart"
4. Aguardar 30-60 segundos
5. Testar novamente

### Problema: Variáveis de ambiente não carregam

**Solução:**
1. Railway → Project → Variables
2. Verificar se variáveis estão setadas
3. Fazer redeploy
4. Verificar com: `console.log(process.env.VAPI_PRIVATE_KEY)`

---

## Performance e Otimizações

### Tempos Esperados
- Conexão inicial: 2-5 segundos
- Processamento de voz: 1-3 segundos
- Resposta do assistente: 2-5 segundos
- Salvamento de lead: < 1 segundo

### Otimizações Implementadas
- Cache de tenants em memória
- Conexão persistente com VAPI
- Processamento assíncrono de leads
- Compressão de transcrições

---

## Versões de Dependências

```json
{
  "node": ">=18.0.0",
  "express": "^4.18.0",
  "axios": "^1.4.0",
  "dotenv": "^16.0.0"
}
```

---

**Documento Atualizado:** 22 de Março de 2026  
**Versão:** 1.0  
**Próxima Revisão:** 29 de Março de 2026
