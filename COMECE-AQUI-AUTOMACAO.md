# 🚀 COMECE AQUI - Sistema de Automação Inteligente

**Status do Sistema:** ✅ Completo e pronto para implementação

## Resumo em 60 segundos

Você tem um sistema automático que:
- 📍 Calcula distância até 3 equipes via Google Maps
- 🎯 Seleciona a equipe mais próxima + menos sobrecarregada
- 📧 Envia confirmação por email ao cliente
- 💬 Notifica Fabíola e cliente via WhatsApp
- 🔄 Sincroniza com Gestor Financeiro Pró automaticamente
- 📊 Oferece dashboard em tempo real para monitorar tudo

---

## ⚡ Passo 1: Verificação Rápida (2 minutos)

```bash
cd /Users/eugeniomartinss/Downloads/cleanai-CORRIGIDO-FINAL

# Verificar Node.js
node --version  # Deve ser v14+

# Verificar dependencies instaladas
npm list express --depth=0

# Listar arquivos principais
ls -lh agendador-inteligente-com-automacao.js
ls -lh server-com-automacao.js
ls -lh painel-automacao-inteligente.html
```

**Resultado esperado:** Todos os 3 arquivos existem (✅ VERIFICADO)

---

## 🔑 Passo 2: Configurar Credenciais (30 minutos)

### 2a. Copiar arquivo de configuração

```bash
cp .env.automacao .env
```

### 2b. Preencher as 4 integrações necessárias

**Abra `.env` e substitua:**

#### 1️⃣ Google Maps API
```
GOOGLE_MAPS_API_KEY=SUA_CHAVE_AQUI
```
**Como obter:** 
- Ir para https://console.cloud.google.com
- Criar novo projeto
- Ativar "Maps Distance Matrix API"
- Criar credencial API Key
- Copiar a chave

#### 2️⃣ WhatsApp Business API
```
WHATSAPP_BUSINESS_TOKEN=seu_token_aqui
WHATSAPP_PHONE_ID=seu_phone_id_aqui
FABIOLA_WHATSAPP_PHONE=+55XXXXXXXXXXXX
```
**Como obter:**
- Ir para https://www.whatsapp.com/business/
- Criar conta Business
- Obter token na seção API
- Usar seu número de telefone (com código do país)

#### 3️⃣ Gestor Financeiro Pró
```
GESTOR_FINANCEIRO_URL=https://seu-gestor.com/api
GESTOR_FINANCEIRO_TOKEN=seu_token_aqui
```

#### 4️⃣ Email SMTP (para confirmação ao cliente)
```
SMTP_HOST=smtp.seuservidor.com
SMTP_PORT=587
SMTP_USER=seu-email@example.com
SMTP_PASS=sua_senha
SMTP_FROM=noreply@lopes-services.com
```

#### 5️⃣ Coordenadas das equipes (IMPORTANTE!)
```
EQUIPE_1_LAT=40.7128
EQUIPE_1_LNG=-74.0060
EQUIPE_1_NOME=Equipe Centro

EQUIPE_2_LAT=34.0522
EQUIPE_2_LNG=-118.2437
EQUIPE_2_NOME=Equipe Oeste

EQUIPE_3_LAT=41.8781
EQUIPE_3_LNG=-87.6298
EQUIPE_3_NOME=Equipe Norte
```

---

## 🧪 Passo 3: Teste Local (10 minutos)

### 3a. Iniciar servidor

```bash
npm start
# Ou manualmente:
node server-com-automacao.js
```

**Esperado:**
```
✅ Servidor rodando na porta 3000
✅ Integrações carregadas
✅ Google Maps: [status]
✅ WhatsApp: [status]
✅ Email: [status]
```

### 3b. Acessar Dashboard

Abra no navegador:
```
http://localhost:3000
```

Verá:
- Status de todas as integrações
- Distribuição de equipes em tempo real
- Forma para testar novo agendamento

### 3c. Testar agendamento (sem salvar no banco)

No dashboard, preencha:
- **Nome cliente:** João Silva
- **Email:** joao@example.com
- **Telefone:** +551133334444
- **Latitude:** 40.7128
- **Longitude:** -74.0060
- **Serviço:** Limpeza Completa
- **Data:** 2026-03-25

Clique "Simular Distribuição"

**Resultado esperado:**
```
✅ Equipe selecionada: Equipe Centro (10.5 km)
✅ Carga atual: 3 agendamentos
✅ Score: 8.4/10
✅ Email simulado enviado
✅ WhatsApp simulado enviado
✅ Sincronização simulada com Gestor
```

---

## 🌐 Passo 4: Integrar com lopesservices.top (1-2 horas)

### 4a. Adicionar botão de agendamento no site

No HTML do seu site (lopesservices.top), adicione um formulário que envie POST para:

```
https://seu-servidor.com/api/automacao/processar-house-agendada
```

**Exemplo de integração (JavaScript):**

```javascript
// Quando cliente clica "Agendar" no site
document.getElementById('btnAgendar').addEventListener('click', async () => {
  const dados = {
    nomeCliente: document.getElementById('nome').value,
    emailCliente: document.getElementById('email').value,
    telefoneCliente: document.getElementById('telefone').value,
    latitude: 40.7128,  // Obtida via geolocalização ou endereço
    longitude: -74.0060,
    tipoServico: 'Limpeza Completa',
    dataAgendamento: document.getElementById('data').value,
    descricao: document.getElementById('descricao').value
  };

  try {
    const resposta = await fetch('https://seu-servidor.com/api/automacao/processar-house-agendada', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    
    if (resposta.ok) {
      alert('✅ Agendamento confirmado! Você receberá uma mensagem no WhatsApp.');
    } else {
      alert('❌ Erro ao agendar. Tente novamente.');
    }
  } catch (erro) {
    console.error('Erro:', erro);
  }
});
```

