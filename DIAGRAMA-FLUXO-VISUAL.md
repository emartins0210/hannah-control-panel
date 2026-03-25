# 🎯 DIAGRAMA VISUAL DO FLUXO DE DADOS

## 1️⃣ FLUXO PRINCIPAL: Do Cliente até Conclusão

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                    CLIENTE / SITE                             ┃
┃                  (lopesservices.top)                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━┬━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                          │
                          │ "Quero agendar uma limpeza"
                          │ • Endereço: 123 Main St
                          │ • Cidade: Melbourne, FL
                          │ • Data: 30/03/2024
                          │
                          ▼
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃              SERVIDOR FABÍOLA SERVICES                         ┃
┃                                                                 ┃
┃  POST /api/automacao/processar-house-agendada                 ┃
┗━━━━━━━━━━━━━━━━━┬━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                  │
        ┌─────────┼─────────┬──────────┐
        │         │         │          │
        ▼         ▼         ▼          ▼
    ┌────────┬────────┬────────┐  ┌─────────┐
    │VALIDAR │CALCULO │SELECIO │  │ CRIAR   │
    │DADOS   │DISTANCIA│EQUIPE  │  │REGISTRO │
    │        │        │        │  │         │
    │✓Cliente│Google  │Score = │  │House ID │
    │✓Adrço  │Maps    │D*0.6 + │  │Data: OK │
    │✓Data   │API     │C*2     │  │Equipe:  │
    │        │        │        │  │Equipe 2 │
    └────────┴────────┴────────┘  └─────────┘
        │         │         │          │
        └─────────┼─────────┴──────────┘
                  │
                  ▼
        ┌──────────────────────┐
        │ ATUALIZAR 2 SISTEMAS │
        │  SIMULTANEAMENTE     │
        └─────┬────────┬───────┘
              │        │
        ┌─────▼─┐  ┌───▼──────┐
        │PAINEL │  │ GESTOR   │
        │AGENDA │  │FINANCEIRO│
        │DOR    │  │  PRÓ     │
        │       │  │          │
        │+House │  │+Cliente  │
        │+Equipe│  │+Agendm.  │
        │+Data  │  │+Valor    │
        │       │  │+Frequênc.│
        └─┬─────┘  └────┬─────┘
          │             │
          └──────┬──────┘
                 │
                 ▼
        ┌──────────────────────┐
        │   ENVIAR NOTIFICAÇÕES│
        └─┬────────┬───────┬───┘
          │        │       │
      ┌───▼──┐ ┌──▼───┐ ┌─▼────┐
      │EMAIL │ │WhatsApp│WhatsApp
      │Cliente│ │Cliente │Fabíola
      │      │ │        │
      │✓conf.│ │✓status │✓novo
      │✓data │ │✓equipe │✓job
      │✓equi │ │✓local  │✓cliente
      └──────┘ └────────┘└───────┘
          │        │       │
          └────────┼───────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  ✅ AGENDAMENTO      │
        │     CONCLUÍDO!       │
        │                      │
        │ • Sistema atualizado │
        │ • Equipe notificada  │
        │ • Cliente confirmado │
        │ • Financeiro sincron.│
        └──────────────────────┘
```

---

## 2️⃣ FLUXO DE DISTRIBUIÇÃO INTELIGENTE

```
┌─────────────────────────────────────────────────────────┐
│ NOVA HOUSE: 999 Test Lane, Melbourne, FL                │
└──────────────────────┬──────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
       ▼               ▼               ▼
    ┌─────────────┐ ┌──────────────┐ ┌──────────────┐
    │ EQUIPE 1    │ │ EQUIPE 2     │ │ EQUIPE 3     │
    │             │ │              │ │              │
    │ 27 clientes │ │ 27 clientes  │ │ 26 clientes  │
    │ 6 agendados │ │ 3 agendados  │ │ 2 agendados  │
    │ esta semana │ │ esta semana  │ │ esta semana  │
    └──────┬──────┘ └──────┬───────┘ └──────┬───────┘
           │               │               │
           │ GOOGLE MAPS   │ GOOGLE MAPS   │ GOOGLE MAPS
           ▼               ▼               ▼
           │        DISTÂNCIA   │
      5.2 km   ←→   2.1 km    ←→   8.5 km
           │               │               │
           │               │               │
       CÁLCULO DE SCORE:
       ┌─────────────────────────────────────────────┐
       │  SCORE = (Distância × 0.6) + (Agendados × 2) │
       ├─────────────────────────────────────────────┤
       │  Equipe 1: (5.2 × 0.6) + (6 × 2) = 15.12   │
       │  Equipe 2: (2.1 × 0.6) + (3 × 2) = 7.26  ✅│
       │  Equipe 3: (8.5 × 0.6) + (2 × 2) = 9.10   │
       └─────────────────────────────────────────────┘
                   │
                   ▼
       ┌──────────────────────────┐
       │  🏆 VENCEDOR: EQUIPE 2  │
       │                          │
       │ • Mais perto (2.1km)     │
       │ • Menos sobrecarregada   │
       │   (apenas 3 agendados)   │
       │                          │
       │ Score mais baixo = Melhor│
       └──────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ ATRIBUIR À       │
    │ EQUIPE 2         │
    └──────────────────┘
