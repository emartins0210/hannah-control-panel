# 🚀 Guia de Implementação - Sistema de Proteção

**Tempo Total:** 30 minutos  
**Dificuldade:** Fácil  
**Resultado:** Sistema Hannah AI blindado 🛡️

---

## ✅ Pré-Requisitos

- [ ] Acesso ao código do projeto (GitHub)
- [ ] Projeto rodando em Railway
- [ ] Node.js instalado localmente (opcional, para testar)
- [ ] Git configurado

---

## 📋 Passo-a-Passo

### Passo 1: Copiar Módulos de Proteção (2 minutos)

**O que fazer:**
1. Copiar arquivo `modules/health-monitor.js` para seu projeto
2. Copiar arquivo `modules/backup-manager.js` para seu projeto

**Como:**
```bash
# Abrir seus arquivos
# Copiar conteúdo de health-monitor.js
# Criar arquivo: seu-projeto/modules/health-monitor.js
# Colar conteúdo

# Repetir para backup-manager.js
```

**Ou via Git:**
```bash
# Se tiver repositório no GitHub
git pull  # Puxar os novos arquivos
```

---

### Passo 2: Atualizar server.js (3 minutos)

**Arquivo a modificar:** `server.js`

**O que adicionar:**

Procure por esta seção:
```javascript
app.listen(PORT, () => {
  validateEnv();
  log.info(`
╔══════════════════════════════════════════════╗
║       CleanAI SaaS — Server Running          ║
  `);
```

Logo **antes** de `app.listen`, adicione:

```javascript
// ── Health Monitoring ─────────────────────────────────
const healthMonitor = require("./modules/health-monitor");
healthMonitor.startMonitoring();

// ── Automatic Backups ────────────────────────────────
const backupManager = require("./modules/backup-manager");
backupManager.startAutomaticBackups();

// Graceful shutdown
process.on("SIGTERM", () => {
  log.warn("SIGTERM received, shutting down gracefully...");
  healthMonitor.stopMonitoring();
  backupManager.stopAutomaticBackups();
  process.exit(0);
});
```

**Resultado esperado:** server.js fica assim:

```javascript
// ... resto do código ...

// ── Health Monitoring ─────────────────────────────────
const healthMonitor = require("./modules/health-monitor");
healthMonitor.startMonitoring();

// ── Automatic Backups ────────────────────────────────
const backupManager = require("./modules/backup-manager");
backupManager.startAutomaticBackups();

// Graceful shutdown
process.on("SIGTERM", () => {
  log.warn("SIGTERM received, shutting down gracefully...");
  healthMonitor.stopMonitoring();
  backupManager.stopAutomaticBackups();
  process.exit(0);
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  validateEnv();
  log.info(`...`);
});
```

---

### Passo 3: Criar Diretórios (1 minuto)

**Criar dois diretórios:**

```bash
mkdir -p logs
mkdir -p backup
```

**O que são:**
- `logs/` - Onde health monitor salva logs
- `backup/` - Onde backup manager salva cópias

---

### Passo 4: Testar Localmente (opcional, 5 minutos)

**Se quiser testar antes de fazer deploy:**

```bash
# Terminal 1: Rodar servidor
npm install  # Só primeira vez
npm run dev

# Terminal 2: Em outro terminal, testar
curl http://localhost:3000/health

# Resultado esperado:
{
  "status": "ok",
  "service": "CleanAI SaaS",
  "time": "2026-03-22T14:30:00Z",
  "tenants": 1
}

# Ver logs
tail logs/health.log
```

---

### Passo 5: Deploy no Railway (5 minutos)

**No seu terminal:**

```bash
# 1. Adicionar arquivos ao Git
git add modules/health-monitor.js
git add modules/backup-manager.js
git add server.js
git add ANALISE_SISTEMA.md
git add PLANO_PROTECAO.md
git add RESUMO_PROTECAO.md

# 2. Fazer commit
git commit -m "feat: add auto-protection system (health monitor + backups)"

# 3. Push para GitHub
git push origin main

# 4. Railway detecta e faz deploy automaticamente
# Aguardar 2-3 minutos

# 5. Verificar no Railway Dashboard
# - Railway → Project → Deployments
# - Deve mostrar novo deployment
```

---

### Passo 6: Verificar se Funcionou (5 minutos)

**No Railway Dashboard:**

