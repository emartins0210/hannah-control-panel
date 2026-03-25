# 🚀 Instruções de Implementação Completa - Hannah 3.0

**Objetivo**: Implementar 4 módulos críticos em 2-3 horas  
**Dificuldade**: Intermediária  
**Requisitos**: Node.js 14+, acesso ao Railway, API keys das plataformas  

---

## 📋 PRÉ-REQUISITOS

### 1. Verificar Node.js
```bash
node --version  # Deve ser v14 ou superior
npm --version   # Deve ser v6 ou superior
```

### 2. Obter API Keys (Antes de Começar!)

#### Google Ads API
```
1. Acesse: https://ads.google.com/aw/
2. Vá para: Admin → API Center
3. Crie uma aplicação OAuth
4. Copie:
   - Client ID
   - Client Secret
   - Developer Token
   - Refresh Token
   - Customer ID (seu account number)
```

#### Facebook Ads API
```
1. Acesse: https://developers.facebook.com/
2. Crie uma app (tipo: Business)
3. Adicione "Marketing API"
4. Copie:
   - Access Token (do app)
   - Business Account ID
   - Ad Account ID
```

#### Adicionar no .env
```bash
# Google Ads
GOOGLE_ADS_CLIENT_ID=seu_client_id.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=seu_client_secret
GOOGLE_ADS_DEVELOPER_TOKEN=seu_developer_token
GOOGLE_ADS_REFRESH_TOKEN=seu_refresh_token
GOOGLE_ADS_CUSTOMER_ID=1234567890
GOOGLE_ADS_LOGIN_CUSTOMER_ID=1234567890

# Facebook Ads
FACEBOOK_ADS_ACCESS_TOKEN=seu_access_token
FACEBOOK_BUSINESS_ACCOUNT_ID=seu_business_account_id
FACEBOOK_AD_ACCOUNT_ID=seu_ad_account_id
```

---

## 🔧 MÓDULO 1: HEALTH MONITOR AUTOMÁTICO

### O Que Faz?
- ✅ Verifica saúde do servidor a cada 5 minutos
- ✅ Monitora CPU, memória, uptime
- ✅ Cria alertas se recursos ficam críticos
- ✅ Endpoint `/health` para verificação rápida

### Passo 1: Copiar Arquivo

**Arquivo**: `modules_health-monitor.js`  
**Localização no Projeto**: `/modules/health-monitor.js`

```bash
# No seu projeto:
mkdir -p modules
cp modules_health-monitor.js modules/
```

### Passo 2: Adicionar ao server.js

**Abra**: `server.js`

**Adicione ao topo** (com os outros requires):
```javascript
const healthMonitor = require('./modules/health-monitor');
```

**Após criar a aplicação Express** (logo depois de `const app = express()`):
```javascript
// Health Monitoring
healthMonitor.startMonitoring();
healthMonitor.attachToExpress(app);
```

### Passo 3: Testar Localmente

```bash
npm start

# Em outro terminal:
curl http://localhost:3000/health
```

**Resposta esperada**:
```json
{
  "status": "✓ Healthy",
  "uptime": "02:15:34",
  "cpu": "12.5%",
  "memory": "185 MB / 512 MB",
  "timestamp": "2026-03-22T15:30:00Z"
}
```

### Passo 4: Deploy no Railway

```bash
git add modules/health-monitor.js server.js
git commit -m "feat: add health monitoring"
git push origin main
# Railway faz deploy automático
```

✅ **Health Monitor está ativo!**

---

## 💾 MÓDULO 2: BACKUP AUTOMÁTICO

### O Que Faz?
- ✅ Cria backup de config/leads.json a cada hora
- ✅ Mantém últimos 30 dias de backup
- ✅ Recuperação automática em caso de emergência
- ✅ Limpa backups antigos automaticamente

### Passo 1: Copiar Arquivo

**Arquivo**: `modules_backup-manager.js`  
**Localização no Projeto**: `/modules/backup-manager.js`

```bash
mkdir -p modules backup
cp modules_backup-manager.js modules/
```

### Passo 2: Adicionar ao server.js

**Abra**: `server.js`

**Adicione ao topo**:
```javascript
const backupManager = require('./modules/backup-manager');
```

**Após inicializar healthMonitor**:
```javascript
// Automatic Backups
backupManager.startAutomaticBackups();
```

### Passo 3: Testar Localmente

```bash
npm start

# Em outro terminal - forçar backup manual:
curl -X POST http://localhost:3000/api/backup/manual
```

**Resposta esperada**:
```json
{
  "success": true,
  "message": "Backup created",
  "backupFile": "/backup/leads_2026-03-22T15-30-00Z.json",
  "size": "2.3 MB"
}
```

### Passo 4: Criar Pasta de Backup no Railway

```bash
# Adicione ao .gitignore (não versionar backups):
echo "backup/" >> .gitignore

# Crie a pasta:
mkdir -p backup

git add modules/backup-manager.js server.js .gitignore
git commit -m "feat: add automatic backup system"
git push origin main
```

✅ **Backup está ativo!**

---

