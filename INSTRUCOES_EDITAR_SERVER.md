# 📝 INSTRUÇÕES - Como Editar server.js

**Tempo:** 5 minutos  
**Dificuldade:** Fácil  
**Status:** Crítico para completar setup

---

## 📋 Antes de Começar

✅ Você deve ter:
- [ ] Executado o script SCRIPT_IMPLEMENTACAO.sh
- [ ] Arquivos em `modules/health-monitor.js`
- [ ] Arquivos em `modules/backup-manager.js`
- [ ] Acesso a editar `server.js`

---

## 🔧 PASSO-A-PASSO

### PASSO 1: Abrir server.js

```
Local: /seu-projeto/server.js
```

Abra com seu editor preferido (VS Code, Vim, etc)

---

### PASSO 2: Adicionar REQUIRES (no topo do arquivo)

**Procure por:** Seção onde estão os outros `require()` (no topo do arquivo)

**Exemplo de como está agora:**
```javascript
const express = require("express");
const cors = require("cors");
const path = require("path");
// ... outros requires
```

**O QUE FAZER:**
Adicione essas 2 linhas APÓS os outros requires:

```javascript
const healthMonitor = require("./modules/health-monitor");
const backupManager = require("./modules/backup-manager");
```

**Resultado esperado:**
```javascript
const express = require("express");
const cors = require("cors");
const path = require("path");
const healthMonitor = require("./modules/health-monitor");      // ← NOVA
const backupManager = require("./modules/backup-manager");      // ← NOVA
// ... outros requires
```

---

### PASSO 3: Inicializar Health Monitor

**Procure por:** Onde o `app` é criado (geralmente logo após os requires)

**Exemplo de como está agora:**
```javascript
const app = express();

app.use(cors());
app.use(express.json());
// ... outras configurações
```

**O QUE FAZER:**
Adicione essas 2 linhas LOGO APÓS criar o `app`, antes de outras configurações:

```javascript
const app = express();

// 🏥 Health Monitor
healthMonitor.startMonitoring();
healthMonitor.attachToExpress(app);

app.use(cors());
// ... resto do código
```

**Resultado esperado:**
```javascript
const app = express();

// 🏥 Health Monitor
healthMonitor.startMonitoring();
healthMonitor.attachToExpress(app);

app.use(cors());
app.use(express.json());
// ... outras configurações
```

---

### PASSO 4: Inicializar Backup Manager

**Procure por:** Mesma seção onde você adicionou o Health Monitor

**O QUE FAZER:**
Adicione essas 1 linha APÓS a inicialização do Health Monitor:

```javascript
// 📦 Backup Automático
backupManager.startAutomaticBackups();
```

**Resultado esperado completo:**
```javascript
const app = express();

// 🏥 Health Monitor
healthMonitor.startMonitoring();
healthMonitor.attachToExpress(app);

// 📦 Backup Automático
backupManager.startAutomaticBackups();

app.use(cors());
app.use(express.json());
// ... resto do código
```

---

### PASSO 5: Salvar arquivo

**Atalhos:**
- VS Code: `Ctrl+S` (Windows/Linux) ou `Cmd+S` (Mac)
- Vim: `:w` (e depois `:q` para sair)
- Nano: `Ctrl+O` (save) e `Ctrl+X` (exit)

✅ Arquivo salvo!

---

## 🧪 Verificar Edição

Abra o arquivo e procure por essas 3 seções:

### ✅ Seção 1 - Requires (topo do arquivo)
```javascript
const healthMonitor = require("./modules/health-monitor");
const backupManager = require("./modules/backup-manager");
```

### ✅ Seção 2 - Health Monitor (após criar app)
```javascript
healthMonitor.startMonitoring();
healthMonitor.attachToExpress(app);
```

### ✅ Seção 3 - Backup (após Health Monitor)
```javascript
backupManager.startAutomaticBackups();
```

Se as 3 seções estão lá → **PERFEITO!** ✅

---

## 🚀 Próximo Passo

Após salvar, execute:

```bash
git add server.js modules/health-monitor.js modules/backup-manager.js
git commit -m "feat: add health monitor and automatic backups"
git push origin main
```

**Railway fará deploy automaticamente.**

---

## 🆘 Problemas Comuns

### ❌ Problema: "Cannot find module health-monitor"

**Solução:**
1. Verifique que o arquivo está em `modules/health-monitor.js`
2. Verifique o caminho: deve ser `"./modules/health-monitor"`
3. Reinicie o servidor

### ❌ Problema: Syntax Error

**Solução:**
1. Verifique que as linhas estão exatamente como no guia
2. Procure por ; (ponto-e-vírgula) faltando
3. Procure por parênteses desbalanceados

### ❌ Problema: Server não inicia

**Solução:**
1. Verifique se copiou exatamente como indicado
2. Procure por erros de digitação
3. Restaure o arquivo original e tente novamente
4. Verifique os logs: `npm start`

---

## 📊 Checklist de Conclusão

- [ ] Abri server.js
- [ ] Adicionei 2 requires (healthMonitor + backupManager)
- [ ] Inicializei healthMonitor (startMonitoring + attachToExpress)
- [ ] Inicializei backupManager (startAutomaticBackups)
- [ ] Salvei o arquivo
- [ ] Fiz git push
- [ ] Aguardei deploy (1-2 min)
- [ ] Testei /health endpoint
- [ ] Verifiquei logs com [HEALTH]
- [ ] Confirmei que backups estão sendo criados

---

## ✅ Resultado Final

Se tudo deu certo, você terá:
- ✅ Health check a cada 5 minutos
- ✅ Backup automático a cada 1 hora
- ✅ Logs centralizados
- ✅ Sistema monitorado 24/7

**Parabéns! 🎉 Hannah 3.0 agora está protegido!**

---

**Tempo total:** 5 minutos  
**Dificuldade:** ⭐ Fácil  
**Valor:** 🏆 Inestimável (sistema protegido!)

Para mais detalhes, consulte: `PLANO_ACAO_PRATICO.md`
