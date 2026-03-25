# 🚀 Guia de Deployment em Produção

## 🌐 Publicar na Internet (Para Acessar dos EUA)

Seu cliente está nos EUA e precisa acessar de qualquer lugar. Aqui estão as opções mais simples:

## ✅ Opção 1: Render.com (Recomendado - MAIS FÁCIL)

**Custo:** Gratuito (até 750h/mês)
**Setup:** 10 minutos
**Acesso:** https://seu-app.onrender.com

### Passo 1: Criar Conta
1. Ir para https://render.com
2. Clicar "Sign up"
3. Usar GitHub ou email

### Passo 2: Preparar Repositório Git
```bash
# Na pasta do projeto
git init
git add .
git commit -m "Deploy inicial do Agendador Fabíola"

# Criar repositório no GitHub (se não tiver)
# Depois:
git remote add origin https://github.com/SEU-USUARIO/agendador-fabolaservices.git
git branch -M main
git push -u origin main
```

### Passo 3: Conectar Render ao GitHub
1. No Render, clicar "+ New"
2. Selecionar "Web Service"
3. Conectar sua conta GitHub
4. Selecionar o repositório `agendador-fabolaservices`

### Passo 4: Configurar Serviço
```
Name:                    agendador-fabolaservices
Runtime:                 Node
Build Command:           npm install
Start Command:           npm start
Environment:             Free
Auto-deploy:             Yes
```

### Passo 5: Deploy
```bash
# O deployment começa automaticamente!
# Ver em: https://render.com/dashboard
```

### Resultado
```
🎉 Seu painel estará em:
https://agendador-fabolaservices.onrender.com

Cliente acessa de qualquer lugar!
```

---

## ✅ Opção 2: Railway.app (MUITO FÁCIL)

**Custo:** Gratuito (5 dólares de crédito/mês)
**Setup:** 5 minutos
**Acesso:** https://seu-app.railway.app

### Quick Start

```bash
# 1. Login no Railway
npm install -g @railway/cli
railway login

# 2. Criar projeto
railway init

# 3. Deploy automático
git push
# Ou
railway up

# 4. Ver URL
railway open
```

---

## ✅ Opção 3: Vercel (Para API + Frontend)

**Custo:** Gratuito
**Setup:** 15 minutos

### Deploy
```bash
npm install -g vercel
vercel
```

---

## ✅ Opção 4: Docker + AWS Lightsail

**Custo:** $5/mês
**Setup:** 20 minutos
**Performance:** Ótima

### Deploy
```bash
# 1. Criar instância Lightsail
# 2. SSH na instância
ssh -i seu-chave.pem ec2-user@seu-ip

# 3. Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 4. Clonar projeto
git clone seu-repo
cd agendador-fabolaservices

# 5. Rodar
docker-compose up -d

# 6. Seu app está em:
# http://seu-ip:3000
```

---

## 🔐 IMPORTANTE: Segurança em Produção

### 1. Variáveis de Ambiente

**NUNCA colocar senhas no código!**

No Render:
- Settings > Environment
- Adicionar:
  ```
  NODE_ENV: production
  API_KEY: sua-chave-super-segura
  ```

### 2. CORS Restringido

Editar `server-completo.js`:
```javascript
app.use(cors({
  origin: ['https://seu-dominio.com'],
  credentials: true
}));
```

### 3. HTTPS Automático

Render/Railway/Vercel fornecem HTTPS grátis!

### 4. Autenticação API

Adicionar ao `agendador-route-completo.js`:
```javascript
router.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ erro: 'Não autorizado' });
  }
  next();
});
```

Use em requisições:
```bash
curl -H "X-API-Key: sua-chave" http://seu-app.com/api/completo/clientes
```

---

## 🎯 Setup Completo em 5 Passos

### 1. Preparar Código
```bash
# Clone o projeto
cd agendador-fabolaservices

# Criar .env
cp .env.example .env

# Para Render/Railway, adicionar ao .env.production:
NODE_ENV=production
API_KEY=sua-chave-aleatorio-super-segura
```