## 🎨 MÓDULO 3: INTEGRAÇÃO GOOGLE ADS

### O Que Faz?
- ✅ Puxa dados de campanhas do Google Ads
- ✅ Rastreia clicks, impressões, conversões
- ✅ Calcula ROI por campanha
- ✅ Sincroniza com leads a cada hora

### Passo 1: Copiar Arquivo

**Arquivo**: `modules_google-ads-integration.js`  
**Localização no Projeto**: `/modules/google-ads-integration.js`

```bash
cp modules_google-ads-integration.js modules/
```

### Passo 2: Instalar Dependência

```bash
npm install axios
```

### Passo 3: Adicionar ao server.js

**Abra**: `server.js`

**Adicione ao topo**:
```javascript
const GoogleAdsIntegration = require('./modules/google-ads-integration');
```

**Após inicializar outros módulos**:
```javascript
// Google Ads Integration
const googleAds = new GoogleAdsIntegration();
googleAds.initialize().catch(err => {
  console.error('Google Ads initialization failed:', err.message);
});

// Endpoint para obter relatório
app.get('/api/google-ads/report', (req, res) => {
  const report = googleAds.getPerformanceReport();
  res.json(report);
});
```

### Passo 4: Adicionar Variáveis de Ambiente

**Arquivo**: `.env` (Railway ou local)

```bash
GOOGLE_ADS_CLIENT_ID=xxxxx
GOOGLE_ADS_CLIENT_SECRET=xxxxx
GOOGLE_ADS_DEVELOPER_TOKEN=xxxxx
GOOGLE_ADS_REFRESH_TOKEN=xxxxx
GOOGLE_ADS_CUSTOMER_ID=1234567890
GOOGLE_ADS_LOGIN_CUSTOMER_ID=1234567890
```

### Passo 5: Testar

```bash
npm start

# Em outro terminal:
curl http://localhost:3000/api/google-ads/report
```

**Resposta esperada**:
```json
{
  "timestamp": "2026-03-22T15:30:00Z",
  "totalSpent": "1250.50",
  "totalClicks": 3421,
  "totalConversions": 143,
  "averageCPC": "0.37",
  "campaigns": [
    {
      "id": "123456789",
      "name": "Florida Cleaning Services",
      "clicks": 1200,
      "impressions": 15000,
      "conversions": 52,
      "spend": "450.00",
      "cpc": "0.38",
      "conversionRate": "4.33"
    }
  ]
}
```

### Passo 6: Deploy

```bash
git add modules/google-ads-integration.js server.js
git commit -m "feat: add Google Ads API integration"
git push origin main
```

✅ **Google Ads está integrado!**

---

## 📱 MÓDULO 4: INTEGRAÇÃO FACEBOOK ADS

### O Que Faz?
- ✅ Puxa dados de campanhas do Facebook/Meta Ads
- ✅ Rastreia gastos, impressões, cliques
- ✅ Cálculo de ROI por campanha
- ✅ Sincroniza com leads a cada hora

### Passo 1: Copiar Arquivo

**Arquivo**: `modules_facebook-ads-integration.js`  
**Localização no Projeto**: `/modules/facebook-ads-integration.js`

```bash
cp modules_facebook-ads-integration.js modules/
```

### Passo 2: Adicionar ao server.js

**Abra**: `server.js`

**Adicione ao topo**:
```javascript
const FacebookAdsIntegration = require('./modules/facebook-ads-integration');
```

**Após Google Ads**:
```javascript
// Facebook Ads Integration
const facebookAds = new FacebookAdsIntegration();
facebookAds.initialize().catch(err => {
  console.error('Facebook Ads initialization failed:', err.message);
});

// Endpoint para relatório
app.get('/api/facebook-ads/report', (req, res) => {
  const report = facebookAds.getPerformanceReport();
  res.json(report);
});
```

### Passo 3: Adicionar Variáveis de Ambiente

**Arquivo**: `.env`

```bash
FACEBOOK_ADS_ACCESS_TOKEN=xxxxx
FACEBOOK_BUSINESS_ACCOUNT_ID=xxxxx
FACEBOOK_AD_ACCOUNT_ID=act_xxxxx
```

### Passo 4: Testar

```bash
npm start

# Em outro terminal:
curl http://localhost:3000/api/facebook-ads/report
```

**Resposta esperada**:
```json
{
  "timestamp": "2026-03-22T15:30:00Z",
  "totalSpent": "850.25",
  "totalImpressions": 45000,
  "totalClicks": 2100,
  "totalConversions": 98,
  "averageCPC": "0.40",
  "averageCPL": "8.68",
  "campaigns": [
    {
      "id": "120456789",
      "name": "Texas Cleaning Campaign",
      "status": "ACTIVE",
      "spend": "350.00",
      "impressions": 18000,
      "clicks": 850,
      "ctr": "4.72",
      "cpc": "0.41",
      "conversions": 42
    }
  ]
}
```

### Passo 5: Deploy

```bash
git add modules/facebook-ads-integration.js server.js
git commit -m "feat: add Facebook Ads API integration"
git push origin main
```

✅ **Facebook Ads está integrado!**

---

