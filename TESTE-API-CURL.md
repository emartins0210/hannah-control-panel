# 🧪 Teste Rápido da API com CURL

## Antes de começar

```bash
# Certifique-se que o servidor está rodando
npm start

# Em outro terminal, execute os testes abaixo
```

---

## 1️⃣ Verificar Status do Sistema

```bash
curl http://localhost:3000/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "uptime": "2m 34s",
  "port": 3000
}
```

---

## 2️⃣ Ver Distribuição Atual das Equipes

```bash
curl http://localhost:3000/api/automacao/distribuicao-equipes
```

**Resposta esperada:**
```json
{
  "success": true,
  "equipes": [
    {
      "id": 1,
      "nome": "Equipe Centro",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "agendamentosHoje": 3,
      "cargaSemanal": 15,
      "proximo3Dias": 8,
      "statusGoogleMaps": "conectado"
    },
    {
      "id": 2,
      "nome": "Equipe Oeste",
      "latitude": 34.0522,
      "longitude": -118.2437,
      "agendamentosHoje": 2,
      "cargaSemanal": 12,
      "proximo3Dias": 6,
      "statusGoogleMaps": "conectado"
    },
    {
      "id": 3,
      "nome": "Equipe Norte",
      "latitude": 41.8781,
      "longitude": -87.6298,
      "agendamentosHoje": 5,
      "cargaSemanal": 18,
      "proximo3Dias": 9,
      "statusGoogleMaps": "conectado"
    }
  ],
  "timestamp": "2026-03-24T15:30:45.123Z"
}
```

---

## 3️⃣ Testar Seleção de Equipe (sem criar agendamento)

```bash
curl -X GET "http://localhost:3000/api/automacao/selecionar-equipe" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060,
    "tipoServico": "Limpeza Completa"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "equipeSelecionada": {
    "id": 1,
    "nome": "Equipe Centro",
    "distancia": 0.5,
    "cargaAtual": 3,
    "score": 1.8,
    "motivo": "Mais próxima e com carga balanceada"
  },
  "alternativas": [
    {
      "id": 2,
      "nome": "Equipe Oeste",
      "distancia": 2850.3,
      "score": 5704.6
    }
  ]
}
```

---

## 4️⃣ Simular Novo Agendamento (SEM salvar no banco)

```bash
curl -X POST "http://localhost:3000/api/automacao/simular-distribuicao" \
  -H "Content-Type: application/json" \
  -d '{
    "nomeCliente": "João Silva",
    "emailCliente": "joao@example.com",
    "telefoneCliente": "+5511999999999",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "tipoServico": "Limpeza Completa",
    "dataAgendamento": "2026-03-25",
    "horarioAgendamento": "10:00",
    "descricao": "Limpeza de apartamento de 100m²"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "agendamento": {
    "id": "temp-simulation-123",
    "nomeCliente": "João Silva",
    "equipeSelecionada": "Equipe Centro",
    "status": "SIMULADO",
    "dataAgendamento": "2026-03-25T10:00:00Z"
  },
  "notificacoes": {
    "emailCliente": {
      "enviado": true,
      "para": "joao@example.com",
      "assunto": "✅ Agendamento Confirmado - Equipe Centro"
    },
    "whatsappCliente": {
      "enviado": true,
      "para": "+5511999999999",
      "mensagem": "Seu agendamento foi confirmado para 25/03/2026 às 10:00. Equipe: Centro"
    },
    "whatsappFabiola": {
      "enviado": true,
      "para": "+5511988887777",
      "mensagem": "Novo agendamento: João Silva - Equipe Centro - 25/03/2026 10:00"
    }
  },
  "sincronizacao": {
    "gestorFinanceiro": "simulada",
    "status": "sucesso"
  }
}
```

---

## 5️⃣ Criar Agendamento Real (SALVA no banco)

⚠️ **CUIDADO:** Este comando realmente cria um agendamento!

```bash
curl -X POST "http://localhost:3000/api/automacao/processar-house-agendada" \
  -H "Content-Type: application/json" \
  -d '{
    "nomeCliente": "Maria Santos",
    "emailCliente": "maria@example.com",
    "telefoneCliente": "+5511988886666",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "tipoServico": "Limpeza Completa",
    "dataAgendamento": "2026-03-26",
    "horarioAgendamento": "14:00",
    "descricao": "Casa de 150m² - 3 quartos"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "agendamento": {
    "id": "AGD-2026-001234",
    "nomeCliente": "Maria Santos",
    "equipeSelecionada": "Equipe Centro",
    "dataAgendamento": "2026-03-26T14:00:00Z",
    "status": "CONFIRMADO",
    "criadoEm": "2026-03-24T15:35:20.456Z"
  },
  "notificacoes": {
    "emailCliente": { "enviado": true, "para": "maria@example.com" },
    "whatsappCliente": { "enviado": true, "para": "+5511988886666" },
    "whatsappFabiola": { "enviado": true, "para": "+5511988887777" }
  },
  "sincronizacao": {
    "gestorFinanceiro": {
      "enviado": true,
      "id": "GF-789456",
      "status": "sincronizado"
    }
  }
}
```

