# 🌐 Integração com lopesservices.top - Guia Rápido

## O que você precisa fazer no seu website

Quando um cliente clica "Agendar" no seu site, o sistema deve:
1. Coletar dados do formulário
2. Enviar para o servidor de automação
3. Receber confirmação
4. Mostrar mensagem de sucesso

---

## ✅ Pré-requisitos

- [ ] Servidor rodando em `https://seu-dominio.com/api/automacao/processar-house-agendada`
- [ ] HTTPS ativado (obrigatório)
- [ ] Permite requisições de `https://seu-website.com`
- [ ] Geolocalização do cliente (endereço convertido em lat/lng)

---

## 📋 Opção 1: Formulário HTML Simples

Adicione este HTML na página de agendamento do seu site:

```html
<form id="formAgendamento" style="max-width: 500px; margin: 20px 0;">
  <h2>📅 Agendar Limpeza</h2>
  
  <!-- Nome do cliente -->
  <div class="form-group">
    <label for="nome">Seu Nome:</label>
    <input 
      type="text" 
      id="nome" 
      name="nome" 
      required 
      placeholder="João Silva"
    />
  </div>

  <!-- Email -->
  <div class="form-group">
    <label for="email">Email:</label>
    <input 
      type="email" 
      id="email" 
      name="email" 
      required 
      placeholder="joao@example.com"
    />
  </div>

  <!-- Telefone -->
  <div class="form-group">
    <label for="telefone">WhatsApp:</label>
    <input 
      type="tel" 
      id="telefone" 
      name="telefone" 
      required 
      placeholder="+55 11 99999-9999"
    />
  </div>

  <!-- Endereço -->
  <div class="form-group">
    <label for="endereco">Endereço:</label>
    <input 
      type="text" 
      id="endereco" 
      name="endereco" 
      required 
      placeholder="Rua das Flores, 123, São Paulo"
    />
  </div>

  <!-- Tipo de Serviço -->
  <div class="form-group">
    <label for="servico">Tipo de Serviço:</label>
    <select id="servico" name="servico" required>
      <option value="">-- Selecione --</option>
      <option value="Limpeza Completa">Limpeza Completa</option>
      <option value="Limpeza Rápida">Limpeza Rápida (2h)</option>
      <option value="Limpeza Profunda">Limpeza Profunda</option>
      <option value="Limpeza Pós-Mudança">Limpeza Pós-Mudança</option>
    </select>
  </div>

  <!-- Data -->
  <div class="form-group">
    <label for="data">Data Desejada:</label>
    <input 
      type="date" 
      id="data" 
      name="data" 
      required 
    />
  </div>

  <!-- Horário -->
  <div class="form-group">
    <label for="hora">Horário Preferido:</label>
    <select id="hora" name="hora" required>
      <option value="">-- Selecione --</option>
      <option value="08:00">08:00</option>
      <option value="09:00">09:00</option>
      <option value="10:00">10:00</option>
      <option value="14:00">14:00</option>
      <option value="15:00">15:00</option>
      <option value="16:00">16:00</option>
    </select>
  </div>

  <!-- Descrição -->
  <div class="form-group">
    <label for="descricao">Descreva o que precisa limpar:</label>
    <textarea 
      id="descricao" 
      name="descricao" 
      rows="4"
      placeholder="Ex: Apartamento 80m², 2 quartos, sala..."
    ></textarea>
  </div>

  <!-- Status -->
  <div id="statusMensagem" style="margin: 10px 0; display: none;"></div>

  <!-- Botão de envio -->
  <button 
    type="submit" 
    id="btnAgendar" 
    style="
      background-color: #007bff;
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      width: 100%;
    "
  >
    ✅ Agendar Agora
  </button>
</form>

<style>
  .form-group {
    margin-bottom: 15px;
  }
  .form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
    color: #333;
  }
  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    font-family: Arial, sans-serif;
  }
  #statusMensagem {
    padding: 10px;
    border-radius: 4px;
    text-align: center;
    font-weight: bold;
  }
  .sucesso {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  .erro {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
  .carregando {
    background-color: #e2e3e5;
    color: #383d41;
  }
</style>
```

