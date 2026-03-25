# 🚗 AGENDADOR INTELIGENTE DE LIMPEZA - HANNAH 3.0

## O Sistema

Um agendador automático que aloca casas aos 3 carros respeitando todos os constraints:

✅ **2h40min (160 min)** entre atendimentos  
✅ **Máximo 2 deep cleaning** por carro/dia  
✅ **Máximo 4 limpezas regulares** por carro/dia  
✅ **Máximo 3 horários diferentes** por dia  
✅ **Prioriza casas próximas de Palm Bay**  
✅ **Aloca sempre ao carro com menos trabalho**

---

## 📁 Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `AGENDAMENTO_LIMPEZA_HANNAH.xlsx` | Planilha com casas e schedule |
| `agendador-inteligente.js` | Script automático de alocação |
| `GUIA_AGENDADOR_INTELIGENTE.md` | Este guia |

---

## 🚀 PASSO 1: PREENCHER A PLANILHA

### Abra: `AGENDAMENTO_LIMPEZA_HANNAH.xlsx`

#### ABA 1: CASAS

Preencha a lista de casas com os seguintes dados:

| Coluna | Descrição | Exemplo |
|--------|-----------|---------|
| ID | Número único | 1, 2, 3... |
| Endereço | Rua completa | Rua A, 100 - Palm Bay |
| Lat | Latitude GPS | 28.0436 |
| Long | Longitude GPS | -80.3853 |
| Tipo | Regular ou Deep | Regular, Deep |
| Dist PB (km) | Calculado automaticamente | (fórmula) |

**Exemplo de dados:**

```
ID | Endereço                    | Lat    | Long      | Tipo    | Dist PB
1  | Rua A, 100 - Palm Bay       | 28.044 | -80.385   | Regular | 0.0
2  | Rua B, 200 - Melbourne      | 28.060 | -80.390   | Deep    | 1.9
3  | Rua C, 300 - Brevard        | 28.070 | -80.400   | Regular | 3.3
```

**Como obter Latitude/Longitude:**
- Google Maps: Clique no local, copie as coordenadas
- Formato: `28.0436, -80.3853`

---

## 🔄 PASSO 2: EXECUTAR AGENDADOR AUTOMÁTICO

### Execute o script Node.js:

```bash
node agendador-inteligente.js
```

### Saída esperada:

```
╔════════════════════════════════════════════════════════════╗
║         SCHEDULE OTIMIZADO DE LIMPEZA - HANNAH 3.0          ║
╚════════════════════════════════════════════════════════════╝

🚗 CARRO 1
   Tempo Total: 9h50
   Deep Cleaning: 1/2
   Limpeza Regular: 2/4
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   08:00 - 🔍 Deep    | Rua F, 600 - Palm Bay
              └─ 270 min | 0.1 km de Palm Bay
   10:40 - 🧹 Regular | Rua D, 400 - Palm Bay
              └─ 160 min | 0.1 km de Palm Bay
   13:20 - 🧹 Regular | Rua E, 500 - Brevard
              └─ 160 min | 3.3 km de Palm Bay
```

---

## 📊 PASSO 3: ENTENDER O RESULTADO

### Informações por Carro:

```
🚗 CARRO 1
   ├─ Tempo Total: 9h50 (horas totais de trabalho)
   ├─ Deep Cleaning: 1/2 (1 de máximo 2)
   ├─ Limpeza Regular: 2/4 (2 de máximo 4)
   └─ Horários: 3 (máximo 3 por dia)
       ├─ 08:00 → Deep cleaning (270 min)
       ├─ 10:40 → Limpeza regular (160 min) [2h40min depois]
       └─ 13:20 → Limpeza regular (160 min) [2h40min depois]
```

### Cores e Significado:

| Emoji | Significado |
|-------|-------------|
| 🚗 | Carro/Equipe |
| 🧹 | Limpeza Regular (160 min) |
| 🔍 | Deep Cleaning (270 min) |
| ✅ | Validação passou |
| ⚠️ | Aviso/Atenção |
| ❌ | Erro/Limite atingido |

---

## 🎯 VALIDAÇÃO DE CONSTRAINTS

### Checklist Automático:

```
✅ VERIFICAÇÕES:
   Carro 1: 3 horários (máx 3) - ✅
   Carro 1: 1 deep cleaning (máx 2) - ✅
   Carro 1: 2 limpezas regulares (máx 4) - ✅
   Carro 2: 2 horários (máx 3) - ✅
   Carro 2: 1 deep cleaning (máx 2) - ✅
   Carro 2: 1 limpezas regulares (máx 4) - ✅
   Carro 3: 3 horários (máx 3) - ✅
   Carro 3: 0 deep cleaning (máx 2) - ✅
   Carro 3: 3 limpezas regulares (máx 4) - ✅

✅ DISTÂNCIA:
   Casas próximas de Palm Bay (<10km) - ✅
```

---

## 💾 PASSO 4: EXPORTAR PARA MAILPAD

### JSON Format:

```json
[
  {
    "carro": 1,
    "agendamentos": [
      {
        "id": 6,
        "endereco": "Rua F, 600 - Palm Bay",
        "tipo": "Deep",
        "horario": "08:00",
        "tempo": 270
      }
    ],
    "tempoTotal": "9h50"
  }
]
```

### Como usar no Mailpad:

