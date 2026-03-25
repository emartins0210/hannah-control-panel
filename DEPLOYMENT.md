# 🚀 Guia de Implantação - Sistema Autenticado Fabíola Services

## Visão Geral
Este sistema agora possui autenticação JWT com:
- ✅ Login seguro para administrador (vê todos os 80 clientes)
- ✅ Login para clientes (veem apenas seus dados)
- ✅ Token JWT com validade de 30 dias
- ✅ Acesso remoto para sua cliente nos EUA

---

## 📋 Fase 1: Configuração Local (Teste)

### Pré-requisitos
- Node.js 16+ instalado ([nodejs.org](https://nodejs.org))
- npm 8+ 
- Git (opcional)

### Passos

1. **Instalar dependências**
```bash
cd /Users/eugeniomartinss/Downloads/cleanai-CORRIGIDO-FINAL
npm install
```

2. **Iniciar o servidor com autenticação**
```bash
npm run auth-dev
```

Você deve ver:
```
Servidor autenticado rodando na porta 3000
JWT_SECRET configurado (MUDE EM PRODUÇÃO)
Usuários carregados: usuarios.json
Clientes carregados: dados-clientes/clientes.json
```

3. **Acessar o sistema localmente**
- Abra: `http://localhost:3000/painel-login.html`
- Credenciais de teste:
  - **Admin:** fabiola@lopeservices.com / admin123456
  - **Cliente:** contact@aventine.com / aventine123

### ✅ Checklist Local
- [ ] Servidor inicia sem erros
- [ ] Login de admin funciona
- [ ] Admin vê tabela com 80 clientes
- [ ] Login de cliente funciona
- [ ] Cliente vê apenas seus dados

---

## 🌐 Fase 2: Implantação Online

### Opção A: Railway (Recomendado - Mais Fácil)

**Por que Railway?** Gratuito no primeiro mês, integração GitHub fácil, ideal para MVPs.

#### Passos:

1. **Criar conta**
   - Acesse: https://railway.app
   - Clique "Start a New Project"
   - Conecte sua conta GitHub

2. **Deploy do repositório**
   - Se você não tem repositório Git, crie um:
   ```bash
   cd /Users/eugeniomartinss/Downloads/cleanai-CORRIGIDO-FINAL
   git init
   git add .
   git commit -m "Initial commit - Sistema autenticado"
   git branch -M main
   git remote add origin https://github.com/SEU_USERNAME/agendador-fabolaservices.git
   git push -u origin main
   ```
   
   - No Railway, clique "Deploy from GitHub"
   - Selecione seu repositório
   - Railway detectará Node.js automaticamente

3. **Configurar variáveis de ambiente**
   - No painel Railway, vá a "Variables"
   - Adicione:
   ```
   NODE_ENV=production
   JWT_SECRET=seu_secret_super_seguro_MUDE_AQUI_123456789
   PORT=3000
   ```

4. **Resultado**
   - Seu site estará em: `https://seu-projeto.up.railway.app`
   - Compartilhe com sua cliente nos EUA: 
     - Login: `https://seu-projeto.up.railway.app/painel-login.html`

---

### Opção B: Vercel (Alternativa Rápida)

⚠️ **Nota:** Vercel é otimizado para Frontend. Melhor para produção se precisar de escala.

1. **Instalar Vercel CLI**
```bash
npm install -g vercel
```

2. **Deploy**
```bash
cd /Users/eugeniomartinss/Downloads/cleanai-CORRIGIDO-FINAL
vercel
```

3. **Configurar JWT_SECRET nos Secrets do Vercel**
- No dashboard Vercel > Settings > Environment Variables
- Adicione `JWT_SECRET` com valor seguro

---

### Opção C: Heroku (Clássico)

⚠️ **Nota:** Heroku descontinuou tier gratuito em 2022. Custo: ~$7-14/mês.

```bash
heroku login
heroku create seu-app-name
heroku config:set JWT_SECRET="seu_secret_aqui"
git push heroku main
```

---

## 🔐 Segurança - CRÍTICO ANTES DE PRODUÇÃO

### 1️⃣ Alterar JWT_SECRET

**NUNCA use o secret padrão em produção!**

Gere um novo secret seguro:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Exemplo de output:
```
a7f3e8b2c9d1f4e6a7b3c5d9e2f1a4b8c7d3e5f8a9b2c4d6e7f8a9b0c1d2e
```

Adicione isso em:
- Railway/Heroku/Vercel: como variável `JWT_SECRET`
- Local (desenvolvimento): edite `server-auth.js` linha 8

### 2️⃣ Adicionar Mais Usuários Clientes

Edite `usuarios.json` para adicionar suas clientes. Exemplo:

```json
{
  "id": 3,
  "nome": "Maria Client USA",
  "email": "maria@clientusa.com",
  "senha": "senha_segura_123",
  "tipo": "cliente",
  "clienteId": 5,
  "ativo": true
}
```

Encontre o `clienteId` correspondente em `dados-clientes/clientes.json`.

### 3️⃣ HTTPS Obrigatório

- ✅ Railway: automático
- ✅ Vercel: automático
- ✅ Heroku: automático

Todos fornecem HTTPS grátis com certificado SSL.

---

## 📊 Adicionar Mais Clientes Usuários

Se tem 80 clientes no sistema mas poucos têm login, adicione em `usuarios.json`:

```bash
# Gere senhas aleatórias para clientes
for i in {1..80}; do
  echo "Cliente $i: $(node -e "console.log(Math.random().toString(36).slice(2, 10))")"
done
```

Ou use um script Python:
```python
import json

usuarios = json.load(open('usuarios.json'))
clientes = json.load(open('dados-clientes/clientes.json'))

# Adicionar todos os 80 como usuários com senhas aleatórias
for i, cliente in enumerate(clientes, start=2):
    usuarios.append({
        "id": i + 1,
        "nome": cliente['nome'],
        "email": f"client{i}@example.com",
        "senha": f"senha_{i}_temp",
        "tipo": "cliente",
        "clienteId": i,
        "ativo": True
    })

json.dump(usuarios, open('usuarios.json', 'w'), indent=2)
print(f"✅ {len(usuarios)} usuários criados")
```

---

## 🧪 Testando em Produção

Após publicar online, teste:

```bash
# Verificar saúde do servidor
curl https://seu-dominio.com/health

# Fazer login e obter token
curl -X POST https://seu-dominio.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"fabiola@lopeservices.com","senha":"admin123456"}'

# Resposta esperada:
# {"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...","usuario":{...}}
```

---

## 📱 Compartilhar com Cliente (EUA)

Envie para sua cliente:

```
🔐 ACESSO AO SISTEMA FABÍOLA SERVICES

URL: https://seu-app.railway.app/painel-login.html

Seu Email: contact@aventine.com
Sua Senha: aventine123

✅ Sistema pode ser acessado de qualquer lugar do mundo
✅ Seus dados são privados (admin vê tudo, você vê só seu)
✅ Válido por 30 dias (depois faz login novamente)

Suporte: +55 (seu telefone) ou WhatsApp
```

---

## 🆘 Troubleshooting

| Problema | Solução |
|----------|---------|
| "Cannot find module 'jsonwebtoken'" | Rode `npm install` novamente |
| "EADDRINUSE: port 3000 already in use" | Mude porta: `PORT=3001 npm run auth` |
| "Token inválido" | Verifique JWT_SECRET é igual em ambos envs |
| "Clientes não aparecem" | Verifique `dados-clientes/clientes.json` existe |
| "Login não funciona" | Verifique credenciais em `usuarios.json` |

---

## 📈 Próximos Passos (Melhorias Futuras)

- [ ] Adicionar recuperação de senha
- [ ] Verificação de email
- [ ] Dashboard para gerenciar usuários (admin)
- [ ] Histórico de agendamentos
- [ ] Notificações por email
- [ ] Integração WhatsApp API
- [ ] Backup automático de dados
- [ ] Relatórios em PDF

---

## 📞 Suporte

Erro de deployment? Verifique:
1. Node.js versão: `node --version` (deve ser 16+)
2. npm instalado: `npm --version`
3. Variáveis de ambiente setadas
4. Logs do servidor: procure por "Error" ou "undefined"

---

**🎉 Seu sistema está pronto para o mundo!**
