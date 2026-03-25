# 🔗 INTEGRAÇÃO - AGENDADOR DE LIMPEZA NO GESTOR FINANCEIRO PRO

## Visão Geral

Você tem 3 componentes para integrar ao seu `gestorfinanceiropro.com.br`:

| Componente | Arquivo | Tipo | Função |
|-----------|---------|------|--------|
| **Frontend** | `painel-agendador-gestor.html` | HTML/JS | Interface visual para agendar |
| **Backend** | `agendador-route.js` | Node.js/Express | APIs para lógica de alocação |
| **Scripts** | `agendador-inteligente.js` | Node.js | CLI para automação |

---

## 🚀 PASSO 1: INTEGRAR ROTAS AO SEU SERVIDOR

### Seu arquivo `server.js`:

```javascript
const express = require('express');
const agendadorRouter = require('./agendador-route');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// ===== AGENDADOR DE LIMPEZA =====
app.use('/api/agendador', agendadorRouter);

// Iniciar servidor
app.listen(3000, () => {
  console.log('🚀 Servidor rodando em http://localhost:3000');
  console.log('📍 Agendador disponível em /api/agendador');
});
```

### Endpoints Disponíveis:

```
POST   /api/agendador/agendar          → Agenda casas aos carros
GET    /api/agendador/config           → Obtém configuração padrão
PUT    /api/agendador/config           → Atualiza configuração
POST   /api/agendador/validar          → Valida um agendamento
POST   /api/agendador/exportar-mailpad → Exporta para Mailpad
```

---

## 🎨 PASSO 2: INTEGRAR PAINEL NO GESTOR

### Copiar arquivo para sua pasta pública:

```bash
cp painel-agendador-gestor.html /seu/gestor/public/pages/
```

### Adicionar menu no seu Gestor:

```html
<!-- Na nav/menu do Gestor Financeiro Pro -->
<li>
  <a href="/pages/painel-agendador-gestor.html">
    🚗 Agendador de Limpeza
  </a>
</li>
```

---

## 💻 PASSO 3: CONECTAR FRONTEND AO BACKEND

### Editar o arquivo `painel-agendador-gestor.html`

Encontre a função `executarAgendador()` (linha ~450) e modifique para chamar sua API:

**ANTES (local):**
```javascript
function executarAgendador() {
    // ... configuração ...
    // Alocação local
}
```

**DEPOIS (com API):**
```javascript
async function executarAgendador() {
    if (casas.length === 0) {
        alert('Adicione pelo menos uma casa!');
        return;
    }

    const config = {
        tempoRegular: parseInt(document.getElementById('configTempoRegular').value),
        tempoDeep: parseInt(document.getElementById('configTempoDeep').value),
        intervaloMinimo: parseInt(document.getElementById('configIntervalo').value),
        maxDeepPorCarro: parseInt(document.getElementById('configMaxDeep').value),
        maxRegularPorCarro: parseInt(document.getElementById('configMaxRegular').value),
        numCarros: parseInt(document.getElementById('configNumCarros').value),
        horarios: document.getElementById('configHorarios').value.split(',').map(h => h.trim()),
    };

    try {
        const response = await fetch('/api/agendador/agendar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ casas, config })
        });

        const data = await response.json();

        if (data.sucesso) {
            resultado = { carros: data.carros, config };
            exibirResultado();
        } else {
            alert('Erro: ' + data.erro);
        }
    } catch (erro) {
        alert('Erro ao conectar com servidor: ' + erro.message);
    }
}
```

---

## 📡 PASSO 4: EXEMPLOS DE USO DA API

### Exemplo 1: Agendar Casas

```bash
curl -X POST http://localhost:3000/api/agendador/agendar \
  -H "Content-Type: application/json" \
  -d '{
    "casas": [
      {
        "id": 1,
        "endereco": "Rua A, 100 - Palm Bay",
        "lat": 28.0436,
        "lon": -80.3853,
        "tipo": "Regular"
      }
    ],
    "config": {
      "tempoRegular": 160,
      "tempoDeep": 270,
      "maxDeepPorCarro": 2,
      "maxRegularPorCarro": 4
    }
  }'
```

### Resposta Esperada:

```json
{
  "sucesso": true,
  "carros": [
    {
      "id": 1,
      "agendamentos": [
        {
          "id": 1,
          "endereco": "Rua A, 100 - Palm Bay",
          "tipo": "Regular",
          "horario": "08:00",
          "tempo": 160,
          "distancia": 0.0
        }
      ],
      "tempoTotal": 160
    }
  ],
  "validacao": {
    "valido": true,
    "erros": [],
    "avisos": []
  }
}
```

### Exemplo 2: Obter Configuração Padrão

```bash
curl http://localhost:3000/api/agendador/config
```

### Exemplo 3: Validar Agendamento

```bash
curl -X POST http://localhost:3000/api/agendador/validar \
  -H "Content-Type: application/json" \
  -d '{
    "carros": [ { ... } ],
    "config": { ... }
  }'
```

### Exemplo 4: Exportar para Mailpad

```bash
curl -X POST http://localhost:3000/api/agendador/exportar-mailpad \
  -H "Content-Type: application/json" \
  -d '{
    "carros": [ { ... } ]
  }'
```

---

## 🗄️ PASSO 5: SALVAR AGENDAMENTOS EM BANCO DE DADOS

### Adicionar ao seu `agendador-route.js`:

