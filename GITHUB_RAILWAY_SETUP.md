# 🚀 GitHub + Railway Setup - Passo-a-Passo

## 📋 Resumo do Que Você Vai Fazer

1. **GitHub**: Criar repositório e fazer push dos arquivos
2. **Railway**: Conectar repositório GitHub
3. **Deploy**: Railway faz deploy automático
4. **Online**: Sistema acessível em `https://seu-app.railway.app`

---

## ✅ Passo 1: GitHub Setup

### Se você NÃO tem repositório GitHub ainda

#### 1.1 Criar repositório vazio no GitHub
- Acesse: https://github.com/new
- **Repository name**: `agendador-fabolaservices` (ou seu nome preferido)
- **Description**: "Sistema autenticado de agendamento Fabíola Services"
- **Public** ou **Private** (sua escolha)
- ❌ NÃO marque "Initialize with README" (já temos)
- Clique **Create repository**

#### 1.2 Fazer push local → GitHub

Na pasta do projeto:
```bash
cd /Users/eugeniomartinss/Downloads/cleanai-CORRIGIDO-FINAL

# Adicionar origem remota (substitua YOUR_USERNAME e REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/agendador-fabolaservices.git

# Mudar branch para main (se não for já)
git branch -M main

# Fazer push para GitHub
git push -u origin main
```

✅ **Esperado**: Vê mensagens de push para GitHub

---

### Se você JÁ tem repositório GitHub

```bash
cd /Users/eugeniomartinss/Downloads/cleanai-CORRIGIDO-FINAL

# Verificar remote atual
git remote -v

# Se vazio, adicionar:
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push para main
git push -u origin main
```

---

## 🚂 Passo 2: Railway Setup

### 2.1 Acessar Railway com suas credenciais

- Acesse: https://railway.app
- Login com sua conta (GitHub, Google, ou email)

### 2.2 Criar novo projeto

1. Clique **New Project** (ou "+")
2. Selecione **Deploy from GitHub repo**
3. **Conectar GitHub** (se não conectado):
   - Clique "Connect GitHub Account"
   - Autorize Railway acessar seu GitHub
   - Selecione seu repositório `agendador-fabolaservices`

### 2.3 Configure o serviço

Railway deve detectar automaticamente:
- **Service**: Node.js ✓
- **Build command**: `npm install`
- **Start command**: `npm run auth`

Se não aparecer, especifique:
- **Root directory**: `/` (raiz do repo)
- **Environment**: Node.js

Clique **Deploy**

---

## 🔐 Passo 3: Variáveis de Ambiente

### 3.1 Após deploy iniciar, vá em **Settings** → **Variables**

Adicione estas variáveis:

```
NODE_ENV = production
PORT = 3000
JWT_SECRET = <GERE_UM_NOVO_AQUI>
```

### 3.2 Gerar JWT_SECRET Seguro

**Execute no seu terminal local:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Exemplo de output:
```
a7f3e8b2c9d1f4e6a7b3c5d9e2f1a4b8c7d3e5f8a9b2c4d6e7f8a9b0c1d2e
```

**Cole isso em `JWT_SECRET` no Railway**

### 3.3 Salvar Variáveis

Após adicionar todas, Railway fará redeploy automático com as novas variáveis.

---

## ✅ Passo 4: Verificar Deploy

### 4.1 Acompanhar logs

No painel Railway:
- Vá em **Deployment** → **Logs**
- Procure por:
  ```
  Servidor autenticado rodando na porta 3000
  Usuários carregados: usuarios.json
  Clientes carregados: dados-clientes/clientes.json
  ```

### 4.2 Obter URL

- No painel Railway, vá em **Settings** → **Domains**
- Ou procure por "your domain":
  ```
  https://seu-app-RANDOM.up.railway.app
  ```

---

## 🔗 Passo 5: Testar Sistema Online

### 5.1 Acessar Login
```
https://seu-app-RANDOM.up.railway.app/painel-login.html
```

### 5.2 Fazer Login
- **Admin**: `fabiola@lopeservices.com` / `admin123456`
- **Cliente**: `contact@aventine.com` / `aventine123`

### 5.3 Verificar Funcionalidades
- [ ] Login funciona
- [ ] Admin vê 80 clientes
- [ ] Cliente vê apenas seus dados
- [ ] Busca filtra clientes
- [ ] Logout funciona

---

## 🔄 Passo 6: Atualizações Futuras

Sempre que fizer mudanças no código:

```bash
# Local
git add .
git commit -m "Descrição da mudança"
git push origin main

# Railway
# Railway detecta push automático e refaz deploy
# Monitore em Railway → Deployment → Logs
```

---

## 🆘 Troubleshooting

### "Build failed"

Verifique em Railway → Logs:
- `npm install` falhou? → Verifique `package.json`
- Module not found? → `jsonwebtoken` foi adicionado?

**Solução**: Execute localmente
```bash
npm install
npm run auth-dev
```

Se funciona local mas não no Railway, tente:
1. Verifique `.gitignore` - `node_modules/` deve estar lá
2. Railway rodará `npm install` automaticamente

### "Cannot find module"

Adicione a variável no Railway:
```
NODE_ENV = production
```

### "JWT token inválido"

Verifique se `JWT_SECRET` está:
- ✅ Setado no Railway
- ✅ Igual ao usado localmente (se testar)
- ✅ Não tem espaços extras

### Porta 3000 em uso

Railway oferece porta automática. Não precisa fazer nada.

### "usuarios.json" não encontrado

Railway não envia arquivos que estão em `.gitignore`.

Solução:
1. Verifique que `usuarios.json` NÃO está em `.gitignore`
2. Se estiver, remova a linha
3. Faça push novamente:
```bash
git add usuarios.json
git commit -m "Include usuarios.json"
git push origin main
```

---

## 📞 Compartilhar com Cliente (EUA)

Após tudo funcionando, envie para sua cliente:

```
🔐 SISTEMA FABÍOLA SERVICES - ONLINE

URL: https://seu-app-RANDOM.up.railway.app/painel-login.html

Seu Login:
  Email: contact@aventine.com
  Senha: aventine123

✅ Pode acessar de qualquer lugar
✅ Seus dados são privados
✅ Totalmente seguro (HTTPS)

Dúvidas? WhatsApp: +55 (seu telefone)
```

---

## ✨ Pronto!

Seu sistema está:
- ✅ No GitHub (versionado)
- ✅ No Railway (online)
- ✅ Com HTTPS (seguro)
- ✅ Com JWT autenticação
- ✅ Pronto para sua cliente nos EUA

**🚀 Parabéns! Sistema em produção!**

---

## 📊 Próximos Passos (Opcional)

1. **Adicionar mais clientes**: Edite `usuarios.json` e faça push
2. **Alterar senha admin**: Edite `usuarios.json`
3. **Customizar cores**: Edite CSS em `.html` files
4. **Adicionar features**: Veja `DEPLOYMENT.md` seção "Próximas Melhorias"
