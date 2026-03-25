const fs = require('fs');
const XLSX = require('xlsx');
const { GerenciadorClientes } = require('./agendador-completo');

async function importarClientesDoPainelExcel(caminhoExcel, distribuirEquipes = true) {
  console.log(`📂 Lendo arquivo: ${caminhoExcel}`);

  if (!fs.existsSync(caminhoExcel)) {
    console.error(`❌ Arquivo não encontrado: ${caminhoExcel}`);
    return;
  }

  try {
    const workbook = XLSX.readFile(caminhoExcel);
    const planilhaAtivos = workbook.Sheets['Active Clients (80)'];

    if (!planilhaAtivos) {
      console.error('❌ Planilha "Active Clients (80)" não encontrada');
      console.log('Planilhas disponíveis:', workbook.SheetNames);
      return;
    }

    const dados = XLSX.utils.sheet_to_json(planilhaAtivos);
    console.log(`✓ ${dados.length} clientes ATIVOS encontrados\n`);

    const gerenciador = new GerenciadorClientes('./dados-clientes');

    let importados = 0;
    let erros = 0;

    // Distribuir clientes entre equipes
    const equipes = ['team-1', 'team-2', 'team-3'];
    let indiceEquipe = 0;

    for (const linha of dados) {
      try {
        // Extrair dados com mapeamento de colunas correto
        const primeiroNome = linha['First Name'] || '';
        const sobrenome = linha['Last Name'] || '';
        const nome = `${primeiroNome} ${sobrenome}`.trim() || linha['Alias'] || 'Sem Nome';
        
        const telefone = linha['Phone 1'] || linha['Phone 2'] || '';
        const email = linha['Email'] || '';
        const endereco = linha['Street'] || '';
        const cidade = linha['City'] || 'Palm Bay';
        const estado = linha['State'] || 'FL';
        const zip = linha['ZIP'] || '';
        
        const valor = parseFloat(String(linha['Charge ($)'] || 0).replace('$', '')) || 0;
        const frequencia = (linha['Frequency'] || 'semanal').toLowerCase();
        const diassemana = (linha['Day of Week'] || 'segunda').toLowerCase();
        const status = linha['Stage'] === 'Active' ? 'ativo' : 'inativo';
        
        // Atribuir equipe automaticamente (round-robin)
        let equipeAtribuida = null;
        if (distribuirEquipes) {
          equipeAtribuida = equipes[indiceEquipe % equipes.length];
          indiceEquipe++;
        }

        const cliente = gerenciador.adicionarCliente({
          id: `cliente_${primeiroNome.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
          nome,
          telefone,
          email,
          endereco,
          cidade,
          estado,
          zip,
          status,
          valor,
          frequencia,
          diagemana: diassemana,
          equipeId: equipeAtribuida,
          dataCriacao: new Date().toISOString()
        });

        console.log(`✓ ${nome.padEnd(30)} | Equipe: ${equipeAtribuida} | $${valor.toFixed(2)}`);
        importados++;

      } catch (erro) {
        console.error(`✗ Erro ao importar cliente: ${erro.message}`);
        erros++;
      }
    }

    // Listar clientes por equipe
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMO POR EQUIPE');
    console.log('='.repeat(80));

    const equipeObj = gerenciador.equipes;
    equipeObj.obterEquipes().forEach(equipe => {
      const clientesEquipe = gerenciador.listarClientesPorEquipe(equipe.id);
      const valorTotal = clientesEquipe.reduce((sum, c) => sum + c.valor, 0);
      console.log(`\n${equipe.nome} (${equipe.id})`);
      console.log(`  - Clientes: ${clientesEquipe.length}`);
      console.log(`  - Valor Total: $${valorTotal.toFixed(2)}`);
      clientesEquipe.slice(0, 3).forEach(c => {
        console.log(`    • ${c.nome}`);
      });
      if (clientesEquipe.length > 3) {
        console.log(`    ... e ${clientesEquipe.length - 3} mais`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ IMPORTAÇÃO CONCLUÍDA');
    console.log('='.repeat(80));
    console.log(`   - Importados: ${importados}`);
    console.log(`   - Erros: ${erros}`);
    console.log(`   - Total: ${importados + erros}`);
    console.log(`\n📂 Dados salvos em: ./dados-clientes/`);
    console.log(`   - clientes.json (dados de clientes)`);
    console.log(`   - equipes.json (equipes e atribuições)`);

  } catch (erro) {
    console.error(`❌ Erro ao processar arquivo: ${erro.message}`);
    console.error(erro);
  }
}

// Executar
const caminhoExcel = process.argv[2] || 'Clientes_LopesServices_COMPLETO.xlsx';
const distribuir = process.argv[3] !== 'sem-distribuir';
importarClientesDoPainelExcel(caminhoExcel, distribuir);
