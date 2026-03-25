# Guia Prático: Como Testar o Novo Número Hannah AI

## ✅ Checklist Pré-Teste

- [ ] Numero é +1 321 384-9782
- [ ] Telefone está funcionando
- [ ] Conexão de Internet ativa
- [ ] Som do telefone ativado
- [ ] Está em um local tranquilo

---

## Teste #1: Ligar Direto para Hannah AI

### Passo-a-Passo

**Passo 1: Abra o Telefone**
- Abra o app de telefone no seu celular ou use um telefone fixo
- Certifique-se que tem sinal/conexão

**Passo 2: Disque o Número**
- Disque: **+1 321 384-9782**
- Ou: **(321) 384-9782** (formato US)

**Passo 3: Aguarde a Conexão**
- O telefone tocará normalmente
- Possível esperar 2-5 segundos
- Você ouvirá um tom de chamada conectando

**Passo 4: Hannah AI Responde**
- Você ouvirá uma mensagem de saudação automática
- Fone dirá algo como: "Olá, você chamou Hannah AI. Como posso ajudar?"
- **Fale claramente seu nome e descrição do problema**

**Passo 5: Hannah Conversa Com Você**
- O assistente fará perguntas sobre seu problema
- Será perguntado:
  - Seu nome (se não fornecido)
  - Descrição do problema
  - Como você gostaria de ser contatado (email/WhatsApp)
  - Disponibilidade para agendamento
- Responda naturalmente

**Passo 6: Conclusão**
- Quando terminar, Hannah dirá "Obrigado por ligar. Você será contatado em breve"
- Pressione #5 para finalizar a chamada (ou deslige normalmente)
- Chamada é encerrada e dados são salvos

### Resultado Esperado ✅

```
[ESPERADO]
Chamada: +1 321 384-9782
Toque inicial: 2-5 segundos
Mensagem Hannah: "Olá, você chamou Hannah..."
Seu nome: "Eugênio"
Problema: "Preciso de limpeza de escritório"
Hannah pergunta detalhes
Confirmação final: "Você será contatado em breve"
Duração total: 2-3 minutos
```

### O Que Fazer Se Algo Der Errado

| Problema | Solução |
|----------|---------|
| Chamada não conecta | Aguarde 10 segundos. Tente novamente. Se persistir, verificar se número está ativo |
| Som cortado | Verifique conexão de Internet. Tente ligar novamente |
| Hannah não responde | Verifique se servidor Railway está rodando. Pode tentar em 30 segundos |
| Áudio quebrado/lento | Feche outros apps. Verifique WiFi/3G. Tente ligar novamente |

---

## Teste #2: Testar Via Formulário Web

### Passo-a-Passo

**Passo 1: Acesse o Site**
- Abra seu navegador (Chrome, Safari, Firefox)
- Vá para: **seu-dominio.com**
- Procure o formulário de contato

**Passo 2: Preencha o Formulário**

```
Nome: [Seu Nome]
Email: seu.email@gmail.com
Telefone: +1 321 XXX XXXX (seu número real)
Assunto: Solicitação de Limpeza
Mensagem: Preciso de limpeza de escritório na [sua localização]
```

**Importante:** Use um **número de telefone real** que você possa atender!

**Passo 3: Submit do Formulário**
- Clique no botão "Enviar" ou "Agendar Ligação"
- Você receberá confirmação na tela
- Verifique seu email para confirmação

**Passo 4: Aguarde a Ligação**
- Hannah AI ligará para o número que você forneceu
- Aguarde entre 1-5 minutos
- Seu telefone tocará com o número +1 321 384-9782

**Passo 5: Atenda a Chamada**
- Atenda normalmente: "Alô?"
- Hannah se apresentará
- Converse como descrito no Teste #1

**Passo 6: Confirme os Dados**
- Hannah confirmará suas informações
- Você receberá email com resumo da conversa
- Também pode receber SMS de confirmação

### Resultado Esperado ✅

```
[Você preenche formulário]
        ↓
[Sistema recebe dados]
        ↓
[Hannah liga nos próximos 5 minutos]
        ↓
[Você atende: "Alô?"]
        ↓
[Hannah fala: "Olá, você preencheu nosso formulário..."]
        ↓
[Conversa natural sobre serviço]
        ↓
[Email com resumo chega em sua caixa]
```

---

## Teste #3: Teste de Qualidade da Chamada

### Checklist de Qualidade

Durante a chamada, observe:

- [ ] **Áudio Claro**
  - Voice de Hannah é clara?
  - Consegue ouvir bem sem ruído?
  - Sem cortes ou interrupções?

- [ ] **Compreensão**
  - Hannah entende o que você fala?
  - Precisa repetir coisas frequentemente?
  - Resposta faz sentido no contexto?

- [ ] **Velocidade**
  - Resposta é rápida (< 3 segundos)?
  - Há muita demora entre perguntas?
  - Conexão parece estável?

- [ ] **Dados Coletados**
  - Hannah pergunta nome?
  - Pede descrição do problema?
  - Solicita contato/email?
  - Oferece agendamento?

