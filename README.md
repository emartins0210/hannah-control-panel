# 🏡 Agendador Inteligente - Fabíola Services

Sistema inteligente de agendamento de limpeza com autenticação JWT, multi-cliente e multi-equipe.

## ✨ Funcionalidades

- 🔐 **Autenticação JWT**: Segurança com tokens de 30 dias
- 👤 **Admin Dashboard**: Visualizar todos os 80 clientes em tempo real
- 📱 **Client Portal**: Clientes veem apenas seus dados pessoais
- 🔍 **Busca em Tempo Real**: Filtrar clientes por nome, email, cidade
- 🎯 **Controle de Acesso**: Role-based (Admin vs Cliente)
- 🌍 **Acesso Remoto**: Totalmente online, acessível de qualquer lugar
- 📊 **Estatísticas**: Cards com total de clientes, status, equipes

## 🚀 Quick Start

### Instalação Local
```bash
# Instalar dependências
npm install

# Rodar servidor com autenticação
npm run auth-dev

# Acessar
# http://localhost:3000/painel-login.html
```

### Credenciais de Teste
- **Admin**: `fabiola@lopeservices.com` / `admin123456`
- **Cliente**: `contact@aventine.com` / `aventine123`

## 📁 Estrutura

```
├── server-auth.js              # Servidor Express + JWT
├── painel-login.html           # Interface de login
├── painel-admin.html           # Dashboard do administrador
├── painel-cliente.html         # Dashboard do cliente
├── usuarios.json               # Banco de usuários
├── dados-clientes/
│   └── clientes.json          # 80 clientes do sistema
├── package.json
├── START.md                    # Guia 5 minutos
└── DEPLOYMENT.md               # Deploy online (Railway/Vercel/Heroku)
```

## 🔑 Autenticação

Sistema baseado em **JWT (JSON Web Tokens)**:

```javascript
POST /api/auth/login
Content-Type: application/json

{
  "email": "fabiola@lopeservices.com",
  "senha": "admin123456"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "nome": "Fabíola",
    "email": "fabiola@lopeservices.com",
    "tipo": "admin"
  }
}
```

Token é armazenado em `localStorage` e enviado em cada requisição:
```javascript
Authorization: Bearer {token}
```

## 📊 Endpoints API

### Autenticação
- `POST /api/auth/login` - Login com email/senha
- `GET /api/auth/verify` - Verificar token válido

### Clientes
- `GET /api/completo/clientes` - Listar clientes (admin: todos, cliente: só seu)
- `GET /api/completo/cliente/:id` - Detalhes de um cliente
- `POST /api/completo/cliente` - Criar novo cliente (admin only)

### Sistema
- `GET /health` - Verificar saúde do servidor

## 🌐 Deploy Online

Leia [`DEPLOYMENT.md`](./DEPLOYMENT.md) para instruções completas.

### Railway (Recomendado)
```bash
# 1. Crie conta em https://railway.app
# 2. Conecte seu repositório GitHub
# 3. Railway faz deploy automático
# 4. Configure JWT_SECRET na aba Variables
```

### Vercel / Heroku
Veja `DEPLOYMENT.md` para passo-a-passo.

## 🔐 Segurança

### JWT_SECRET
**CRÍTICO**: Altere o JWT_SECRET em produção!

Gere novo secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Adicione em:
- Railway/Heroku/Vercel: Environment Variable `JWT_SECRET`
- Local: `.env` file

### HTTPS
Todos os providers de deploy fornecem HTTPS automático.

## 📚 Guias

- [`START.md`](./START.md) - Começar em 5 minutos
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) - Deploy online completo
- `.env.example` - Template de variáveis

## 🛠️ Stack Tecnológico

- **Backend**: Node.js + Express.js
- **Autenticação**: JWT (jsonwebtoken)
- **Frontend**: HTML + Vanilla JavaScript
- **Data**: JSON (escalável para MongoDB/PostgreSQL)
- **Deploy**: Railway / Vercel / Heroku

## 📈 Próximas Melhorias

- [ ] Banco de dados relacional (PostgreSQL)
- [ ] Recuperação de senha
- [ ] Verificação de email
- [ ] Dashboard para gerenciar usuários
- [ ] Histórico de agendamentos
- [ ] Notificações por email/WhatsApp
- [ ] Relatórios em PDF
- [ ] Integração com Google Calendar

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique `START.md` seção "Troubleshooting"
2. Verifique logs do servidor: `npm run auth-dev`
3. Confirme que `node_modules` foi instalado: `npm install`

## 📄 Licença

MIT - Copyright © 2024 Fabíola Services

---

**🚀 Pronto para revolucionar seu agendamento!**