```javascript
const db = require('seu-database'); // Sua conexão ao BD

// POST /api/agendador/salvar
router.post('/salvar', async (req, res) => {
  try {
    const { carros, data, clienteId } = req.body;

    // Salvar cada agendamento
    for (const carro of carros) {
      for (const agendamento of carro.agendamentos) {
        await db.query(
          `INSERT INTO agendamentos (cliente_id, casa_id, carro_id, horario, tipo, data_agendamento) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [clienteId, agendamento.id, carro.id, agendamento.horario, agendamento.tipo, data]
        );
      }
    }

    res.json({
      sucesso: true,
      mensagem: `${carros.reduce((sum, c) => sum + c.agendamentos.length, 0)} agendamentos salvos`
    });
  } catch (erro) {
    res.status(500).json({
      sucesso: false,
      erro: erro.message
    });
  }
});
```

---

## 📊 PASSO 6: ADICIONAR DASHBOARD DE ACOMPANHAMENTO

### Criar nova aba no Gestor:

```javascript
// GET /api/agendador/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT 
        carro_id,
        COUNT(*) as total_agendamentos,
        SUM(CASE WHEN tipo = 'Regular' THEN 1 ELSE 0 END) as regulares,
        SUM(CASE WHEN tipo = 'Deep' THEN 1 ELSE 0 END) as deep,
        DATE(data_agendamento) as data
      FROM agendamentos
      WHERE data_agendamento >= CURRENT_DATE
      GROUP BY carro_id, data
    `);

    res.json({
      sucesso: true,
      dashboard: resultado.rows
    });
  } catch (erro) {
    res.status(500).json({
      sucesso: false,
      erro: erro.message
    });
  }
});
```

---

## 🔄 PASSO 7: SINCRONIZAR COM MAILPAD

### Adicionar integração Mailpad:

```javascript
// POST /api/agendador/sincronizar-mailpad
router.post('/sincronizar-mailpad', async (req, res) => {
  try {
    const { carros } = req.body;
    
    const mailpadAuth = {
      apiKey: process.env.MAILPAD_API_KEY,
      baseUrl: 'https://api.mailpad.com'
    };

    for (const carro of carros) {
      for (const agendamento of carro.agendamentos) {
        // Chamar API do Mailpad para criar agendamento
        await fetch(`${mailpadAuth.baseUrl}/schedule`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mailpadAuth.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            grupo: `Carro ${carro.id}`,
            horario: agendamento.horario,
            endereco: agendamento.endereco,
            tipo: agendamento.tipo,
            duracao: agendamento.tempo
          })
        });
      }
    }

    res.json({
      sucesso: true,
      mensagem: 'Sincronizado com Mailpad com sucesso'
    });
  } catch (erro) {
    res.status(500).json({
      sucesso: false,
      erro: erro.message
    });
  }
});
```

---

## 🔐 PASSO 8: ADICIONAR AUTENTICAÇÃO

### Proteger rotas do agendador:

```javascript
const verificarAuth = (req, res, next) => {
  if (!req.usuario) {
    return res.status(401).json({
      sucesso: false,
      erro: 'Não autenticado'
    });
  }
  next();
};

// Aplicar middleware de autenticação
router.use(verificarAuth);

// Suas rotas continuam...
```

---

## 📱 PASSO 9: VERSÃO MOBILE

### Adicionar viewport responsivo:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
```

O `painel-agendador-gestor.html` já é responsivo! Funciona em mobile.

---

## 🧪 PASSO 10: TESTAR INTEGRAÇÃO

### Checklist de Testes:

- [ ] Backend rodando (`npm start`)
- [ ] Rotas respondendo (`curl http://localhost:3000/api/agendador/config`)
- [ ] Frontend carrega (`http://localhost:3000/pages/painel-agendador-gestor.html`)
- [ ] Adicionar casa funciona
- [ ] Botão "Executar Agendador" funciona
- [ ] Schedule aparece corretamente
- [ ] JSON é exportado corretamente
- [ ] Dados salvos no banco
- [ ] Sincronização com Mailpad funciona

---

## 📋 ESTRUTURA FINAL DO GESTOR

```
gestorfinanceiropro.com.br/
├── public/
│   ├── pages/
│   │   └── painel-agendador-gestor.html
│   ├── css/
│   └── js/
├── server.js (com agendador-route)
├── agendador-route.js ✨ NOVO
├── agendador-inteligente.js ✨ NOVO
├── config/
├── routes/
├── models/
└── package.json
```

---

## 🚀 RESUMO DA INTEGRAÇÃO

| Passo | Ação | Status |
|-------|------|--------|
| 1 | Copiar `agendador-route.js` ao projeto | ⏳ |
| 2 | Adicionar rotas ao `server.js` | ⏳ |
| 3 | Copiar `painel-agendador-gestor.html` ao public | ⏳ |
| 4 | Adicionar menu no Gestor | ⏳ |
| 5 | Testar endpoints com curl | ⏳ |
| 6 | Conectar frontend ao backend | ⏳ |
| 7 | Adicionar banco de dados | ⏳ |
| 8 | Sincronizar com Mailpad | ⏳ |
| 9 | Adicionar autenticação | ⏳ |
| 10 | Testes finais | ⏳ |

---

## 📞 SUPORTE

Se tiver problemas na integração:

1. **Erro 404 em /api/agendador**: Verifique se `agendador-route` foi importado em `server.js`
2. **CORS error**: Adicione middleware CORS:
   ```javascript
   const cors = require('cors');
   app.use(cors());
   ```
3. **JSON não valida**: Verifique estrutura das casas enviadas
4. **Conectar com Mailpad**: Obtenha API Key em https://mailpad.app

---

## ✨ PRONTO!

Seu agendador de limpeza está integrado ao Gestor Financeiro Pro! 🎉

**Próximas melhorias futuras:**
- Dashboard com analytics
- Histórico de agendamentos
- Relatórios de performance
- Notificações automáticas
- App mobile nativo
