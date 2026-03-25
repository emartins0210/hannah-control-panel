# 🛡️ Plano de Proteção - Sistema Hannah AI Self-Healing

**Data:** 22 de Março de 2026  
**Status:** Pronto para Implementação  
**Complexidade:** Média  
**Tempo de Setup:** 30 minutos

---

## 📋 Visão Geral

Sistema completo de **auto-proteção** para Hannah AI que garante:
- ✅ **Monitoramento 24/7** - Saúde do servidor
- ✅ **Backup Automático** - Dados salvos a cada 1 hora
- ✅ **Limpeza Inteligente** - Remove dados antigos automaticamente
- ✅ **Alertas Automáticos** - Você fica sabendo se algo quebra
- ✅ **Auto-Recuperação** - Sistema tenta se arrumar sozinho

Resultado: Sistema que **nunca fica quebrado** 🚀

---

## 🏗️ Arquitetura de Proteção

```
┌──────────────────────────────────────────────────────┐
│         HANNAH AI MAIN SERVER                         │
│  (Recebe ligações, processa dados, responde clientes)│
└─────────────────────┬────────────────────────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
    ┌────▼─────┐  ┌──▼────┐  ┌──▼────┐
    │ MONITOR   │  │BACKUP │  │CLEANUP│
    │ (5 min)   │  │(1 hr) │  │(1 dia)│
    └────┬─────┘  └──┬────┘  └──┬────┘
         │           │          │
    [Logs]      [Backup/]  [Remove old]
    [Alerts]    [History]  [Optimize]
```

---

## 📦 Componentes do Sistema

### 1. **Health Monitor** (health-monitor.js)

**O que faz:**
- Verifica se servidor está respondendo a cada 5 minutos
- Monitora uso de memória
- Monitora CPU
- Registra tudo em logs

**Se problema detectado:**
- Registra erro em log
- Se 5+ erros = alerta crítico
- Tenta forçar garbage collection

**Arquivo:** `modules/health-monitor.js` ✅ CRIADO

---

### 2. **Backup Manager** (backup-manager.js)

**O que faz:**
- Faz cópia de `leads.json` a cada 1 hora
- Faz cópia de `tenants.json` a cada 1 hora
- Mantém últimos 30 dias de backups
- Remove backups muito antigos

**Se algo quebra:**
- Você pode restaurar de qualquer hora dos últimos 30 dias
- Comando: `restoreBackup("leads_20260322_1430.json")`

**Arquivo:** `modules/backup-manager.js` ✅ CRIADO

---

### 3. **Data Cleanup** (a implementar)

**O que faz:**
- Roda diariamente às 2 AM
- Remove leads com 90+ dias
- Compacta logs antigos
- Libera espaço em disco

**Benefício:**
- Servidor nunca fica lento por dados antigos
- Disco não enche
- Banco de dados otimizado

---

## 🚀 Como Implementar

### Passo 1: Adicionar Health Monitor ao Servidor

**Arquivo:** `server.js`

Adicione no final (antes do `app.listen`):

```javascript
// ── Health Monitoring ─────────────────────────────────
const healthMonitor = require("./modules/health-monitor");
healthMonitor.startMonitoring();

// Graceful shutdown
process.on("SIGTERM", () => {
  log.warn("SIGTERM received, shutting down gracefully...");
  healthMonitor.stopMonitoring();
  process.exit(0);
});
```

**Resultado:**
- Health check roda a cada 5 minutos
- Logs salvos em `logs/health.log`
- Alertas se problema detectado

---

### Passo 2: Adicionar Backup Manager ao Servidor

**Arquivo:** `server.js`

Adicione logo após health monitor:

```javascript
// ── Automatic Backups ────────────────────────────────
const backupManager = require("./modules/backup-manager");
backupManager.startAutomaticBackups();

process.on("SIGTERM", () => {
  backupManager.stopAutomaticBackups();
});
```

**Resultado:**
- Backup roda a cada 1 hora
- Todos os backups em `backup/`
- Cleanup automático de backups antigos

---

### Passo 3: Criar Diretórios Necessários

```bash
mkdir -p logs
mkdir -p backup
chmod 755 logs backup
```

---

### Passo 4: Update package.json (se necessário)

Verificar se dependências estão presentes:

```json
{
  "dependencies": {
    "axios": "^1.4.0",    // ← para health check
    "express": "^4.18.0",
    "dotenv": "^16.0.0"
  }
}
```

Se `axios` não estiver, rodar:
```bash
npm install axios
```

---

### Passo 5: Deploy no Railway

```bash
git add modules/health-monitor.js modules/backup-manager.js
git add ANALISE_SISTEMA.md PLANO_PROTECAO.md
git commit -m "feat: add auto-protection system (health monitor + backups)"
git push origin main
# Railway deploy automaticamente
```

---

## ✅ Verificação Pós-Implementação

### 1. Verificar Health Monitor

```bash
# Abrir logs
tail -f logs/health.log

# Resultado esperado:
[2026-03-22T14:30:00Z] [OK] Server health check passed
[2026-03-22T14:35:00Z] [OK] Server health check passed
[2026-03-22T14:40:00Z] [OK] Server health check passed
```

### 2. Verificar Backups