```

---

## 3️⃣ ARQUITETURA DE INTEGRAÇÕES

```
        ┌──────────────────────────────────────────┐
        │   SERVIDOR FABÍOLA SERVICES (Node.js)    │
        └────────────┬─────────────────────────────┘
                     │
    ┌────────────────┼────────────────────────────────┐
    │                │                                │
    │                │                                │
    ▼                ▼                                ▼
┌──────────────┐  ┌──────────────┐  ┌────────────────────┐
│  GOOGLE MAPS │  │  WHATSAPP    │  │   EMAIL SMTP       │
│              │  │  BUSINESS    │  │                    │
│ Distance     │  │  API         │  │ • Gmail            │
│ Matrix API   │  │              │  │ • SendGrid         │
│              │  │ • Token      │  │ • Qualquer SMTP    │
│ • Calcula    │  │ • Phone ID   │  │                    │
│   distâncias │  │              │  │ • Porta 587/465    │
│ • Em KM      │  │ Envia msgs:  │  │                    │
│ • Tempo real │  │              │  │ Envia emails:      │
│              │  │ • Cliente    │  │                    │
│              │  │ • Fabíola    │  │ • Confirmação      │
│              │  │              │  │ • Detalhes job     │
│              │  │              │  │                    │
└──────┬───────┘  └──────┬───────┘  └─────┬──────────┘
       │                 │                │
       └────────────┬────┴────────────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
    ▼               ▼               ▼
┌──────────────┐ ┌──────────────────────┐ ┌─────────────────┐
│   PAINEL     │ │   GESTOR FINANCEIRO  │ │   BANCO DE      │
│  AGENDADOR   │ │      PRÓ             │ │    DADOS        │
│              │ │                      │ │                 │
│ • Mostra     │ │ • API REST           │ │ • clientes.json │
│   casas      │ │ • Webhook            │ │ • equipes.json  │
│ • Equipes    │ │ • Tokens             │ │ • houses.json   │
│ • Status     │ │ • Sincronização      │ │                 │
│              │ │   automática         │ │ Persiste:       │
│ Real-time    │ │                      │ │ • Clientes      │
│              │ │ Registra:            │ │ • Agendamentos  │
│              │ │ • Clientes novos     │ │ • Histórico     │
│              │ │ • Agendamentos       │ │ • Equipes       │
│              │ │ • Valores            │ │ • Receita       │
│              │ │ • Frequências        │ │                 │
└──────┬───────┘ └──────────┬──────────┘ └────────┬────────┘
       │                    │                     │
       └────────┬───────────┴─────────────────────┘
                │
                ▼
        ┌──────────────────┐
        │  DADOS SEMPRE    │
        │  SINCRONIZADOS   │
        │  EM TEMPO REAL   │
        └──────────────────┘
```

---

## 4️⃣ CICLO DE VIDA DE UM AGENDAMENTO

```
HORA 0:00 - Cliente marca house
├── Estado: NOVO
├── Sistema: Vazio
└── Equipes: Não notificadas
    │
    ▼
HORA 0:01 - Sistema processa
├── Valida dados ✓
├── Calcula distâncias ✓
├── Seleciona equipe ✓
└── Status: EM_PROCESSAMENTO
    │
    ▼
HORA 0:02 - Sincronizações
├── Painel Agendador atualizado ✓
│   └── Mostra: Casa atribuída a Equipe 2
├── Gestor Financeiro atualizado ✓
│   └── Registra: Novo agendamento do cliente
└── Status: SINCRONIZADO
    │
    ▼
HORA 0:03 - Notificações enviadas
├── Email para cliente ✓
│   └── "Seu agendamento foi confirmado!"
├── WhatsApp para cliente ✓
│   └── "Equipe 2 atenderá você em 30/03"
├── WhatsApp para Fabíola ✓
│   └── "Novo job: 123 Main St - Melbourne"
└── Status: NOTIFICADO
    │
    ▼
HORA 0:04 - Agendamento completo
├── Status: CONFIRMADO
├── Casa está no sistema
├── Equipe sabe sobre o trabalho
├── Cliente recebeu confirmação
├── Financeiro registrou receita
└── ✅ PRONTO PARA EXECUÇÃO!
```

---

## 5️⃣ EXEMPLO NUMÉRICO REAL

```
CENÁRIO: 5 casas agendadas em um dia