1. Abrir seu projeto "overflowing-heart"
2. Abrir Logs
3. Procurar por: `"Health Monitor Started"`
4. Procurar por: `"Automatic Backups Started"`

**Se ver essas mensagens:**
```
✅ [OK] Health Monitor Started
✅ [OK] Automatic Backups Started
```

Parabéns! Está funcionando 🎉

---

### Passo 7: Verificar Saúde (2 minutos)

**Testar health endpoint:**

```bash
curl https://seu-dominio.railway.app/health

# Resultado esperado (JSON):
{
  "status": "ok",
  "service": "CleanAI SaaS",
  "time": "2026-03-22T14:30:00Z",
  "tenants": 1
}
```

---

### Passo 8: Verificar Backups (2 minutos)

**Via Railway File Browser:**

1. Railway Dashboard → seu projeto
2. Aba "Storage" ou "Files"
3. Procurar por pasta `backup/`
4. Deve ter arquivos como:
   - `leads_20260322_1400.json`
   - `leads_20260322_1300.json`
   - etc.

---

### Passo 9: Verificar Logs (2 minutos)

**Ver logs de saúde:**

```bash
# Via Railway Terminal (se tiver acesso)
cat logs/health.log | tail -20

# Resultado esperado:
[2026-03-22T14:30:00Z] [OK] Server health check passed
[2026-03-22T14:35:00Z] [OK] Server health check passed
[2026-03-22T14:40:00Z] [OK] Server health check passed
```

---

## ✅ Checklist de Conclusão

- [ ] Copiou `health-monitor.js` para `modules/`
- [ ] Copiou `backup-manager.js` para `modules/`
- [ ] Adicionou imports no `server.js`
- [ ] Adicionou `startMonitoring()` no `server.js`
- [ ] Adicionou `startAutomaticBackups()` no `server.js`
- [ ] Criou `logs/` e `backup/` diretórios
- [ ] Fez git commit e push
- [ ] Verificou deploy no Railway
- [ ] Testou `/health` endpoint
- [ ] Viu logs em `logs/health.log`
- [ ] Viu backups em `backup/`

---

## 🛠️ Troubleshooting

### Problema: Deploy não funciona

**Solução:**
```bash
# Verifique se git push funcionou
git log --oneline -5  # Deve mostrar seu commit

# Se não aparecer seu commit:
git status  # Vê o que está pendente
git add .   # Adiciona tudo
git push    # Push novamente
```

---

### Problema: /health retorna erro

**Solução:**
1. Esperar 2-3 minutos após deploy
2. Reiniciar projeto no Railway:
   - Railway Dashboard → Restart
3. Tentar novamente: `curl /health`

---

### Problema: Logs não aparecem

**Verificar:**
1. Pasta `logs/` foi criada? `ls -la logs/`
2. Permissões? `chmod 755 logs`
3. Reiniciar servidor

---

### Problema: Backups não criados

**Verificar:**
1. Pasta `backup/` existe? `mkdir -p backup`
2. Espaço em disco? `df -h`
3. Permissões? `chmod 755 backup`

---

## 🎯 Próximos Passos

Após implementação bem-sucedida:

### Dia 1
- [ ] Monitorar logs: `tail -f logs/health.log`
- [ ] Confirmar backups criados

### Dia 2-7
- [ ] Revisar health check logs diários
- [ ] Notificar se problemas aparecerem

### Semana 2
- [ ] Implementar data cleanup (opcional)
- [ ] Configurar alertas email (opcional)

---

## 📞 Problemas ou Dúvidas?

Se algo não funcionar:

1. **Revisar server.js** - Verificar se imports estão corretos
2. **Checar permissões** - `chmod 755 logs backup`
3. **Restart Railway** - Às vezes resolve
4. **Ver logs do Railway** - Procurar por erros
5. **Contactar suporte** - Se nada funcionar

---

## ✨ Resultado Final

Após implementação bem-sucedida:

✅ Health check roda a cada 5 minutos  
✅ Backup criado a cada 1 hora  
✅ Dados sempre salvos  
✅ Alertas se algo quebra  
✅ Recuperação rápida possível  

**Você pode dormir tranquilo!** 😴

---

**Guia Criado:** 22 de Março de 2026  
**Tempo Estimado:** 30 minutos  
**Dificuldade:** Fácil ⭐⭐

Comece agora! 🚀