---

## ⚙️ JavaScript para Enviar ao Servidor

Adicione este código JavaScript (pode estar no mesmo arquivo ou em um `.js` separado):

```javascript
document.getElementById('formAgendamento').addEventListener('submit', async (e) => {
  e.preventDefault();

  // Obter valores do formulário
  const nome = document.getElementById('nome').value;
  const email = document.getElementById('email').value;
  const telefone = document.getElementById('telefone').value;
  const endereco = document.getElementById('endereco').value;
  const servico = document.getElementById('servico').value;
  const data = document.getElementById('data').value;
  const hora = document.getElementById('hora').value;
  const descricao = document.getElementById('descricao').value;

  // Mostrar "carregando"
  const status = document.getElementById('statusMensagem');
  status.style.display = 'block';
  status.className = 'carregando';
  status.textContent = '⏳ Processando seu agendamento...';

  try {
    // PASSO 1: Converter endereço em latitude/longitude
    const coordenadas = await converterEnderecoEmCoordenadas(endereco);
    
    if (!coordenadas) {
      throw new Error('Não conseguimos localizar o endereço. Tente novamente.');
    }

    // PASSO 2: Enviar para o servidor de automação
    const resposta = await fetch('https://seu-dominio.com/api/automacao/processar-house-agendada', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nomeCliente: nome,
        emailCliente: email,
        telefoneCliente: telefone,
        latitude: coordenadas.lat,
        longitude: coordenadas.lng,
        tipoServico: servico,
        dataAgendamento: data,
        horarioAgendamento: hora,
        descricao: descricao
      })
    });

    const resultado = await resposta.json();

    if (resultado.success) {
      // SUCESSO!
      status.className = 'sucesso';
      status.textContent = `✅ Agendamento confirmado! Equipe: ${resultado.agendamento.equipeSelecionada}. Você receberá uma mensagem no WhatsApp.`;
      
      // Limpar formulário
      document.getElementById('formAgendamento').reset();
      
      // Opcionalmente, redirecionar após 3 segundos
      setTimeout(() => {
        // window.location.href = '/obrigado';
      }, 3000);
    } else {
      throw new Error(resultado.erro || 'Erro ao processar agendamento');
    }
  } catch (erro) {
    status.className = 'erro';
    status.textContent = `❌ Erro: ${erro.message}. Tente novamente ou ligue para (11) 98765-4321.`;
    console.error('Erro no agendamento:', erro);
  }
});

// FUNÇÃO: Converter endereço em latitude/longitude
async function converterEnderecoEmCoordenadas(endereco) {
  try {
    // Usar Google Geocoding API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(endereco)}&key=SUA_CHAVE_GOOGLE_AQUI`
    );
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng
      };
    }
    
    return null;
  } catch (erro) {
    console.error('Erro ao geocodificar:', erro);
    return null;
  }
}
```

---

## 🔑 Configurar Google Geocoding API

Para converter "endereço" em coordenadas, você precisa da Google Geocoding API:

1. Ir para https://console.cloud.google.com
2. Criar nova API Key
3. Ativar "Geocoding API"
4. Substitua `SUA_CHAVE_GOOGLE_AQUI` no código acima

**Ou use este endpoint alternativo (sem API key):**

```javascript
async function converterEnderecoEmCoordenadas(endereco) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`
    );
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    
    return null;
  } catch (erro) {
    console.error('Erro ao geocodificar:', erro);
    return null;
  }
}
```

---

## 📱 Opção 2: Integração com WhatsApp Direto

Se preferir enviar o link de agendamento via WhatsApp:

