# Integração Multi-Cliente com Gestor Financeiro

## 📋 Visão Geral da Integração

Este guia descreve como integrar o sistema multi-cliente de agendamento com a plataforma gestorfinanceiropro.com.br, permitindo gerenciar agendamentos de limpeza para todos os 80 clientes de Fabíola Services.

## 🔄 Fluxo de Integração

```
CLIENTES_AGENDAMENTO_MASTER.xlsx (80 clientes)
           ↓
   importar-clientes.js
           ↓
   dados-clientes/clientes.json
           ↓
   agendador-multicliente.js (processamento)
           ↓
   API REST (/api/multicliente/*)
           ↓
   gestorfinanceiropro.com.br (frontend)
```

## ✅ Pré-Requisitos

1. Node.js 14+ instalado
2. npm ou yarn instalado
3. CLIENTES_AGENDAMENTO_MASTER.xlsx no diretório
4. Permissões para criar diretório ./dados-clientes

## 🚀 Passos de Implementação

### Passo 1: Instalar Dependências

```bash
npm install express body-parser xlsx
```

### Passo 2: Importar Clientes do Excel

```bash
node importar-clientes.js CLIENTES_AGENDAMENTO_MASTER.xlsx
```

Output esperado:
```
✓ 80 clientes encontrados no arquivo
✓ Cliente importado: Cliente 1
✓ Cliente importado: Cliente 2
...
✅ Importação concluída!
   - Importados: 80
   - Erros: 0
   - Total: 80

📂 Dados salvos em: ./dados-clientes/clientes.json
```

### Passo 3: Iniciar Servidor

```bash
node app-multicliente.js
```

Output esperado:
```
🚀 Servidor rodando em http://localhost:3000
📊 Painel disponível em http://localhost:3000
📚 Documentação da API: http://localhost:3000/api/multicliente
```

### Passo 4: Acessar Painel

Abrir no navegador: `http://localhost:3000`

## 🔗 Endpoints Disponíveis

### 1. Listar Todos os Clientes

```bash
GET /api/multicliente/clientes
```

Response:
```json
{
  "clientes": [
    {
      "id": "cliente_1234567890",
      "nome": "Fabíola Services",
      "telefone": "(321) 555-1234",
      "email": "contato@fabolaservices.com",
      "endereco": "Rua Principal 123",
      "cidade": "Palm Bay",
      "status": "ativo",
      "valor": 5000,
      "casas": [],
      "agendamentos": [],
      "config": { ... }
    }
  ]
}
```

### 2. Adicionar Casas em Lote (Nova Função)

Para importar casas de um Excel:

```javascript
// script: importar-casas.js
const fs = require('fs');
const XLSX = require('xlsx');
const { GerenciadorClientes } = require('./agendador-multicliente');

function importarCasasDoExcel(caminhoExcel, clienteId) {
  const workbook = XLSX.readFile(caminhoExcel);
  const casasSheet = workbook.Sheets['Casas por Cliente'];
  const dados = XLSX.utils.sheet_to_json(casasSheet);

  const gerenciador = new GerenciadorClientes('./dados-clientes');
  let importadas = 0;

  for (const linha of dados) {
    if (linha['Cliente ID'] === clienteId) {
      gerenciador.adicionarCasa(clienteId, {
        id: linha['Casa ID'],
        endereco: linha['Endereço'],
        lat: parseFloat(linha['Lat']),
        lon: parseFloat(linha['Long']),
        tipo: linha['Tipo'] || 'regular'
      });
      importadas++;
    }
  }

  console.log(`✓ ${importadas} casas importadas para cliente ${clienteId}`);
}

// Uso
importarCasasDoExcel('CLIENTES_AGENDAMENTO_MASTER.xlsx', 'cliente_12345');
```

### 3. Executar Agendamento para Cliente Específico

```bash
POST /api/multicliente/agendar
Content-Type: application/json

{
  "clienteId": "cliente_1234567890"
}
```

Response:
```json
{
  "sucesso": true,
  "agendamento": {
    "id": "agendamento_1234567890",
    "clienteId": "cliente_1234567890",
    "data": "2024-03-24T10:30:00Z",
    "carros": {
      "1": {
        "trabalho": 8.5,
        "deepclean": 1,
        "agendas": [
          {
            "carro": 1,
            "casa": "casa_123",
            "endereco": "Rua Exemplo 456",
            "horario": "08:00",
            "tipo": "regular",
            "tempo": 2.67
          }
        ]
      }
    }
  }
}
```

### 4. Sincronizar com Mailpad (Novo Endpoint)

```javascript
// Em agendador-route-multicliente.js, adicionar:
router.post('/exportar-mailpad/:clienteId', (req, res) => {
  try {
    const agendamentos = gerenciador.obterAgendamentos(req.params.clienteId);
    const ultimoAgendamento = agendamentos[agendamentos.length - 1];

    if (!ultimoAgendamento) {
      return res.status(404).json({ erro: 'Nenhum agendamento encontrado' });
    }

    const mailpadData = {
      cliente_id: req.params.clienteId,
      grupos: []
    };

    Object.entries(ultimoAgendamento.carros).forEach(([numCarro, carro]) => {
      mailpadData.grupos.push({
        grupo: numCarro,
        agendas: carro.agendas.map(agenda => ({
          endereco: agenda.endereco,
          horario: agenda.horario,
          tipo: agenda.tipo,
          tempo_estimado: agenda.tempo
        }))
      });
    });

    res.json(mailpadData);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});
```

