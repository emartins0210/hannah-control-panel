# CleanAI SaaS — Deploy Guide

## Deploy em 4 passos

### PASSO 1 — Subir no GitHub
1. github.com → repositório `cleanai-saas`
2. Upload de todos os arquivos deste ZIP
3. Commit → Railway redeploya automaticamente

### PASSO 2 — Variáveis no Railway
railway.app → projeto → Variables → adicionar:

```
# Obrigatórias
VAPI_API_KEY              = dashboard.vapi.ai → Settings → API Keys
VAPI_PHONE_NUMBER_ID      = dashboard.vapi.ai → Phone Numbers → ID
ADMIN_SECRET              = CleanAI@2026!  (ou outra senha forte)
PUBLIC_URL                = https://cleanai-saas-production.up.railway.app
PORT                      = 3000

# Twilio
TWILIO_ACCOUNT_SID        = console.twilio.com → Account Info
TWILIO_AUTH_TOKEN         = console.twilio.com → Account Info
TWILIO_PHONE_NUMBER       = +1XXXXXXXXXX  (número SMS)
TWILIO_WHATSAPP_NUMBER    = whatsapp:+14155238886  (sandbox) ou aprovado
FABIOLA_WHATSAPP          = +13215557880  (número da Fabíola)
FABIOLA_PHONE             = +13215557880  (mesmo número)

# Google Calendar
GOOGLE_SERVICE_ACCOUNT_EMAIL = xxx@projeto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY           = -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
GOOGLE_CALENDAR_ID           = xxx@group.calendar.google.com

# Opcional
COMPANY_REVIEW_LINK       = https://g.page/r/seu-link-google
```

### PASSO 3 — Rodar o setup automático
No Railway → projeto → Settings → Deploy → adicionar Start Command:
```
node setup.js && node server.js
```
Isso cria o tenant da Lopes Cleaning e configura o Vapi automaticamente.

Após o primeiro deploy com sucesso, mude o Start Command de volta para:
```
node server.js
```

### PASSO 4 — Configurar webhook no Vapi
1. dashboard.vapi.ai → Assistants → Hannah (Lopes Cleaning)
2. Advanced → Server URL:
```
https://cleanai-saas-production.up.railway.app/api/vapi/webhook/[TENANT-ID]
```
O TENANT-ID aparece nos logs do setup ou em Admin Panel → Companies → Details.

---

## URLs do sistema

| URL | Descrição |
|-----|-----------|
| /admin | Painel administrativo (você) |
| /client | Painel da Fabíola |
| /health | Health check |
| /api/webhook/:key | Recebe leads do formulário |
| /api/vapi/webhook/:tenantId | Recebe eventos do Vapi |

## Acesso da Fabíola
- URL: https://cleanai-saas-production.up.railway.app/client
- Email: lopesservicescleaning@gmail.com
- Senha: LopesClean#2026!

## Fluxo completo
```
Cliente preenche formulário no site
→ CleanAI recebe via webhook
→ Hannah liga em < 30 segundos
→ SPIN Selling + 4 técnicas de fechamento
→ Booking confirmado:
   • SMS de confirmação para o cliente
   • Evento no Google Calendar da Fabíola
   • WhatsApp para a Fabíola
   • Lembrete SMS 24h antes
   • Follow-up SMS dia seguinte

Ligação direta para o número:
→ Hannah atende
→ Reconhece cliente pelo telefone
→ Resolve: remarcação / cancelamento / orçamento / reclamação
→ Urgente: Liga para Fabíola + WhatsApp
→ Informativo: Só WhatsApp
```
