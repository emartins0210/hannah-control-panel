# ✅ IMPLEMENTAÇÃO: AUTOMAÇÃO INTELIGENTE COM SINCRONIZAÇÃO

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### FASE 1: PREPARAÇÃO (30 min)

- [ ] Fazer backup dos arquivos atuais
```bash
cp -r . ./backup-$(date +%Y%m%d)
```

- [ ] Instalar dependências adicionais necessárias
```bash
npm install axios nodemailer
npm install --save-dev dotenv
```

- [ ] Criar arquivo `.env` a partir do template
```bash
cp .env.automacao .env
```

---

### FASE 2: CONFIGURAÇÃO (1-2 horas)

#### 2.1 Google Maps API 🗺️
- [ ] Acessar https://console.cloud.google.com
- [ ] Criar novo projeto
- [ ] Ativar APIs:
  - [ ] Distance Matrix API
  - [ ] Maps JavaScript API
- [ ] Criar credenciais → API Key
- [ ] Copiar chave para `.env`:
```bash
GOOGLE_MAPS_API_KEY=SUA_CHAVE_AQUI
```
- [ ] Adicionar restrições de API key (segurança)

#### 2.2 WhatsApp Business API 💬
- [ ] Registrar em https://www.whatsapp.com/business/
- [ ] Configurar WhatsApp Business App
- [ ] Obter:
  - [ ] Phone ID
  - [ ] Access Token (token válido por 24 horas)
  - [ ] Criar token permanente se possível
- [ ] Adicionar ao `.env`:
```bash
WHATSAPP_PHONE_ID=seu_id_aqui
WHATSAPP_BUSINESS_TOKEN=seu_token_aqui
FABIOLA_WHATSAPP_PHONE=+12025551234  # Com código do país
```
- [ ] Testar enviando mensagem de teste

#### 2.3 Email SMTP 📧
- [ ] Escolher provedor (Gmail, SendGrid, etc)
- [ ] Para Gmail:
  - [ ] Ativar autenticação em 2 etapas
  - [ ] Gerar "Senha de Aplicação" (não é a senha normal)
  - [ ] https://myaccount.google.com/apppasswords
- [ ] Adicionar ao `.env`:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_de_aplicacao
SMTP_FROM=noreply@fabiolaservices.com
```
- [ ] Testar enviando email de teste

#### 2.4 Gestor Financeiro Pró 💼
- [ ] Obter URL da API do Gestor Financeiro
- [ ] Gerar token de autenticação no painel
- [ ] Testar acesso com cURL:
```bash
curl -X GET \
  https://gestor.seu-dominio.com/api/clientes \
  -H "Authorization: Bearer SEU_TOKEN"
```
- [ ] Adicionar ao `.env`:
```bash
GESTOR_FINANCEIRO_URL=https://gestor.seu-dominio.com/api
GESTOR_FINANCEIRO_TOKEN=seu_token_aqui
```

#### 2.5 Localidades e Coordenadas 📍
- [ ] Atualizar endereços dos clientes com coordenadas (latitude/longitude)
- [ ] Usar Google Maps Geocoding API ou obter manualmente
- [ ] Formato esperado em `clientes.json`:
```json
{
  "id": "CLIENTE-123",
  "firstName": "João",
  "lastName": "Silva",
  "endereco": "123 Main Street",
  "city": "Melbourne",
  "state": "FL",
  "latitude": 28.0836,
  "longitude": -80.6063,
  "charge": 175.00
}
```

---

### FASE 3: INTEGRAÇÃO DE CÓDIGO (1 hora)

#### 3.1 Copiar arquivos
- [ ] Copiar `agendador-inteligente-com-automacao.js` para raiz do projeto
- [ ] Copiar `routes-automacao-inteligente.js` para raiz do projeto
- [ ] Copiar `painel-automacao-inteligente.html` para a pasta `public/`

#### 3.2 Atualizar servidor principal
- [ ] Opção A: Usar `server-com-automacao.js`
  - [ ] Renomear `server.js` → `server-backup.js`
  - [ ] Renomear `server-com-automacao.js` → `server.js`
  - [ ] Testar: `npm start`

- [ ] Opção B: Adicionar manualmente ao `server.js` existente
  ```javascript
  const RotasAutomacaoInteligente = require('./routes-automacao-inteligente');
  const rotasAutomacao = new RotasAutomacaoInteligente();
  app.use('/api/automacao', rotasAutomacao.obterRouter());
  ```

#### 3.3 Verificar estrutura de pastas
- [ ] Pasta `dados-clientes/` existe
- [ ] Arquivos `clientes.json` e `equipes.json` estão presentes
- [ ] Pasta `public/` existe
- [ ] `painel-automacao-inteligente.html` está em `public/`

---

### FASE 4: TESTES (30 min)

#### 4.1 Iniciar servidor
```bash
npm start
```

- [ ] Servidor iniciado sem erros
- [ ] Vê mensagem de boas-vindas com módulos carregados
- [ ] Health check: `curl http://localhost:3000/health`