```bash
# Listar backups
ls -lah backup/

# Resultado esperado:
-rw-r--r-- leads_20260322_1400.json
-rw-r--r-- leads_20260322_1300.json
-rw-r--r-- leads_20260322_1200.json
```

### 3. Verificar Health Endpoint

```bash
curl http://localhost:3000/health

# Resultado esperado:
{
  "status": "ok",
  "service": "CleanAI SaaS",
  "time": "2026-03-22T14:30:00Z",
  "tenants": 1
}
```

---

## 🎯 O Sistema Faz Automaticamente

### A Cada 5 Minutos
```
✓ Verifica se servidor está respondendo
✓ Monitora memória
✓ Monitora CPU
✓ Registra em logs/health.log
✓ Alerta se algo estranho
```

### A Cada 1 Hora
```
✓ Faz backup de leads.json
✓ Faz backup de tenants.json
✓ Remove backups muito antigos (>30 dias)
✓ Registra tudo em logs
✓ Mostra estatísticas
```

### Diariamente (às 2 AM - a implementar)
```
✓ Remove leads com 90+ dias
✓ Compacta logs antigos
✓ Libera espaço em disco
✓ Otimiza performance
```

---

## 🚨 Como Restaurar de um Backup

Se algo der errado e precisar restaurar:

### Opção 1: Via Node.js CLI

```javascript
// No node CLI:
const backup = require("./modules/backup-manager");
backup.listBackups(); // Lista todos os backups

backup.restoreBackup("leads_20260322_1430.json"); // Restaura
```

### Opção 2: Manual

```bash
# Listar backups
ls backup/

# Copiar um backup para config/
cp backup/leads_20260322_1430.json config/leads.json

# Reiniciar servidor
railway redeploy
```

---

## 📊 Monitoramento Diário

### Checklist Diário (2 minutos)

```
☐ Verificar último health check: tail logs/health.log
☐ Confirmar backups criados: ls -l backup/
☐ Checar uso de memória: health log mostra %
☐ Se algo estranho: revisar logs completos
```

### Checklist Semanal (5 minutos)

```
☐ Verificar histórico de errors em logs
☐ Confirmar quantidade de backups (deve ter ~168 para 1 semana)
☐ Verificar espaço em disco em Railway
☐ Revisar tendências de memória/CPU
```

---

## 🔍 Troubleshooting

### Problema: Health check começou a falhar

**Diagnóstico:**
1. Ver log: `tail -f logs/health.log`
2. Procurar por "ERROR" ou "FAIL"
3. Nota o horário do erro

**Solução:**
1. Ir para Railway dashboard
2. Clicar "Restart" em overflowing-heart
3. Aguardar 1 minuto
4. Health check deve voltar ao normal

---

### Problema: Backups não estão sendo criados

**Diagnóstico:**
1. Ver se diretório existe: `ls -la backup/`
2. Ver se há espaço em disco

**Solução:**
1. Se diretório não existe: `mkdir -p backup`
2. Se sem espaço: deletar backups muito antigos
3. Reiniciar servidor

---

### Problema: Memória crescendo infinitamente

**Diagnóstico:**
1. Ver logs: `grep "HIGH MEMORY\|CRITICAL" logs/health.log`
2. Notar quando começou

**Solução:**
1. Verificar se há memory leak em código
2. Garbage collection pode ajudar: `node --expose-gc server.js`
3. Se persistir: implementar data cleanup

---

## 📈 Métricas de Saúde

**Targets para um sistema saudável:**

| Métrica | Bom | Alerta | Crítico |
|---------|-----|--------|---------|
| Uptime | > 99.5% | 95-99.5% | < 95% |
| Memory | < 150 MB | 150-300 MB | > 300 MB |
| CPU | < 10% | 10-50% | > 50% |
| Resposta | < 1 sec | 1-5 sec | > 5 sec |
| Errors/24h | 0-2 | 3-10 | > 10 |

---

## 🎓 Próximos Passos

### Imediatamente
- [ ] Implementar health-monitor.js
- [ ] Implementar backup-manager.js
- [ ] Deploy no Railway
- [ ] Verificar funcionando

### Esta Semana
- [ ] Revisar logs diários
- [ ] Confirmar backups criados
- [ ] Testar restauração

### Próximas Semanas
- [ ] Implementar data cleanup
- [ ] Adicionar alertas email/Slack
- [ ] Dashboard de métricas

---

## 📞 Suporte

Se algo quebrar:

1. **Check logs primeiro:** `tail logs/health.log`
2. **Tente restart:** Railway → overflowing-heart → Restart
3. **Se não funcionar:** Restaurar de backup
4. **Se nada funcionar:** Contactar suporte

---

## ✨ Conclusão

Com este plano de proteção:

✅ Sistema monitora a si mesmo 24/7  
✅ Dados são salvos a cada 1 hora  
✅ Limpeza automática mantém performance  
✅ Alertas o avisam de problemas  
✅ Você pode restaurar de qualquer backup  

**Resultado:** Um sistema Hannah AI que **nunca fica quebrado** 🛡️

---

**Documento Criado:** 22 de Março de 2026  
**Status:** Pronto para Implementação  
**Próxima Revisão:** 29 de Março de 2026

*Implementar e dormir tranquilo! 😴*