Uso:
```bash
GET /api/multicliente/exportar-mailpad/cliente_1234567890
```

## 📊 Integração com Banco de Dados

Para produção, integrar com banco de dados:

### MongoDB

```javascript
const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
  id: String,
  nome: String,
  telefone: String,
  email: String,
  endereco: String,
  cidade: String,
  status: String,
  valor: Number,
  casas: Array,
  agendamentos: Array,
  config: Object
});

const Cliente = mongoose.model('Cliente', clienteSchema);

// Usar no lugar de arquivo JSON
class GerenciadorClientesDB {
  async adicionarCliente(clienteData) {
    const cliente = new Cliente(clienteData);
    return await cliente.save();
  }

  async obterCliente(clienteId) {
    return await Cliente.findOne({ id: clienteId });
  }

  async listarClientes() {
    return await Cliente.find();
  }
}
```

### PostgreSQL

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  user: 'usuario',
  password: 'senha',
  host: 'localhost',
  port: 5432,
  database: 'agendador'
});

class GerenciadorClientesDB {
  async adicionarCliente(clienteData) {
    const query = `
      INSERT INTO clientes (id, nome, telefone, email, endereco, cidade, status, valor)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await pool.query(query, [
      clienteData.id,
      clienteData.nome,
      clienteData.telefone,
      clienteData.email,
      clienteData.endereco,
      clienteData.cidade,
      clienteData.status,
      clienteData.valor
    ]);
    return result.rows[0];
  }

  async obterCliente(clienteId) {
    const result = await pool.query('SELECT * FROM clientes WHERE id = $1', [clienteId]);
    return result.rows[0];
  }
}
```

## 🔐 Segurança

### Autenticação JWT

```javascript
const jwt = require('jsonwebtoken');

const autenticar = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, 'chave-secreta');
    req.usuarioId = decoded.usuarioId;
    next();
  } catch (erro) {
    res.status(401).json({ erro: 'Token inválido' });
  }
};

// Aplicar middleware às rotas
router.use(autenticar);
```

### Validação de Dados

```javascript
const { body, validationResult } = require('express-validator');

router.post('/agendar', [
  body('clienteId').isString().notEmpty()
], (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).json({ erros: erros.array() });
  }
  // Processar requisição
});
```

## 📈 Monitoramento e Logs

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Usar em endpoints
router.post('/agendar', (req, res) => {
  try {
    logger.info(`Agendamento iniciado para cliente: ${req.body.clienteId}`);
    // Processar
  } catch (erro) {
    logger.error(`Erro em agendamento: ${erro.message}`);
  }
});
```

## 🌐 Deploy em Produção

### Heroku

1. Criar arquivo `Procfile`:
```
web: node app-multicliente.js
```

2. Criar arquivo `.env`:
```
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://...
```

3. Deploy:
```bash
heroku create nome-app
git push heroku main
```

### AWS EC2

1. SSH na instância
2. Clonar repositório
3. Instalar dependências
4. Usar PM2 para manter processo rodando:
```bash
npm install pm2 -g
pm2 start app-multicliente.js
pm2 save
pm2 startup
```

## 📱 Sincronização com Mailpad

Adicionar na configuração:

```javascript
const clienteConfig = {
  mailpad: {
    apiUrl: 'https://api.mailpad.com/...',
    apiKey: 'seu-chave-api',
    gruposMapeamento: {
      1: 'grupo-mailpad-1',
      2: 'grupo-mailpad-2',
      3: 'grupo-mailpad-3'
    }
  }
};

// Sincronizar após agendamento
router.post('/agendar', async (req, res) => {
  const resultado = agendador.agendar(req.body.clienteId);
  
  // Sync com Mailpad
  await sincronizarMailpad(resultado, clienteConfig);
  
  res.json({ sucesso: true, agendamento: resultado });
});
```

## 🔄 Sincronização em Tempo Real

Usar WebSocket para atualizações em tempo real:

```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3001 });

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    const { acao, clienteId } = JSON.parse(msg);
    
    if (acao === 'agendamento-atualizado') {
      // Notificar todos os clientes
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            tipo: 'agendamento-novo',
            clienteId,
            timestamp: new Date()
          }));
        }
      });
    }
  });
});
```

## 📚 Próximas Etapas

1. ✅ Sistema multi-cliente funcionando
2. ⬜ Integrar com banco de dados
3. ⬜ Implementar autenticação JWT
4. ⬜ Adicionar sincronização Mailpad
5. ⬜ Deploy em produção
6. ⬜ Monitoramento e logs
7. ⬜ WebSocket para updates em tempo real