#### 4.2 Testar painel de automação
- [ ] Abrir http://localhost:3000/painel-automacao-inteligente.html
- [ ] Verificar status das integrações
- [ ] Distribuição das equipes mostra corretamente

#### 4.3 Testar endpoints
```bash
# Status do sistema
curl http://localhost:3000/api/automacao/status

# Distribuição das equipes
curl http://localhost:3000/api/automacao/distribuicao-equipes

# Selecionar equipe
curl "http://localhost:3000/api/automacao/selecionar-equipe?endereco=123%20Main&city=Melbourne&state=FL"
```

#### 4.4 Testar agendamento completo
```bash
curl -X POST http://localhost:3000/api/automacao/processar-house-agendada \
  -H "Content-Type: application/json" \
  -d '{
    "clienteId": "CLIENTE-TEST",
    "endereco": "123 Test Street",
    "city": "Melbourne",
    "state": "FL",
    "dataPrevistaServico": "2024-04-01T10:00:00",
    "frequencia": "semanal"
  }'
```

- [ ] Resposta com sucesso (status 201)
- [ ] House foi atribuída a uma equipe
- [ ] Email foi enviado (verificar logs)
- [ ] WhatsApp foi enviado (verificar logs)
- [ ] Gestor Financeiro foi atualizado (se configurado)

---

### FASE 5: INTEGRAÇÃO COM SITE (2-3 horas)

#### 5.1 Obter dados de lopesservices.top

**Opção A: API REST**
- [ ] Verificar se site possui API
- [ ] Documentação: `/api/docs`
- [ ] Autenticação: obter token
- [ ] Implementar cliente:
```javascript
const axios = require('axios');

async function obterClientesDoSite() {
  const res = await axios.get(
    `${process.env.LOPES_SERVICES_API_URL}/clientes`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.LOPES_SERVICES_API_TOKEN}`
      }
    }
  );
  return res.data;
}
```

**Opção B: Web Scraping**
- [ ] Instalar puppeteer: `npm install puppeteer`
- [ ] Criar script de scraping:
```javascript
const puppeteer = require('puppeteer');

async function obterClientesDoSite() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://lopesservices.top');
  const clientes = await page.evaluate(() => {
    // Extrair dados da página
    return document.querySelectorAll('.cliente').map(el => ({
      name: el.querySelector('.name').textContent,
      phone: el.querySelector('.phone').textContent,
      // ... outros campos
    }));
  });
  await browser.close();
  return clientes;
}
```

**Opção C: CSV Upload**
- [ ] Criar endpoint para upload de CSV
- [ ] Usar biblioteca `csv-parse`
- [ ] Endpoint: `POST /api/importar-csv`

#### 5.2 Sincronizar clientes
- [ ] Criar script: `sincronizar-clientes-site.js`
- [ ] Executar:
```bash
node sincronizar-clientes-site.js
```
- [ ] Validar dados importados
- [ ] Verificar se coordenadas estão presentes

#### 5.3 Webhook do site para sistema
- [ ] Configurar webhook no site para enviar eventos de novo agendamento
- [ ] Endpoint: `POST /api/automacao/webhook/site`
- [ ] Payload esperado:
```json
{
  "evento": "novo_agendamento",
  "cliente": {
    "id": "CLIENTE-123",
    "nome": "João Silva",
    "email": "joao@email.com",
    "telefone": "(321) 555-1234"
  },
  "house": {
    "endereco": "123 Main Street",
    "city": "Melbourne",
    "state": "FL",
    "dataPrevista": "2024-04-01"
  }
}
```

---

### FASE 6: DEPLOYMENT (30 min)

#### 6.1 Preparar para produção

- [ ] Atualizar `.env`:
```bash
NODE_ENV=production
API_KEY=gerar_chave_segura_aleatoria
DEBUG=false
```

- [ ] Verificar variáveis críticas:
  - [ ] GOOGLE_MAPS_API_KEY ✅
  - [ ] WHATSAPP_BUSINESS_TOKEN ✅
  - [ ] SMTP_HOST e SMTP_PASS ✅
  - [ ] GESTOR_FINANCEIRO_URL ✅

- [ ] Testar novamente localmente

#### 6.2 Fazer deploy

**Opção A: Render.com (Recomendado)**
```bash
# Fazer push para GitHub
git add .
git commit -m "chore: adicionar automacao inteligente"
git push origin main