1. **Copie o JSON** do output
2. **Abra Mailpad** (seu software de agendamento)
3. **Crie novo grupo** para cada carro:
   - **Carro 1** → Casa 6 (08:00) + Casa 4 (10:40) + Casa 5 (13:20)
   - **Carro 2** → Casa 3 (08:00) + Casa 2 (10:40)
   - **Carro 3** → Casa 1 (08:00) + Casa 8 (10:40) + Casa 7 (13:20)

---

## ⚙️ CONFIGURAÇÕES

Se quiser ajustar o comportamento, edite `agendador-inteligente.js`:

```javascript
this.config = {
  tempoRegular: 160,         // 2h40min (em minutos)
  tempoDeep: 270,            // 4h30min (em minutos)
  intervaloMinimo: 160,      // 2h40min entre atendimentos
  maxDeepPorCarro: 2,        // Máximo de deep cleaning por dia
  maxRegularPorCarro: 4,     // Máximo de limpezas regulares por dia
  coordPalmBay: { 
    lat: 28.0436, 
    lon: -80.3853 
  },
};

this.horarios = ['08:00', '10:40', '13:20', '16:00'];
```

### Alterar Horários:

```javascript
this.horarios = ['09:00', '11:45', '14:30', '17:15']; // Seus horários
```

---

## 🔍 ALGORITMO DE ALOCAÇÃO

### Como Funciona:

1. **Ordena casas** por tipo (Deep primeiro) e proximidade a Palm Bay
2. **Para cada casa:**
   - Encontra carro com **menos trabalho**
   - Valida se **não excede limites**
   - Aloca no **próximo horário disponível**
3. **Gera schedule** com validação de constraints

### Exemplo de Alocação:

```
Casa 6 (Deep, 0.1km PB) → Carro 1 (menor trabalho) → 08:00
Casa 3 (Deep, 1.9km PB) → Carro 2 (menor trabalho) → 08:00
Casa 4 (Regular, 0.1km) → Carro 1 (menor trabalho) → 10:40
Casa 2 (Regular, 0.2km) → Carro 2 (menor trabalho) → 10:40
Casa 1 (Regular, 0.0km) → Carro 3 (menor trabalho) → 08:00
```

---

## 📈 OTIMIZAÇÕES

### Distribuição de Carga:

O sistema distribui o trabalho balanceadamente:

| Carro | Tempo | Deep | Regular | Horários |
|-------|-------|------|---------|----------|
| 1 | 9h50 | 1 | 2 | 3 |
| 2 | 7h10 | 1 | 1 | 2 |
| 3 | 8h00 | 0 | 3 | 3 |

**Total:** 25h (média de 8h20min por carro)

### Proximidade:

Todas as casas estão a menos de 10km de Palm Bay:

```
Carro 1: 0.1km, 0.1km, 3.3km
Carro 2: 1.9km, 0.2km
Carro 3: 0.0km, 0.1km, 2.6km
```

---

## 🚨 TROUBLESHOOTING

### Problema: "Casa não pôde ser alocada"

**Causa:** Limite de capacidade atingido

**Solução:**
- Aumentar `maxDeepPorCarro` ou `maxRegularPorCarro`
- Aumentar número de carros
- Dividir em 2 dias

```javascript
maxDeepPorCarro: 3,   // Era 2
maxRegularPorCarro: 5, // Era 4
```

### Problema: Casas muito longe de Palm Bay

**Causa:** GPS incorreto

**Solução:**
- Verificar coordenadas GPS
- Usar Google Maps para copiar correto
- Formato: `28.0436, -80.3853`

### Problema: Horários não batem

**Causa:** Intervalo mínimo não respeitado

**Solução:**
- Aumentar `intervaloMinimo`
- Ajustar `horarios`
- Verificar `tempoRegular` e `tempoDeep`

---

## 📱 INTEGRAÇÃO COM MAILPAD

### Estrutura dos Grupos:

```
GRUPO 1 (Carro 1)
├─ Casa 6 - Deep (08:00)
├─ Casa 4 - Regular (10:40)
└─ Casa 5 - Regular (13:20)

GRUPO 2 (Carro 2)
├─ Casa 3 - Deep (08:00)
└─ Casa 2 - Regular (10:40)

GRUPO 3 (Carro 3)
├─ Casa 1 - Regular (08:00)
├─ Casa 8 - Regular (10:40)
└─ Casa 7 - Regular (13:20)
```

---

## 🔗 PRÓXIMOS PASSOS

1. ✅ Preencher `AGENDAMENTO_LIMPEZA_HANNAH.xlsx` com suas casas
2. ✅ Executar `node agendador-inteligente.js`
3. ✅ Copiar resultado para Mailpad
4. ✅ Iniciar agendamento
5. ✅ Monitorar via Hannah 3.0 Dashboard

---

## 📞 SUPORTE

Se tiver problemas:

1. Verificar coordenadas GPS (Google Maps)
2. Verificar config em `agendador-inteligente.js`
3. Testar com dados de exemplo primeiro
4. Verificar saída do script para erros

---

## ✨ FUNCIONALIDADES FUTURAS

- [ ] Interface web para preencher casas
- [ ] Integração direta com Mailpad API
- [ ] Roteamento inteligente (menor distância total)
- [ ] Preferências de cliente (horários específicos)
- [ ] Histórico e analytics de performance
- [ ] Notificações automáticas para clientes
- [ ] Integração com Google Calendar para Hannah

---

**Seu agendador está pronto! 🚀**