Casa 1: "10 Oak Ave, Palm Bay" → Equipe 1 (3.2 km)
Casa 2: "555 Main St, Melbourne" → Equipe 2 (1.8 km)  
Casa 3: "777 Elm Rd, West Melbourne" → Equipe 1 (4.5 km)
Casa 4: "999 Pine St, Melbourne" → Equipe 2 (2.1 km)
Casa 5: "444 Birch Ln, Palm Bay" → Equipe 3 (5.8 km)

RESULTADO:
┌─────────┬──────────┬──────────────┬────────┐
│ Equipe  │ Casas    │ Total distânc│ Carga  │
├─────────┼──────────┼──────────────┼────────┤
│ Equipe 1│ 2 casas  │ 7.7 km       │ 8 horas│
│ Equipe 2│ 2 casas  │ 3.9 km       │ 8 horas│
│ Equipe 3│ 1 casa   │ 5.8 km       │ 4 horas│
└─────────┴──────────┴──────────────┴────────┘

✓ Distribuição balanceada
✓ Nenhuma equipe sobrecarregada
✓ Casas agrupadas por região
✓ Eficiência de rota otimizada
```

---

## 6️⃣ ESTRUTURA DE DADOS

```
┌─────────────────────────────────────────────────────┐
│ clientes.json (ARMAZENADO)                          │
├─────────────────────────────────────────────────────┤
│ {                                                   │
│   "id": "CLIENTE-123",                              │
│   "firstName": "João",                              │
│   "lastName": "Silva",                              │
│   "email": "joao@email.com",                        │
│   "phone": "(321) 555-1234",                        │
│   "endereco": "123 Main Street",                    │
│   "city": "Melbourne",                              │
│   "state": "FL",                                    │
│   "latitude": 28.0836,              ◄── Google Maps │
│   "longitude": -80.6063,            ◄── Google Maps │
│   "charge": 175.00,                 ◄── Receita    │
│   "frequencia": "semanal",                          │
│   "equipeId": "team-1",             ◄── Atribuição │
│   "casas": [                        ◄── Casas      │
│     {                                               │
│       "id": "HOUSE-001",                            │
│       "endereco": "123 Main",                       │
│       "city": "Melbourne",                          │
│       "equipeId": "team-1",                         │
│       "dataPrevista": "2024-04-01",                 │
│       "statusAgendamento": "confirmado"             │
│     }                                               │
│   ]                                                 │
│ }                                                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ equipes.json (ARMAZENADO)                           │
├─────────────────────────────────────────────────────┤
│ [                                                   │
│   {                                                 │
│     "id": "team-1",                                 │
│     "nome": "Equipe 1",                             │
│     "totalClientes": 27,                            │
│     "receita": 6655.00,                             │
│     "agendamentosSemanais": 5,                      │
│     "enderecoCentral": "Melbourne, FL"              │
│   },                                                │
│   ... Equipe 2, Equipe 3 ...                        │
│ ]                                                   │
└─────────────────────────────────────────────────────┘
```

---

## 7️⃣ FLUXO DE ERRO E RECUPERAÇÃO

```
┌─────────────────────────┐
│ AGENDAMENTO RECEBIDO    │
└────────┬────────────────┘
         │
         ▼
    VALIDAÇÃO
    ┌────────────────────┐
    │ Faltam dados?      │
    └────┬───────┬───────┘
         │       │
        NÃO     SIM
         │       │
         │       ▼
         │   ERRO: "Dados incompletos"
         │   └─ Retorna 400
         │   └─ Logs: InvalidData
         │   └─ Notifica API: falhou
         │
         ▼
    GOOGLE MAPS
    ┌────────────────────┐
    │ API disponível?    │
    └────┬───────┬───────┘
         │       │
        SIM     NÃO
         │       │
         │       ▼
         │   FALLBACK: Distância padrão
         │   └─ Continua processamento
         │   └─ Logs: GoogleMapsError
         │   └─ Usa heurística simples
         │
         ▼
    SINCRONIZAR
    ┌────────────────────┐
    │ Gestor disponível? │
    └────┬───────┬───────┘
         │       │
        SIM     NÃO
         │       │
         │       ▼
         │   FILA de espera
         │   └─ Tenta novamente em 5min
         │   └─ Máx 3 tentativas
         │   └─ Depois marca como erro
         │
         ▼
    NOTIFICAÇÕES
    ┌────────────────────┐
    │ Email falhou?      │
    │ WhatsApp falhou?   │
    └────┬───────┬───────┘
         │       │
        NÃO     SIM
         │       │
         │       ▼
         │   REGISTRA ERRO
         │   └─ Tentará novamente
         │   └─ Admin recebe alerta
         │   └─ Log: NotificationError
         │
         ▼
    AGENDAMENTO COMPLETO
    ┌────────────────────┐
    │ COM AVISOS DE ERRO │
    │                    │
    │ "Processado com    │
    │  sucesso, mas      │
    │  email falhou"     │
    └────────────────────┘
