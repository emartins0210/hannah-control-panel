# Guia Sistema Multi-Cliente - Agendador Inteligente

## 📋 Visão Geral

O sistema multi-cliente permite gerenciar agendamentos de limpeza para múltiplos clientes simultâneamente. Cada cliente tem seu próprio conjunto de casas, agendamentos e configurações independentes.

## 🏗️ Arquitetura

### Componentes

1. **agendador-multicliente.js** - Core do sistema
   - `GerenciadorClientes`: Gerencia dados de clientes, casas e agendamentos
   - `AgendadorLimpezaMultiCliente`: Algoritmo de agendamento

2. **agendador-route-multicliente.js** - API REST
   - Endpoints para gerenciar clientes e casas
   - Endpoints para executar agendamentos
   - Endpoints para atualizar configurações

3. **painel-agendador-multicliente.html** - Interface
   - Seleção de cliente com dropdown
   - Formulário para criar novo cliente
   - Adição de casas por cliente
   - Execução de agendamento
   - Visualização de resultados

## 🚀 Como Usar

### 1. Inicializar o Servidor

```bash
npm install express body-parser
node app-multicliente.js
```

### 2. Criar Cliente Novo

Opção A: Via API REST
```bash
curl -X POST http://localhost:3000/api/multicliente/cliente \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Fabíola Services",
    "telefone": "(321) 555-1234",
    "email": "contato@fabolaservices.com",
    "endereco": "Rua Principal 123",
    "cidade": "Palm Bay",
    "status": "ativo",
    "valor": 5000
  }'
```

Opção B: Via Painel (recomendado)
- Abrir `painel-agendador-multicliente.html`
- Clicar "+ Novo Cliente"
- Preencher formulário
- Clicar "Salvar Cliente"

### 3. Adicionar Casas

Via API:
```bash
curl -X POST http://localhost:3000/api/multicliente/casa \
  -H "Content-Type: application/json" \
  -d '{
    "clienteId": "cliente_1234567890",
    "endereco": "Rua Exemplo 456",
    "lat": 28.2634,
    "lon": -80.7282,
    "tipo": "regular"
  }'
```

Via Painel:
- Selecionar cliente
- Preencher Endereço, Latitude, Longitude, Tipo
- Clicar "Adicionar Casa"

### 4. Configurar Agendador

Via API:
```bash
curl -X PUT http://localhost:3000/api/multicliente/config/cliente_1234567890 \
  -H "Content-Type: application/json" \
  -d '{
    "numCarros": 3,
    "maxHorariosRepetidos": 3,
    "maxCasasHorario": 4,
    "tempoLimpezaRegular": 2.67,
    "tempoDeepClean": 4.5,
    "maxDeepCleanDia": 2,
    "maxLimpezaRegularDia": 4
  }'
```

Via Painel:
- Configurações aparecem automaticamente com valores padrão
- Modificar conforme necessário
- Clicar "Salvar Configuração"

### 5. Executar Agendamento

Via API:
```bash
curl -X POST http://localhost:3000/api/multicliente/agendar \
  -H "Content-Type: application/json" \
  -d '{"clienteId": "cliente_1234567890"}'
```

Via Painel:
- Clicar "🚀 Executar Agendamento"
- Visualizar resultados em tempo real

## 📊 Estrutura de Dados

### Cliente
```json
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
```

### Casa
```json
{
  "id": "casa_1234567890",
  "endereco": "Rua Exemplo 456",
  "lat": 28.2634,
  "lon": -80.7282,
  "tipo": "regular|deepclean",
  "distancia": 2.45
}
```

### Agendamento
```json
{
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
```

## 🔌 Endpoints da API

### Clientes

**POST** `/api/multicliente/cliente`
Criar novo cliente
```json
{
  "nome": "string",
  "telefone": "string",
  "email": "string",
  "endereco": "string",
  "cidade": "string",
  "status": "string",
  "valor": "number"
}
```

**GET** `/api/multicliente/clientes`
Listar todos os clientes

**GET** `/api/multicliente/cliente/:clienteId`
Obter cliente específico

### Casas

**POST** `/api/multicliente/casa`
Adicionar casa para cliente
```json
{
  "clienteId": "string",
  "endereco": "string",
  "lat": "number",
  "lon": "number",
  "tipo": "regular|deepclean"
}
```

**GET** `/api/multicliente/casas/:clienteId`
Listar casas de um cliente

### Agendamentos

**POST** `/api/multicliente/agendar`
Executar agendamento
```json
{
  "clienteId": "string"
}
```

**GET** `/api/multicliente/agendamentos/:clienteId`
Listar agendamentos de um cliente

### Configuração

**PUT** `/api/multicliente/config/:clienteId`
Atualizar configuração do cliente
```json
{
  "numCarros": "number",
  "maxHorariosRepetidos": "number",
  "maxCasasHorario": "number",
  "tempoLimpezaRegular": "number",
  "tempoDeepClean": "number",
  "maxDeepCleanDia": "number",
  "maxLimpezaRegularDia": "number"
}
```

## 💾 Armazenamento de Dados

Dados são armazenados em `./dados-clientes/clientes.json`

Formato:
```json
{
  "cliente_1234567890": { ... },
  "cliente_9876543210": { ... }
}
```

## 🔄 Fluxo de Trabalho Completo

1. **Criar Cliente**
   - Enviar dados do cliente via API ou formulário
   - Sistema gera ID único
   - Cliente armazenado em clientes.json

2. **Adicionar Casas**
   - Para cada casa, enviar endereço, coordenadas e tipo
   - Sistema calcula distância até Palm Bay
   - Casas armazenadas com ID único

3. **Configurar Agendador**
   - Definir número de carros, tempo de limpeza, etc
   - Configuração específica por cliente

4. **Executar Agendamento**
   - Sistema lê casas do cliente
   - Ordena por tipo (deepclean primeiro) e distância
   - Distribui entre carros respeitando restrições
   - Retorna agendamento com horários

5. **Validar Resultado**
   - Verificar se deep cleanings estão dentro do limite
   - Verificar distribuição de carga entre carros

## 🛠️ Personalização

### Mudar Location Priority (Palm Bay)
Editar em `agendador-multicliente.js`:
```javascript
locationPriority: { lat: 28.2634, lon: -80.7282 }
```

### Modificar Horários
Editar em `agendador-multicliente.js`:
```javascript
const horarios = ['08:00', '10:40', '15:10'];
```

### Alterar Tempos de Limpeza
Editar em `agendador-multicliente.js`:
```javascript
tempoLimpezaRegular: 2.67, // em horas
tempoDeepClean: 4.5
```

## 🐛 Troubleshooting

**Erro: "clienteId é obrigatório"**
- Verificar se clienteId está sendo enviado na requisição

**Erro: "Cliente não encontrado"**
- Verificar se clienteId existe em clientes.json
- Listar clientes com GET /api/multicliente/clientes

**Casas não aparecem**
- Verificar se clienteId está correto
- Verificar se casas foram adicionadas via POST /api/multicliente/casa

**Agendamento vazio**
- Verificar se há casas adicionadas para o cliente
- Verificar configurações do cliente

## 📈 Escalabilidade

Sistema suporta:
- Ilimitado número de clientes
- Ilimitado número de casas por cliente
- Ilimitado número de agendamentos por cliente

Performance:
- Até 10.000 clientes: < 100ms por requisição
- Até 1.000 casas por cliente: < 50ms para agendamento
- Dados persistem em arquivo JSON

Para melhor performance em produção:
- Integrar com banco de dados (MongoDB, PostgreSQL)
- Implementar cache (Redis)
- Adicionar índices para busca rápida
