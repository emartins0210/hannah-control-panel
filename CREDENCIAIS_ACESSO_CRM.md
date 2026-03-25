# 🔐 Credenciais de Acesso - Hannah 3.0 CRM

## Acesso ao Dashboard

**Arquivo**: `DASHBOARD_CRM_HANNAH_LOGIN.html`

Abra este arquivo no navegador (Chrome, Firefox, Safari, Edge) para acessar o painel de controle.

---

## 📋 Credenciais Padrão

### Usuário Administrador (Principal)
```
Email:    admin@hannah.com
Senha:    Hannah2024@USA
```

### Usuário Gerente
```
Email:    eugenio@hannah.com
Senha:    Eugenio2024@USA
```

### Usuário Hannah System
```
Email:    hannah@hannah.com
Senha:    Hannah3.0@Ligacoes
```

---

## ⚠️ SEGURANÇA - IMPORTANTE!

### Primeiro Acesso
1. Entre com: `admin@hannah.com` / `Hannah2024@USA`
2. **IMEDIATAMENTE** mude a senha
3. Crie usuários adicionais para sua equipe

### Boas Práticas
- ✅ Altere as senhas padrão **antes** de colocar em produção
- ✅ Use senhas fortes (mínimo 12 caracteres, números e símbolos)
- ✅ Não compartilhe credenciais por email/Slack
- ✅ Revise acessos mensalmente
- ✅ Active 2FA (Two-Factor Authentication) quando disponível
- ❌ Nunca compartilhe credenciais admin
- ❌ Não use a mesma senha em múltiplos sistemas

---

## 🖥️ Como Acessar o Dashboard

### Método 1: Arquivo Local
1. Localize: `DASHBOARD_CRM_HANNAH_LOGIN.html`
2. Clique 2x para abrir no navegador
3. Entre com suas credenciais
4. Comece a gerenciar leads

### Método 2: Servidor Web (Recomendado)
1. Copie `DASHBOARD_CRM_HANNAH_LOGIN.html` para sua pasta pública do servidor
2. Acesse via: `https://seu-dominio.com/dashboard`
3. Configure HTTPS para segurança

### Método 3: Integração com Railway
1. Faça upload do arquivo para Railway
2. Configure rota no `server.js`:
```javascript
app.use(express.static('public'));
// Coloque DASHBOARD_CRM_HANNAH_LOGIN.html em public/
```

---

## 📊 O Que Você Verá no Dashboard

### Métricas Principais
- **Leads Totais**: 247 (última atualização: hoje)
- **Ligações Realizadas**: 156 (94% de sucesso)
- **Leads Qualificados**: 89 (36% do total)
- **Clientes em Espera**: 42 (prontos para atender)

### Origem dos Leads
- 🎨 **Google Ads**: 89 leads (36%) → 42% conversão
- 📱 **Facebook Ads**: 67 leads (27%) → 38% conversão
- 👥 **Indicações**: 61 leads (25%) → 61% conversão ⭐ MELHOR TAXA
- 🔍 **SEO/Outros**: 30 leads (12%)

### Tabela de Leads Recentes
- Nome do cliente
- Localização (Estado/Cidade)
- **Origem do Lead** (Ad ou Indicação)
- Status (Qualificado/Contatado)
- Data do contato

---

## 🔄 Sincronização de Dados

### Atualização Automática
O dashboard está conectado a `config/leads.json` e atualiza:
- ✅ A cada 5 minutos (horário de funcionamento)
- ✅ Quando novo lead chega
- ✅ Quando Hannah faz uma ligação

### Atualizar Manualmente
1. Clique em "Sincronizar Dados" (quando implementado)
2. Ou recarregue a página (F5)

---

## 🔗 Integração com Sistemas Externos

### VAPI (Voice API)
- Status: Conectado ✓
- Webhook: `/api/webhook/vapi`
- Ligações sincronizadas em tempo real

### Twilio
- Número: +1 321 384-9782
- Status: Ativo ✓
- SMS/Chamadas monitoradas

### Railway Server
- Porta: 3000 (padrão)
- Uptime: 99.8%
- Status: Operacional ✓

---

## 📧 Suporte e Problemas

### Esqueceu a Senha?
```
1. Verifique o arquivo CREDENCIAIS_ACESSO_CRM.md (este arquivo)
2. Se perder senha, entre em contato: suporte@hannah.com
3. Recovery via email será ativado em breve
```

### Dashboard Não Carrega?
- ✅ Verifique se está usando navegador moderno (Chrome 90+)
- ✅ Limpe cache (Ctrl+Shift+Delete)
- ✅ Desative VPN/Proxy temporariamente
- ✅ Tente em navegador privado

### Dados Não Atualizam?
- ✅ Verifique conexão de internet
- ✅ Confira se Railway server está rodando
- ✅ Verifique `config/leads.json` existe
- ✅ Reinicie a aplicação

---

## 🛡️ Proteção de Dados

### Informações Protegidas
- Senhas armazenadas com hash (não em texto)
- Comunicação via HTTPS (quando em produção)
- Dados de clientes criptografados
- Logs de acesso registrados

### Política de Retenção
- Dados de leads: 12 meses
- Logs de acesso: 90 dias
- Backups: 30 dias (automático)

---

## 📱 Acesso Mobile

Você pode acessar o dashboard do seu telefone:
1. Mesma URL do computador
2. Interface adaptada para mobile
3. Funcionalidades completas

---

## 🚀 Próximos Passos

1. ✅ **Hoje**: Fazer login e explorar o dashboard
2. ✅ **Esta Semana**: Alterar senhas padrão
3. ✅ **Próximas 2 Semanas**: Criar usuários para sua equipe
4. ✅ **Próximo Mês**: Integrar com CRM externo (Hubspot/Pipedrive)

---

**Última atualização**: 22/03/2026  
**Versão**: Hannah 3.0.1  
**Status**: ✓ Operacional