## 🎯 IMPLEMENTAÇÃO COMPLETA - CHECKLIST

### Health Monitor (20 minutos)
- [ ] Copiar `modules_health-monitor.js` para `/modules/`
- [ ] Adicionar require ao `server.js`
- [ ] Adicionar inicialização ao `server.js`
- [ ] Testar localmente: `curl http://localhost:3000/health`
- [ ] Commit e push no GitHub

### Backup Automático (20 minutos)
- [ ] Copiar `modules_backup-manager.js` para `/modules/`
- [ ] Criar pasta `/backup` se não existir
- [ ] Adicionar require ao `server.js`
- [ ] Adicionar inicialização ao `server.js`
- [ ] Adicionar `/backup` ao `.gitignore`
- [ ] Testar localmente
- [ ] Commit e push no GitHub

### Google Ads (30 minutos)
- [ ] Copiar `modules_google-ads-integration.js` para `/modules/`
- [ ] `npm install axios`
- [ ] Adicionar require ao `server.js`
- [ ] Adicionar inicialização ao `server.js`
- [ ] Adicionar endpoint `/api/google-ads/report`
- [ ] Obter API keys do Google Ads
- [ ] Adicionar variáveis ao `.env` (local e Railway)
- [ ] Testar localmente
- [ ] Commit e push no GitHub

### Facebook Ads (30 minutos)
- [ ] Copiar `modules_facebook-ads-integration.js` para `/modules/`
- [ ] Adicionar require ao `server.js`
- [ ] Adicionar inicialização ao `server.js`
- [ ] Adicionar endpoint `/api/facebook-ads/report`
- [ ] Obter API keys do Facebook Ads
- [ ] Adicionar variáveis ao `.env` (local e Railway)
- [ ] Testar localmente
- [ ] Commit e push no GitHub

### Validação Final (10 minutos)
- [ ] Todos os 4 módulos inicializam sem erros
- [ ] Health check retorna dados
- [ ] Backup acontece a cada hora
- [ ] Google Ads report funciona
- [ ] Facebook Ads report funciona
- [ ] Railway deploy bem-sucedido
- [ ] Logs não mostram erros críticos

---

## 🔍 VERIFICAÇÃO PÓS-IMPLEMENTAÇÃO

### Health Monitor
```bash
curl http://hannah.railway.app/health
# Deve retornar JSON com status ✓ Healthy
```

### Backup
```bash
# Verificar se backups estão sendo criados:
ls -la backup/ | head -10
# Deve mostrar arquivos de backup com timestamp
```

### Google Ads
```bash
curl https://hannah.railway.app/api/google-ads/report
# Deve retornar campanhas do Google Ads com métricas
```

### Facebook Ads
```bash
curl https://hannah.railway.app/api/facebook-ads/report
# Deve retornar campanhas do Facebook Ads com métricas
```

---

## 📊 LOGS E MONITORAMENTO

### Ver Logs no Railway

```bash
# Em tempo real:
railway logs

# Filtrar por módulo:
railway logs | grep "Google Ads"
railway logs | grep "Facebook Ads"
railway logs | grep "Backup"
railway logs | grep "Health"
```

### Alertas Esperados
- ✅ `[Google Ads] ✓ Inicializado`
- ✅ `[Facebook Ads] ✓ Inicializado`
- ✅ `[Backup] ✓ Inicializado`
- ✅ `[Health Monitor] ✓ Inicializado`

### Erros Comuns e Soluções

**Erro**: `Module not found: google-ads-integration`
**Solução**: Verificar se arquivo está em `/modules/`

**Erro**: `401 Unauthorized` (Google Ads)
**Solução**: Verificar token de acesso e refresh token

**Erro**: `401 Unauthorized` (Facebook Ads)
**Solução**: Verificar Access Token e se still válido

**Erro**: `ENOENT: no such file or directory 'config/leads.json'`
**Solução**: Criar arquivo: `touch config/leads.json`

---

## 🚀 PRÓXIMOS PASSOS

### Hoje (Depois de implementar)
- ✅ Verificar que todos os módulos estão rodando
- ✅ Confirmar que não há erros nos logs
- ✅ Testar endpoints no navegador/curl

### Amanhã
- ✅ Revisar primeiro relatório de Google Ads
- ✅ Revisar primeiro relatório de Facebook Ads
- ✅ Verificar que backups foram criados

### Esta Semana
- ✅ Ajustar alertas conforme necessário
- ✅ Integrar com dashboard CRM
- ✅ Implementar notificações de performance

---

## 📞 SUPORTE

**Se algo não funcionar**:
1. Verificar logs: `railway logs`
2. Verificar se variáveis `.env` estão corretas
3. Verificar API keys com a plataforma original
4. Reiniciar aplicação: `railway deploy`
5. Verificar internet connection

**Arquivo de referência**: RELATORIO_CAPACIDADES_HANNAH_3.0.md

---

**Tempo Total Estimado**: 2-3 horas  
**Dificuldade**: ⭐⭐⭐ Intermediária  
**Valor Gerado**: ROI rastreado em tempo real!  

**Você está pronto para começar! 🚀**