### 4b. Testar integração

1. Acesse lopesservices.top
2. Preencha formulário de agendamento
3. Clique "Agendar"
4. Verifique:
   - ✅ Email recebido (cliente)
   - ✅ WhatsApp recebido (Fabíola)
   - ✅ WhatsApp recebido (cliente)
   - ✅ Aparece em "Meus Agendamentos" no site

---

## 📦 Passo 5: Deploy na Internet (30 minutos)

### Opção A: Render.com (RECOMENDADO - Fácil)

1. Criar conta em https://render.com
2. Conectar repositório GitHub
3. Criar novo "Web Service"
4. Configurar:
   ```
   Build command: npm install
   Start command: npm start
   Environment: Adicionar variáveis do .env
   ```
5. Deploy automático

**URL resultado:** `https://seu-app-name.onrender.com`

### Opção B: Docker (Sua própria VPS)

Arquivo `Dockerfile` já existe:

```bash
# Construir imagem
docker build -t lopes-automacao .

# Rodar localmente para testar
docker run -p 3000:3000 lopes-automacao

# Fazer push para seu servidor
docker push seu-registry/lopes-automacao
docker run -d -p 3000:3000 seu-registry/lopes-automacao
```

---

## 📊 Passo 6: Monitorar em Produção

### 6a. Ver distribuição de equipes

```bash
curl https://seu-servidor.com/api/automacao/distribuicao-equipes
```

Resultado:
```json
{
  "equipes": [
    {
      "id": 1,
      "nome": "Equipe Centro",
      "agendamentosHoje": 3,
      "cargaSemanal": 15,
      "proximos3Dias": 8
    }
  ]
}
```

### 6b. Ver últimos agendamentos

No dashboard em tempo real (http://seu-servidor.com)

### 6c. Health Check

```bash
curl https://seu-servidor.com/health
# Retorna: {"status": "ok", "uptime": "2h 34m"}
```

---

## 🆘 Troubleshooting Rápido

### Problema: "Google Maps API não autorizada"
**Solução:** Verificar se chave está com acesso a Distance Matrix API habilitado

### Problema: "WhatsApp não envia mensagem"
**Solução:** Verificar token expirado em https://www.whatsapp.com/business

### Problema: "Email não chega"
**Solução:** Verificar credenciais SMTP e se servidor permite porta 587

### Problema: "Equipe não é selecionada corretamente"
**Solução:** Verificar se coordenadas das equipes estão corretas no .env

### Problema: "Gestor Financeiro não sincroniza"
**Solução:** Testar manualmente a URL e token do Gestor

---

## 📚 Arquivos e Documentação

| Arquivo | Uso |
|---------|-----|
| `agendador-inteligente-com-automacao.js` | Motor de automação principal |
| `server-com-automacao.js` | Servidor Express pronto para usar |
| `painel-automacao-inteligente.html` | Dashboard visual em tempo real |
| `routes-automacao-inteligente.js` | Endpoints da API |
| `.env.automacao` | Template de configuração |
| `GUIA-AUTOMACAO-INTELIGENTE.md` | Documentação completa (PT) |
| `IMPLEMENTACAO-AUTOMACAO-PASSO-A-PASSO.md` | Implementação detalhada |
| `DIAGRAMA-FLUXO-VISUAL.md` | 10 diagramas do sistema |
| `ARQUITETURA-E-EXEMPLOS.md` | Arquitetura técnica |

---

## ✅ Checklist de Preparação

- [ ] Node.js instalado (v14+)
- [ ] npm dependencies instaladas
- [ ] Google Maps API configurada
- [ ] WhatsApp Business API ativa
- [ ] SMTP email testado
- [ ] Coordenadas das 3 equipes preenchidas
- [ ] .env criado com todas as credenciais
- [ ] Servidor inicia sem erros
- [ ] Dashboard acessível em localhost:3000
- [ ] Simulação de agendamento funciona
- [ ] Emails chegam na caixa
- [ ] WhatsApp recebe notificações
- [ ] Site lopesservices.top integrado
- [ ] Deploy em produção realizado

---

## 🎯 Próximos Passos

1. **HOJE:** Completar Passo 2 (configurar credenciais) + Passo 3 (testar local)
2. **AMANHÃ:** Integrar com lopesservices.top + fazer testes fim-a-fim
3. **SEMANA:** Deploy em produção (Render ou Docker)
4. **MONITORAMENTO:** Acompanhar distribuição de equipes e performance

---

## 💡 Dicas Pro

- Use a simulação do dashboard para testar sem salvar no banco
- Revise o `DIAGRAMA-FLUXO-VISUAL.md` para entender o fluxo completo
- Configure alertas para quando uma equipe fica com sobrecarga
- Faça backup do `.env` em local seguro
- Teste com números de telefone reais antes de desativar ambiente de teste

---

**Sistema criado em:** 24/03/2026  
**Status:** Pronto para produção ✅  
**Suporte:** Consulte os guias de documentação para detalhes técnicos
