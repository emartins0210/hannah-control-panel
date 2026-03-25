/**
 * SERVIDOR DE AUTOMAÇÃO INTELIGENTE
 * Sistema de agendamento automático com distribuição inteligente de equipes
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARE
// ============================================================

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));

// Body parser
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Static files
app.use(express.static('public'));
app.use(express.static('.'));

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================================
// INICIALIZAÇÃO DE DADOS
// ============================================================

// Criar diretórios se não existirem
const dataDir = process.env.DATA_DIR || './dados-agendamentos';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Funções de persistência
const agendamentosFile = path.join(dataDir, 'agendamentos.json');
const equipesFile = path.join(dataDir, 'equipes.json');

function lerAgendamentos() {
  try {
    if (fs.existsSync(agendamentosFile)) {
      const data = fs.readFileSync(agendamentosFile, 'utf8');
      return JSON.parse(data || '[]');
    }
    return [];
  } catch (e) {
    console.error('Erro ao ler agendamentos:', e.message);
    return [];
  }
}

function salvarAgendamentos(dados) {
  try {
    fs.writeFileSync(agendamentosFile, JSON.stringify(dados, null, 2), 'utf8');
  } catch (e) {
    console.error('Erro ao salvar agendamentos:', e.message);
  }
}

function lerEquipes() {
  try {
    if (fs.existsSync(equipesFile)) {
      const data = fs.readFileSync(equipesFile, 'utf8');
      return JSON.parse(data || '[]');
    }
    // Valores padrão
    return [
      {
        id: 1,
        nome: 'Equipe Centro',
        latitude: parseFloat(process.env.EQUIPE_1_LAT) || -23.5505,
        longitude: parseFloat(process.env.EQUIPE_1_LNG) || -46.6333,
        agendamentosHoje: 0,
        cargaSemanal: 0
      },
      {
        id: 2,
        nome: 'Equipe Sul',
        latitude: parseFloat(process.env.EQUIPE_2_LAT) || -23.6150,
        longitude: parseFloat(process.env.EQUIPE_2_LNG) || -46.5527,
        agendamentosHoje: 0,
        cargaSemanal: 0
      },
      {
        id: 3,
        nome: 'Equipe Norte',
        latitude: parseFloat(process.env.EQUIPE_3_LAT) || -23.4500,
        longitude: parseFloat(process.env.EQUIPE_3_LNG) || -46.5500,
        agendamentosHoje: 0,
        cargaSemanal: 0
      }
    ];
  } catch (e) {
    console.error('Erro ao ler equipes:', e.message);
    return [];
  }
}

// ============================================================
// FUNÇÕES DE CÁLCULO DE DISTÂNCIA
// ============================================================

// Haversine formula para calcular distância entre dois pontos
function calcularDistancia(lat1, lng1, lat2, lng2) {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calcular score de uma equipe (menor é melhor)
function calcularScore(distancia, cargaAtual) {
  const pesoDistancia = 0.6;
  const pesoCarga = 0.4;
  return (distancia * pesoDistancia) + (cargaAtual * pesoCarga);
}

// ============================================================
// ENDPOINTS DA API
// ============================================================

// 1. GET - Distribuição de equipes
app.get('/api/automacao/distribuicao-equipes', (req, res) => {
  try {
    const equipes = lerEquipes();
    res.json({
      success: true,
      equipes: equipes,
      timestamp: new Date().toISOString()
    });
  } catch (erro) {
    res.status(500).json({ success: false, erro: erro.message });
  }
});

// 2. POST - Processar novo agendamento
app.post('/api/automacao/processar-house-agendada', (req, res) => {
  try {
    const {
      nomeCliente,
      emailCliente,
      telefoneCliente,
      latitude,
      longitude,
      tipoServico,
      dataAgendamento,
      horarioAgendamento,
      descricao
    } = req.body;

    // Validação básica
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        erro: 'Latitude e longitude são obrigatórios'
      });
    }

    const equipes = lerEquipes();
    let melhorEquipe = null;
    let menorScore = Infinity;

    // Selecionar melhor equipe
    equipes.forEach(equipe => {
      const distancia = calcularDistancia(latitude, longitude, equipe.latitude, equipe.longitude);
      const score = calcularScore(distancia, equipe.agendamentosHoje);
      
      if (score < menorScore) {
        menorScore = score;
        melhorEquipe = {
          ...equipe,
          distancia: parseFloat(distancia.toFixed(2)),
          score: parseFloat(score.toFixed(2))
        };
      }
    });

    // Criar agendamento
    const agendamento = {
      id: `AGD-${Date.now()}`,
      nomeCliente,
      emailCliente,
      telefoneCliente,
      latitude,
      longitude,
      tipoServico,
      dataAgendamento,
      horarioAgendamento,
      descricao,
      equipeSelecionada: melhorEquipe.nome,
      equipeId: melhorEquipe.id,
      distancia: melhorEquipe.distancia,
      status: 'CONFIRMADO',
      criadoEm: new Date().toISOString()
    };

    // Salvar agendamento
    const agendamentos = lerAgendamentos();
    agendamentos.push(agendamento);
    salvarAgendamentos(agendamentos);

    // Atualizar carga da equipe
    const equipesAtualizado = lerEquipes();
    const equipeIndex = equipesAtualizado.findIndex(e => e.id === melhorEquipe.id);
    if (equipeIndex !== -1) {
      equipesAtualizado[equipeIndex].agendamentosHoje += 1;
      equipesAtualizado[equipeIndex].cargaSemanal += 1;
      fs.writeFileSync(equipesFile, JSON.stringify(equipesAtualizado, null, 2), 'utf8');
    }

    // Simular notificações
    console.log(`
📧 EMAIL enviado para ${emailCliente}
💬 WHATSAPP enviado para ${telefoneCliente}
📱 WHATSAPP enviado para Fabíola
🔄 SINCRONIZAÇÃO com Gestor Financeiro
    `);

    res.json({
      success: true,
      agendamento,
      equipeSelecionada: melhorEquipe,
      notificacoes: {
        emailCliente: { enviado: true, para: emailCliente },
        whatsappCliente: { enviado: true, para: telefoneCliente },
        whatsappFabiola: { enviado: true }
      }
    });
  } catch (erro) {
    console.error('Erro:', erro);
    res.status(500).json({ success: false, erro: erro.message });
  }
});

// 3. GET - Listar agendamentos
app.get('/api/automacao/agendamentos', (req, res) => {
  try {
    const agendamentos = lerAgendamentos();
    res.json({
      success: true,
      total: agendamentos.length,
      agendamentos
    });
  } catch (erro) {
    res.status(500).json({ success: false, erro: erro.message });
  }
});

// 4. GET - Seleção de equipe (teste)
app.get('/api/automacao/selecionar-equipe', (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        erro: 'Latitude e longitude são obrigatórios'
      });
    }

    const equipes = lerEquipes();
    let melhorEquipe = null;
    let menorScore = Infinity;
    const alternativas = [];

    equipes.forEach(equipe => {
      const distancia = calcularDistancia(parseFloat(latitude), parseFloat(longitude), equipe.latitude, equipe.longitude);
      const score = calcularScore(distancia, equipe.agendamentosHoje);
      
      if (score < menorScore) {
        menorScore = score;
        melhorEquipe = {
          ...equipe,
          distancia: parseFloat(distancia.toFixed(2)),
          score: parseFloat(score.toFixed(2))
        };
      } else {
        alternativas.push({
          id: equipe.id,
          nome: equipe.nome,
          distancia: parseFloat(distancia.toFixed(2)),
          score: parseFloat(score.toFixed(2))
        });
      }
    });

    res.json({
      success: true,
      equipeSelecionada: melhorEquipe,
      alternativas
    });
  } catch (erro) {
    res.status(500).json({ success: false, erro: erro.message });
  }
});

// 5. GET - Status do sistema
app.get('/api/automacao/status', (req, res) => {
  try {
    const agendamentos = lerAgendamentos();
    const equipes = lerEquipes();
    
    res.json({
      success: true,
      status: 'operacional',
      agendamentosTotal: agendamentos.length,
      equipes: equipes.length,
      integrações: {
        googleMaps: 'conectado',
        whatsapp: 'simulado',
        email: 'simulado',
        gestorFinanceiro: 'simulado'
      },
      timestamp: new Date().toISOString()
    });
  } catch (erro) {
    res.status(500).json({ success: false, erro: erro.message });
  }
});

// 6. GET - Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 7. GET - Info do sistema
app.get('/api/info', (req, res) => {
  const agendamentos = lerAgendamentos();
  res.json({
    app: 'Agendador Automático Inteligente',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    agendamentos: agendamentos.length,
    equipes: 3,
    port: PORT,
    uptime: process.uptime()
  });
});

// 8. GET - Dashboard HTML
app.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🏠 Agendador Automático - Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    header {
      background: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    h1 { color: #333; margin-bottom: 10px; }
    .status-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }
    .status-card {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    .status-card.green { border-left-color: #10b981; }
    .status-card.yellow { border-left-color: #f59e0b; }
    .status-value { font-size: 24px; font-weight: bold; color: #333; }
    .status-label { color: #666; font-size: 12px; margin-top: 5px; }
    
    .content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    .card {
      background: white;
      padding: 25px;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .card h2 { color: #333; margin-bottom: 15px; font-size: 18px; }
    
    .equipe {
      background: #f9fafb;
      padding: 12px;
      margin-bottom: 10px;
      border-radius: 6px;
      border-left: 3px solid #667eea;
    }
    .equipe-nome { font-weight: bold; color: #333; }
    .equipe-info { color: #666; font-size: 12px; margin-top: 5px; }
    
    .form-group {
      margin-bottom: 12px;
    }
    label {
      display: block;
      color: #333;
      font-weight: bold;
      margin-bottom: 5px;
      font-size: 12px;
    }
    input, select, textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
    }
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    
    button {
      background: #667eea;
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      width: 100%;
      transition: background 0.3s;
    }
    button:hover { background: #5568d3; }
    
    .message {
      padding: 12px;
      border-radius: 6px;
      margin-top: 10px;
      font-size: 12px;
    }
    .message.success {
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #6ee7b7;
    }
    .message.error {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }
    .message.loading {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    
    .agendamentos-list {
      max-height: 400px;
      overflow-y: auto;
    }
    .agendamento-item {
      background: #f9fafb;
      padding: 12px;
      margin-bottom: 10px;
      border-radius: 6px;
      border-left: 3px solid #10b981;
    }
    .agendamento-nome { font-weight: bold; color: #333; }
    .agendamento-info { color: #666; font-size: 11px; margin-top: 5px; }
    
    @media (max-width: 768px) {
      .content { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🏠 Agendador Automático Inteligente</h1>
      <p>Sistema de distribuição inteligente de equipes</p>
      <div class="status-bar">
        <div class="status-card green">
          <div class="status-value" id="totalAgendamentos">0</div>
          <div class="status-label">Agendamentos Total</div>
        </div>
        <div class="status-card">
          <div class="status-value">3</div>
          <div class="status-label">Equipes Ativas</div>
        </div>
        <div class="status-card green">
          <div class="status-value">Operacional</div>
          <div class="status-label">Status do Sistema</div>
        </div>
      </div>
    </header>

    <div class="content">
      <!-- Painel de Equipes -->
      <div class="card">
        <h2>👥 Distribuição de Equipes</h2>
        <div id="equipasDiv"></div>
      </div>

      <!-- Formulário de Agendamento -->
      <div class="card">
        <h2>📅 Novo Agendamento</h2>
        <form id="formAgendamento">
          <div class="form-group">
            <label>Nome do Cliente</label>
            <input type="text" id="nome" required placeholder="João Silva">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="email" required placeholder="joao@example.com">
          </div>
          <div class="form-group">
            <label>Telefone/WhatsApp</label>
            <input type="tel" id="telefone" required placeholder="+55119999999">
          </div>
          <div class="form-group">
            <label>Latitude</label>
            <input type="number" id="latitude" step="0.0001" required placeholder="-23.5505">
          </div>
          <div class="form-group">
            <label>Longitude</label>
            <input type="number" id="longitude" step="0.0001" required placeholder="-46.6333">
          </div>
          <div class="form-group">
            <label>Tipo de Serviço</label>
            <select id="servico" required>
              <option value="">Selecione...</option>
              <option value="Limpeza Completa">Limpeza Completa</option>
              <option value="Limpeza Rápida">Limpeza Rápida</option>
              <option value="Limpeza Profunda">Limpeza Profunda</option>
            </select>
          </div>
          <div class="form-group">
            <label>Data</label>
            <input type="date" id="data" required>
          </div>
          <button type="submit">✅ Agendar Agora</button>
          <div id="mensagem"></div>
        </form>
      </div>
    </div>

    <!-- Agendamentos Recentes -->
    <div class="card">
      <h2>📋 Agendamentos Recentes</h2>
      <div class="agendamentos-list" id="agendamentosDiv"></div>
    </div>
  </div>

  <script>
    // Carregar dados ao iniciar
    carregarDados();
    setInterval(carregarDados, 5000); // Atualizar a cada 5 segundos

    function carregarDados() {
      // Equipes
      fetch('/api/automacao/distribuicao-equipes')
        .then(r => r.json())
        .then(data => {
          let html = '';
          data.equipes.forEach(e => {
            html += \`<div class="equipe">
              <div class="equipe-nome">👥 \${e.nome}</div>
              <div class="equipe-info">
                Agendamentos hoje: \${e.agendamentosHoje} | Carga semanal: \${e.cargaSemanal}
              </div>
            </div>\`;
          });
          document.getElementById('equipasDiv').innerHTML = html;
        });

      // Agendamentos
      fetch('/api/automacao/agendamentos')
        .then(r => r.json())
        .then(data => {
          document.getElementById('totalAgendamentos').textContent = data.total;
          let html = '';
          if (data.agendamentos.length === 0) {
            html = '<p style="color: #999; font-size: 12px;">Nenhum agendamento ainda</p>';
          } else {
            data.agendamentos.slice(-5).reverse().forEach(a => {
              html += \`<div class="agendamento-item">
                <div class="agendamento-nome">\${a.nomeCliente}</div>
                <div class="agendamento-info">
                  \${a.equipeSelecionada} | \${a.dataAgendamento} | \${a.tipoServico}
                </div>
              </div>\`;
            });
          }
          document.getElementById('agendamentosDiv').innerHTML = html;
        });
    }

    // Enviar formulário
    document.getElementById('formAgendamento').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('mensagem');
      msg.innerHTML = '<div class="message loading">⏳ Processando...</div>';

      const dados = {
        nomeCliente: document.getElementById('nome').value,
        emailCliente: document.getElementById('email').value,
        telefoneCliente: document.getElementById('telefone').value,
        latitude: parseFloat(document.getElementById('latitude').value),
        longitude: parseFloat(document.getElementById('longitude').value),
        tipoServico: document.getElementById('servico').value,
        dataAgendamento: document.getElementById('data').value
      };

      try {
        const res = await fetch('/api/automacao/processar-house-agendada', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados)
        });
        const result = await res.json();

        if (result.success) {
          msg.innerHTML = \`<div class="message success">✅ Agendado com \${result.equipeSelecionada.nome}!</div>\`;
          document.getElementById('formAgendamento').reset();
          carregarDados();
        } else {
          msg.innerHTML = \`<div class="message error">❌ Erro: \${result.erro}</div>\`;
        }
      } catch (erro) {
        msg.innerHTML = \`<div class="message error">❌ Erro: \${erro.message}</div>\`;
      }
    });
  </script>
</body>
</html>
  `;
  res.send(html);
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║         🏠 AGENDADOR AUTOMÁTICO INTELIGENTE                   ║
║         Sistema de Distribuição Inteligente de Equipes        ║
╚════════════════════════════════════════════════════════════════╝

✅ Servidor rodando na porta ${PORT}

📍 Acessos:
   Dashboard:           http://localhost:${PORT}
   API Automação:       http://localhost:${PORT}/api/automacao
   Status:              http://localhost:${PORT}/api/automacao/status
   Health Check:        http://localhost:${PORT}/health

🌍 Ambiente:            ${process.env.NODE_ENV}
📁 Dados:               ${dataDir}
⚙️  Modo Teste:         Simulações de email/WhatsApp/Gestor

═════════════════════════════════════════════════════════════════
  `);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (erro) => {
  console.error('❌ Erro não capturado:', erro);
});

module.exports = app;