- [ ] **Finalização**
  - Hannah confirma dados?
  - Dá próximos passos?
  - Saudação final é profissional?

### Notas para Qualidade

```
Escala 1-5 (1=Péssimo, 5=Excelente)

Qualidade de Áudio: ____
Clareza da Voz: ____
Velocidade de Resposta: ____
Compreensão de Contexto: ____
Coleta de Dados: ____
Experiência Geral: ____

Observações:
_________________________________
_________________________________
_________________________________
```

---

## Teste #4: Teste de Múltiplas Chamadas

### Objetivo
Validar que múltiplas chamadas simultâneas funcionam corretamente.

### Procedimento

**Teste A: Sequencial (Recomendado)**
1. Ligue 1ª vez, converse 2-3 minutos, desconecte
2. Aguarde 30 segundos
3. Ligue 2ª vez, converse 2-3 minutos, desconecte
4. Aguarde 30 segundos
5. Ligue 3ª vez, converse 2-3 minutos, desconecte

**Teste B: Simultâneo (Avançado)**
- Use 2 telefones ao mesmo tempo
- Disque +1 321 384-9782 em ambos
- Ambos devem conectar em Hannah
- Não devem interferir uma na outra

### Verificação

```
Chamada 1: ✅ Conectou? SIM/NÃO
Chamada 2: ✅ Conectou? SIM/NÃO
Chamada 3: ✅ Conectou? SIM/NÃO

Problemas encontrados:
_________________________________
```

---

## Teste #5: Verificar Que Número Antigo NÃO Funciona Mais

### Objetivo
Confirmar que o número anterior foi descontinuado.

### Procedimento

**Teste:**
Disque: **+1 321 3927880** (número antigo)

**Resultado Esperado:**
- ❌ Número não deve responder
- ❌ Não deve conectar em Hannah AI
- ❌ Pode mostrar "número desconectado" ou não completar conexão
- ✅ Isso é CORRETO! Significa migração bem-sucedida

**Se Conectar ao Antigo:**
- ⚠️ Problema! Servidor pode não ter reiniciado
- Ir para Railway Dashboard
- Clicar "Restart" no projeto "overflowing-heart"
- Aguardar 1 minuto
- Testar novamente

---

## Rastreamento de Testes

### Tabela de Registro

| Data | Tipo Teste | Número Testado | Resultado | Notas |
|------|-----------|----------------|-----------|-------|
| 22/03/2026 | Ligação Direta | +1 321 384-9782 | ✅ OK | Áudio claro |
| | Formulário | Via formulário | ✅ OK | Email recebido |
| | Qualidade | Escuta | ✅ OK | Score 4/5 |
| | Múltiplas | 3 Chamadas | ✅ OK | Todas conectaram |
| | Antigo | +1 321 3927880 | ❌ Desconectado | Correto! |

---

## Instruções de Feedback

### Se Tudo Funcionou ✅

Ótimo! Você está pronto para:
1. Publicar novo número no site
2. Atualizar redes sociais
3. Começar a aceitar ligações de clientes
4. Monitorar qualidade diariamente

### Se Algo Não Funcionou ❌

1. **Anote o problema exatamente**
   - Qual teste falhou?
   - Qual era o comportamento esperado?
   - Qual era o comportamento real?

2. **Colete informações**
   - Horário do teste
   - Tipo de telefone usado
   - Tipo de conexão (WiFi/3G)
   - Qualquer mensagem de erro

3. **Reporte para:**
   - Slack: #technical-support
   - Email: tech-support@cleanai.com
   - Attach: Este guia preenchido

---

## Dúvidas Frequentes (FAQ)

**P: Posso testar à noite?**  
R: Sim! Hannah funciona 24/7. Recomendado testar durante horário comercial também.

**P: Quantas vezes posso testar?**  
R: Teste quantas vezes quiser! Não há limite de teste.

**P: Os dados de teste vão para os relatórios?**  
R: Sim. Você pode identificar como "TESTE" na descrição do problema.

**P: E se Hannah discar para mim automaticamente?**  
R: Pode recusar a chamada. Ou atenda e trate como um cliente normal (para testar experiência real).

**P: Quanto tempo leva para Hannah responder?**  
R: Geralmente 2-5 segundos. Se demorar 10+ segundos, pode ter problema.

**P: Posso testar com voz ruim/distorcida?**  
R: Sim! Tente falar baixo, alto, com sotaque, com barulho de fundo. Veja como Hannah se comporta.

---

## Próximas Ações

✅ **Imediatamente:**
1. Executar Teste #1 e #2 acima
2. Anotar resultado
3. Se OK, prosseguir para próximas ações

✅ **Próximo Passo:**
1. Atualizar site com novo número
2. Atualizar Google Business
3. Publicar nas redes sociais

✅ **Monitoramento:**
1. Verificar diariamente: quantidade de chamadas
2. Revisar semanalmente: qualidade das chamadas
3. Ajustar fluxo conforme necessário

---

**Guia Criado:** 22 de Março de 2026  
**Versão:** 1.0  
**Próxima Revisão:** 29 de Março de 2026

*Boa sorte com seus testes! Se tiver dúvidas, entre em contato.*