### 2. Push para Git
```bash
git add .
git commit -m "Ready for production"
git push origin main
```

### 3. Render Deploy
- Abrir https://render.com/dashboard
- Novo Web Service
- Conectar GitHub
- Deixar settings padrão
- Deploy!

### 4. Importar Seus Dados
Opção A - via API:
```bash
# Depois que estiver rodando em produção:
curl -X POST https://seu-app.onrender.com/api/completo/cliente \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-chave" \
  -d '{...dados do cliente...}'
```

Opção B - via Interface Web:
- Abrir https://seu-app.onrender.com
- Clicar "+ Novo Cliente"
- Preencher
- Salvar

Opção C - via Script (Recomendado):
```bash
# Fazer upload do arquivo Excel
curl -F "file=@Clientes_LopesServices_COMPLETO.xlsx" \
  https://seu-app.onrender.com/api/importar
```

### 5. Compartilhar com Cliente
```
📱 Seu painel:
https://agendador-fabolaservices.onrender.com

📧 Enviar cliente o link
💬 Cliente acessa de qualquer dispositivo!
```

---

## 📊 Monitoramento

### Render Dashboard
- Ir para https://render.com/dashboard
- Ver logs em tempo real
- Monitorar CPU/Memory
- Redeploy com 1 clique

### Health Check
```bash
curl https://agendador-fabolaservices.onrender.com/health
# Response: {"status":"ok",...}
```

### Logs Remotos
```bash
# Via Render CLI
render logs --service agendador-fabolaservices
```

---

## 🔄 Atualizações Futuras

Depois que está em produção:

```bash
# 1. Fazer mudanças no código local
nano painel-agendador-equipes.html

# 2. Commit
git add .
git commit -m "Melhorias no painel"

# 3. Push
git push origin main

# 4. Render redeploy automaticamente!
# (Se auto-deploy está ativado)
```

---

## 🆘 Troubleshooting

### "Porta já em uso"
- Não aplicável em Render (cuida disso)

### "Dados desaparecem"
- Usar volume persistente (Docker)
- Render salva automaticamente

### "Conexão recusada"
- Aguardar deploy completar (5-10 min)
- Verificar status em https://render.com/dashboard

### "API retorna 401"
- Verificar header `X-API-Key`
- Conferir variável `API_KEY` no Render

---

## 💾 Backup de Dados

### Automático
```bash
# Em Render, os dados estão salvos em volume persistente
# Backup automático a cada deploy
```

### Manual
```bash
# Baixar dados
curl https://seu-app.onrender.com/api/completo/exportar-json \
  -H "X-API-Key: sua-chave" > backup-$(date +%Y%m%d).json
```

---

## 🎓 Próximos Passos

1. ✅ Deploy básico em Render (você aqui agora)
2. ⬜ Adicionar domínio customizado
3. ⬜ Integração com Mailpad
4. ⬜ Banco de dados MongoDB
5. ⬜ Cache com Redis
6. ⬜ Alertas e notificações

---

## 📞 Suporte

Se houver problemas no deploy:

1. **Verificar logs em Render**
   - Dashboard > Logs

2. **Testar localmente primeiro**
   ```bash
   npm start
   # Acessar http://localhost:3000
   ```

3. **Verificar variáveis de ambiente**
   - Render > Settings > Environment

4. **Contato**
   - 📧 suporte@fabiolaservices.com
   - 💬 (321) 555-1234

---

## 📋 Checklist Final

- [ ] Código no GitHub
- [ ] Projeto no Render
- [ ] Variáveis de ambiente configuradas
- [ ] Teste de acesso via URL pública
- [ ] Importação de clientes OK
- [ ] Agendamento funcionando
- [ ] HTTPS ativado
- [ ] Backup configurado

✅ **Seu sistema está ao vivo!**

🎉 Cliente acessa de qualquer lugar do mundo!