```html
<a href="https://wa.me/5511988887777?text=Gostaria%20de%20agendar%20uma%20limpeza" 
   target="_blank" 
   style="
     background-color: #25D366;
     color: white;
     padding: 12px 24px;
     text-decoration: none;
     border-radius: 4px;
     display: inline-block;
   "
>
  💬 Agendar via WhatsApp
</a>
```

---

## 🎯 Integração com Chatbot (Opcional)

Se você tem um chatbot, pode enviar os dados assim:

```javascript
// Após confirmação no chatbot, enviar para automação
const dados = {
  nomeCliente: chatbot.usuario.nome,
  emailCliente: chatbot.usuario.email,
  telefoneCliente: chatbot.usuario.telefone,
  latitude: chatbot.usuario.latitude,
  longitude: chatbot.usuario.longitude,
  tipoServico: chatbot.selecionado.servico,
  dataAgendamento: chatbot.selecionado.data,
  horarioAgendamento: chatbot.selecionado.hora,
  descricao: chatbot.selecionado.descricao
};

await fetch('https://seu-dominio.com/api/automacao/processar-house-agendada', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(dados)
});
```

---

## 🔒 Segurança CORS

Se seu website está em domínio diferente:

**No seu `.env`:**
```
CORS_ORIGIN=https://seu-website.com
```

**No seu `server-com-automacao.js` (já configurado):**
```javascript
const cors = require('cors');
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST'],
  credentials: true
}));
```

---

## ✅ Teste Passo a Passo

1. **Teste local primeiro:**
   - Inicie servidor: `npm start`
   - Abra `http://localhost:3000`
   - Teste o formulário

2. **Teste com seu site local:**
   - Deixe servidor rodando em `http://localhost:3000`
   - No seu website, troque URL para `http://localhost:3000/api/automacao/processar-house-agendada`
   - Teste formulário

3. **Deploy em produção:**
   - Faça deploy do servidor (Render.com ou VPS)
   - Altere URL no website para `https://seu-dominio.com/api/automacao/processar-house-agendada`
   - Ative HTTPS
   - Configure CORS
   - Teste tudo novamente

---

## 📊 Fluxo Completo

```
Cliente acessa seu site
         ↓
Preenche formulário de agendamento
         ↓
Clica "Agendar Agora"
         ↓
JavaScript coleta dados + endereço → lat/lng
         ↓
Envia POST para seu servidor de automação
         ↓
Servidor processa:
  - Calcula distâncias até 3 equipes
  - Seleciona equipe ótima
  - Envia email ao cliente
  - Envia WhatsApp ao cliente
  - Envia WhatsApp a Fabíola
  - Sincroniza com Gestor Financeiro
         ↓
Retorna resposta ao website
         ↓
Website mostra: "✅ Agendamento confirmado!"
         ↓
Cliente recebe emails + WhatsApp
```

---

## 🆘 Troubleshooting

### Problema: "Erro de CORS"
**Solução:** Verificar se `CORS_ORIGIN` está configurado corretamente

### Problema: "Endereço não encontrado"
**Solução:** Verificar se Google Geocoding API está ativa e chave está correta

### Problema: "Servidor não responde"
**Solução:** Verificar se servidor está rodando e URL está correta (com HTTPS em produção)

### Problema: "Email não chega"
**Solução:** Verificar credenciais SMTP e testes no `/api/info`

---

## 📋 Checklist de Integração

- [ ] Formulário HTML criado no seu website
- [ ] JavaScript de envio configurado
- [ ] Google Geocoding API ativa (ou OpenStreetMap como fallback)
- [ ] CORS configurado
- [ ] HTTPS ativado (obrigatório em produção)
- [ ] URL do servidor atualizada
- [ ] Testado localmente
- [ ] Testado em produção
- [ ] Botão "Agendar" no seu website funciona
- [ ] Email chega quando cliente agenda
- [ ] WhatsApp recebe notificação
- [ ] Agendamento aparece no dashboard

---

**Próxima etapa:** Fazer testes com clientes reais e monitorar distribuição de equipes! 🚀