```

---

## 8️⃣ DASHBOARD EM TEMPO REAL

```
┌────────────────────────────────────────────────────────┐
│ 🤖 PAINEL DE AUTOMAÇÃO INTELIGENTE                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Status: ✅ ATIVO                      Hora: 14:35   │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 📊 DISTRIBUIÇÃO ATUAL DAS EQUIPES               │  │
│ ├──────────────────────────────────────────────────┤  │
│ │                                                   │  │
│ │ Equipe 1                                         │  │
│ │ ├─ 👥 Clientes: 27                               │  │
│ │ ├─ 📅 Esta semana: 6                             │  │
│ │ └─ 💰 Receita: $6,655.00                         │  │
│ │                                                   │  │
│ │ Equipe 2                                         │  │
│ │ ├─ 👥 Clientes: 27                               │  │
│ │ ├─ 📅 Esta semana: 3  ← MENOS CARGA              │  │
│ │ └─ 💰 Receita: $4,817.22                         │  │
│ │                                                   │  │
│ │ Equipe 3                                         │  │
│ │ ├─ 👥 Clientes: 26                               │  │
│ │ ├─ 📅 Esta semana: 2   ← MENOS CARGA             │  │
│ │ └─ 💰 Receita: $5,080.00                         │  │
│ │                                                   │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ ⚙️ STATUS DO SISTEMA                             │  │
│ ├──────────────────────────────────────────────────┤  │
│ │                                                   │  │
│ │  Google Maps     ✅ Ativo                         │  │
│ │  WhatsApp        ✅ Ativo                         │  │
│ │  Email           ✅ Ativo                         │  │
│ │  Gestor Financ.  ✅ Ativo                         │  │
│ │                                                   │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│  [➕ Agendar House] [📋 Simular] [👥 Selecionar]      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 9️⃣ TIMELINE DE UMA SEMANA

```
SEGUNDA-FEIRA
├─ 08:00 - Sistema inicia
├─ 10:30 - Casa 1 agendada → Equipe 1
├─ 14:15 - Casa 2 agendada → Equipe 2
├─ 15:45 - Casa 3 agendada → Equipe 1
└─ Status: 3 casas, 2 equipes

TERÇA-FEIRA
├─ 09:00 - Casa 4 agendada → Equipe 2
├─ 11:30 - Casa 5 agendada → Equipe 3
├─ 13:00 - Casa 6 agendada → Equipe 3
├─ 16:20 - Casa 7 agendada → Equipe 1
└─ Status: 7 casas, 3 equipes

QUARTA-FEIRA
├─ 10:00 - Casa 8 agendada → Equipe 2
├─ 12:45 - Casa 9 agendada → Equipe 2
├─ 14:30 - Casa 10 agendada → Equipe 1
└─ ⚠️ ALERTA: Equipe 2 com 4 agendamentos
              Sistema desacelera distribuição

QUINTA-FEIRA
├─ 09:15 - Casa 11 agendada → Equipe 3
├─ 11:00 - Casa 12 agendada → Equipe 1
├─ 15:30 - Casa 13 agendada → Equipe 3
└─ Status: Distribuição mais equilibrada

SEXTA-FEIRA
├─ 10:00 - Casa 14 agendada → Equipe 1
├─ 13:00 - Casa 15 agendada → Equipe 2
└─ Status: Fim de semana, 15 casas agendadas

RELATÓRIO DA SEMANA
┌─────────────────────────┐
│ Total de casas: 15      │
│ Equipe 1: 6 casas       │
│ Equipe 2: 5 casas       │
│ Equipe 3: 4 casas       │
│ Taxa sucesso: 100%      │
│ Tempo médio: < 1 seg    │
└─────────────────────────┘
```

---

## 🔟 LEGENDA DE SÍMBOLOS

| Símbolo | Significado |
|---------|------------|
| ✅ | Sucesso / Ativo |
| ❌ | Erro / Inativo |
| ⚠️ | Alerta / Atenção |
| 📊 | Relatório / Dados |
| 🤖 | Automação |
| 💬 | Mensagem / Comunicação |
| 📍 | Localização / Google Maps |
| 👥 | Pessoas / Equipe |
| 💰 | Dinheiro / Financeiro |
| 🏠 | Casa / Localidade |
| 📧 | Email |
| ⏰ | Tempo / Data |
| ▶️ | Fluxo / Próximo |

---

**Todos esses diagramas representam o sistema completamente funcional que foi criado!**

