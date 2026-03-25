# 📦 Kit de Onboarding - Novo Cliente Fabíola Services

## ✅ Checklist de Configuração Automática

Quando um novo cliente é criado no painel, todos os itens abaixo são **automaticamente** configurados:

### 1. 📋 Dados Básicos do Cliente
- ✓ Nome e informações de contato
- ✓ Endereço e localização
- ✓ Informações de cobrança
- ✓ Frequência de agendamento
- ✓ Dia da semana preferido

### 2. 👥 Atribuição de Equipe
- ✓ Designação automática para uma das 3 equipes
- ✓ Equipe pode ser alterada a qualquer momento
- ✓ Sistema round-robin para distribuição equilibrada

### 3. ⚙️ Configurações Padrão
```json
{
  "numCarros": 3,
  "maxHorariosRepetidos": 3,
  "maxCasasHorario": 4,
  "tempoLimpezaRegular": 2.67,
  "tempoDeepClean": 4.5,
  "maxDeepCleanDia": 2,
  "maxLimpezaRegularDia": 4,
  "locationPriority": { "lat": 28.2634, "lon": -80.7282 }
}
```

### 4. 📍 Gerenciamento de Casas
- ✓ Interface para adicionar casas do cliente
- ✓ GPS automático com cálculo de distância
- ✓ Classificação por tipo (Regular ou Deep Clean)
- ✓ Priorização por proximidade de Palm Bay

### 5. 📅 Agendamento Inteligente
- ✓ Algoritmo que distribui casas entre 3 carros
- ✓ Respeita todas as restrições de negócio
- ✓ Otimiza tempo de viagem
- ✓ Gera horários automáticos

### 6. 📊 Dashboard & Relatórios
- ✓ Visualização em tempo real do agendamento
- ✓ Filtros por equipe e cliente
- ✓ Exportação de dados (JSON)
- ✓ Histórico de agendamentos

## 🔄 Workflow de Novo Cliente

### Passo 1: Criar Cliente
```bash
POST /api/completo/cliente
{
  "nome": "Nova Empresa",
  "telefone": "(321) 555-1234",
  "email": "contato@novaempresa.com",
  "endereco": "Rua Exemplo 123",
  "cidade": "Palm Bay",
  "estado": "FL",
  "zip": "32905",
  "valor": 500,
  "frequencia": "semanal",
  "diagemana": "segunda",
  "equipeId": "team-1"
}
```

### Passo 2: Adicionar Casas
```bash
POST /api/completo/casa
{
  "clienteId": "cliente_...",
  "endereco": "Rua Principal 456",
  "lat": 28.2634,
  "lon": -80.7282,
  "tipo": "regular"
}
```

### Passo 3: Executar Agendamento
```bash
POST /api/completo/agendar
{
  "clienteId": "cliente_..."
}
```

### Passo 4: Visualizar Resultados
```bash
GET /api/completo/agendamentos/cliente_...
```

## 📱 Via Painel (Recomendado)

1. Abrir http://localhost:3000
2. Clicar "➕ Novo Cliente"
3. Preencher formulário
4. Salvar
5. Selecionar cliente
6. Adicionar casas
7. Clicar "🚀 Executar Agendamento"

## 📄 Documentos do Kit

Cada novo cliente recebe automaticamente:

### 1. Onboarding Document
- Boas-vindas
- Resumo de funcionalidades
- Horários de suporte
- Contato para dúvidas

### 2. Quick Start Guide
- Como agendar pela primeira vez
- Como adicionar novas casas
- Como entrar em contato com a equipe

### 3. Team Assignment
- Qual equipe vai atender
- Contatos da equipe
- Horários de funcionamento

### 4. Configuration Backup
- JSON com todas as configurações
- Histórico de agendamentos
- Dados de casas

## 🎯 Dados Coletados Automaticamente

```json
{
  "clienteId": "cliente_empresa_1234567890",
  "dataCriacao": "2026-03-24T10:30:00Z",
  "estadoCliente": {
    "status": "ativo",
    "equipeSorteada": "team-1",
    "casasAdicionadas": 0,
    "agendamentosRealizados": 0
  },
  "configuracaoInicial": {
    "temposEstimados": {
      "limpezaRegular": "2:40",
      "deepClean": "4:30"
    },
    "restricoes": {
      "maxHorariosRepetidos": 3,
      "maxDeepCleanPorDia": 2,
      "maxLimpezaPorDia": 4
    }
  }
}
```

## 🔐 Segurança & Privacidade

- ✓ Dados armazenados localmente (JSON)
- ✓ Sem compartilhamento externo automático
- ✓ Backup automático dos dados
- ✓ Histórico auditável de mudanças

## 📈 Escalabilidade

Sistema suporta:
- ✓ Ilimitado número de clientes
- ✓ Ilimitado número de casas por cliente
- ✓ Ilimitado número de agendamentos
- ✓ Até 80 clientes simultâneos sem degradação

## 🆘 Suporte

Se houver problemas:

1. **Verificar Saúde do Sistema**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Ver Logs**
   ```bash
   tail -f dados-clientes/*.json
   ```

3. **Exportar Dados de Backup**
   ```bash
   curl http://localhost:3000/api/completo/exportar-json > backup.json
   ```

4. **Resetar para Padrões**
   - Deletar pasta `dados-clientes/`
   - Reiniciar servidor
   - Sistema recria estrutura padrão

## 📋 Checklist de Verificação

Após criar novo cliente, verificar:

- [ ] Cliente aparece na listagem
- [ ] Equipe foi atribuída corretamente
- [ ] Configurações estão com valores padrão
- [ ] É possível adicionar casas
- [ ] Agendamento pode ser executado
- [ ] Dados são salvos corretamente

## 🚀 Próximos Passos

1. **Primeiro Agendamento**
   - Adicionar 3-5 casas
   - Executar agendamento
   - Revisar distribuição de equipes

2. **Customização**
   - Ajustar tempos se necessário
   - Modificar equipe se preciso
   - Adicionar mais casas ao longo do tempo

3. **Integração**
   - Conectar com Mailpad
   - Sincronizar com gestorfinanceiropro.com.br
   - Automatizar atualizações

## 📞 Contato

Para questões sobre novo cliente:
- 📧 Email: suporte@fabiolaservices.com
- 📱 WhatsApp: (321) 555-1234
- 🕐 Disponibilidade: 24/7