# Conectar no Render.com e fazer deploy automático
```

**Opção B: Docker**
```bash
docker build -t fabiosystem .
docker run -p 3000:3000 --env-file .env fabiosystem
```

#### 6.3 Testar em produção
- [ ] Acessar sistema via URL pública
- [ ] Testar agendamento completo
- [ ] Verificar se email chega
- [ ] Verificar se WhatsApp é enviado
- [ ] Verificar sincronização com Gestor Financeiro

---

### FASE 7: MONITORAMENTO (Contínuo)

#### 7.1 Logging
- [ ] Configurar logs:
```bash
LOG_DIR=./logs
LOG_RETENTION_DAYS=30
DEBUG=true  # Apenas em desenvolvimento
```

- [ ] Ver logs:
```bash
tail -f logs/automacao.log
```

#### 7.2 Alertas
- [ ] Configurar notificação de erros
- [ ] Monitorar API limits das integrações
- [ ] Verificar quotas:
  - Google Maps: 25,000 requisições/dia
  - WhatsApp: limite do plano
  - Emails: limite do SMTP

#### 7.3 Métricas
- [ ] Verificar distribuição semanal
- [ ] Taxa de sucesso de notificações
- [ ] Tempo de resposta do sistema
- [ ] Erros de integração

---

## 🚀 TESTE RÁPIDO FINAL

Se tudo foi configurado corretamente, este fluxo deve funcionar:

```bash
# 1. Iniciar servidor
npm start

# 2. Verificar status (em outro terminal)
curl http://localhost:3000/api/automacao/status

# 3. Simular agendamento
curl -X POST http://localhost:3000/api/automacao/processar-house-agendada \
  -H "Content-Type: application/json" \
  -d '{
    "clienteId": "CLIENTE-001",
    "endereco": "999 Demo Lane",
    "city": "Melbourne",
    "state": "FL",
    "dataPrevistaServico": "2024-04-15T10:00:00"
  }'

# 4. Verificar distribuição
curl http://localhost:3000/api/automacao/distribuicao-equipes | jq

# 5. Abrir painel
# Acesse: http://localhost:3000/painel-automacao-inteligente.html
```

---

## 🆘 TROUBLESHOOTING RÁPIDO

| Problema | Solução |
|----------|---------|
| "Cannot find module 'axios'" | `npm install axios` |
| "Google Maps error" | Verificar API Key em `.env` |
| "WhatsApp: Unauthorized" | Verificar token e Phone ID |
| "Email não é enviado" | Verificar SMTP em `.env`, testar senha |
| "Gestor Financeiro timeout" | Verificar URL e conectividade |
| "CORS error" | Verificar CORS_ORIGIN em `.env` |
| "Port 3000 já em uso" | `lsof -i :3000` e matar processo |

---

## 📞 PRÓXIMOS PASSOS

1. ✅ Completar todas as fases acima
2. ✅ Testar com clientes reais
3. ✅ Monitorar logs por 1-2 semanas
4. ✅ Otimizar baseado em feedback
5. ✅ Documentar processos internos
6. ✅ Treinar equipe (opcional)

---

**Total estimado: 4-6 horas para implementação completa** ⏱️