---

## 6️⃣ Ver Info do Sistema

```bash
curl http://localhost:3000/api/info
```

**Resposta esperada:**
```json
{
  "app": "Agendador Inteligente com Automação",
  "version": "1.0.0",
  "environment": "production",
  "integrações": {
    "googleMaps": "ativa",
    "whatsapp": "ativa",
    "email": "ativa",
    "gestorFinanceiro": "ativa"
  },
  "equipes": 3,
  "agendamentoHoje": 10,
  "agendamentoSemana": 47,
  "tempoResposta": "145ms"
}
```

---

## 7️⃣ Webhook - Sincronização com Gestor Financeiro

Se o Gestor Financeiro enviar um webhook:

```bash
curl -X POST "http://localhost:3000/api/automacao/webhook/gestor-financeiro" \
  -H "Content-Type: application/json" \
  -d '{
    "evento": "agendamento_confirmado",
    "agendamentoId": "GF-789456",
    "timestamp": "2026-03-24T15:35:20.456Z"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "processado": true,
  "detalhes": "Webhook processado com sucesso"
}
```

---

## 8️⃣ Webhook - Confirmação de Entrega WhatsApp

```bash
curl -X POST "http://localhost:3000/api/automacao/webhook/whatsapp" \
  -H "Content-Type: application/json" \
  -d '{
    "evento": "message_status_changed",
    "messageId": "wamid.123456789",
    "status": "delivered",
    "timestamp": "2026-03-24T15:35:25.123Z"
  }'
```

---

## 📊 Teste Completo (Simulação de 5 Agendamentos)

```bash
# Simular distribuição de 5 agendamentos em paralelo
curl -X POST "http://localhost:3000/api/automacao/simular-distribuicao" \
  -H "Content-Type: application/json" \
  -d '{
    "simulacoes": [
      {
        "nomeCliente": "Cliente 1",
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      {
        "nomeCliente": "Cliente 2",
        "latitude": 34.0522,
        "longitude": -118.2437
      },
      {
        "nomeCliente": "Cliente 3",
        "latitude": 41.8781,
        "longitude": -87.6298
      },
      {
        "nomeCliente": "Cliente 4",
        "latitude": 40.7580,
        "longitude": -73.9855
      },
      {
        "nomeCliente": "Cliente 5",
        "latitude": 34.1028,
        "longitude": -118.2437
      }
    ]
  }'
```

---

## 🔍 Teste com Erros (Para validar tratamento)

### Latitude/Longitude inválida

```bash
curl -X POST "http://localhost:3000/api/automacao/processar-house-agendada" \
  -H "Content-Type: application/json" \
  -d '{
    "nomeCliente": "Test",
    "latitude": 999,
    "longitude": 999,
    "tipoServico": "Teste"
  }'
```

**Resposta esperada:**
```json
{
  "success": false,
  "erro": "Coordenadas inválidas",
  "detalhes": "Latitude deve estar entre -90 e 90"
}
```

### Email inválido

```bash
curl -X POST "http://localhost:3000/api/automacao/processar-house-agendada" \
  -H "Content-Type: application/json" \
  -d '{
    "nomeCliente": "Test",
    "emailCliente": "email-invalido",
    "latitude": 40.7128,
    "longitude": -74.0060
  }'
```

---

## 📈 Teste de Performance

```bash
# Medir tempo de resposta
time curl http://localhost:3000/api/automacao/distribuicao-equipes

# Espera-se: < 500ms
```

---

## 💾 Salvar Respostas em Arquivo

```bash
# Guardar resposta completa
curl http://localhost:3000/api/info > response.json

# Verificar conteúdo
cat response.json | jq
```

---

## ✅ Checklist de Testes

- [ ] Health check passa
- [ ] Distribuição de equipes retorna 3 equipes
- [ ] Seleção de equipe funciona
- [ ] Simulação não salva no banco
- [ ] Criar agendamento funciona
- [ ] Emails são "enviados" (simulated)
- [ ] WhatsApp notifica (simulated)
- [ ] Gestor Financeiro sincroniza
- [ ] Webhooks processam corretamente
- [ ] Tratamento de erros funciona
- [ ] Performance está ok (< 500ms)

---

**Dica:** Use `jq` para formatar JSON:
```bash
curl http://localhost:3000/api/automacao/distribuicao-equipes | jq
```

