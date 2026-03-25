const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { GerenciadorClientes } = require('./agendador-multicliente');

async function importarClientesDoPainelExcel(caminhoExcel) {
  console.log(`📂 Lendo arquivo: ${caminhoExcel}`);

  // Validar arquivo
  if (!fs.existsSync(caminhoExcel)) {
    console.error(`❌ Arquivo não encontrado: ${caminhoExcel}`);
    return;
  }

  try {
    // Ler arquivo Excel
    const workbook = XLSX.readFile(caminhoExcel);
    const clientesSheet = workbook.Sheets['Clientes'];

    if (!clientesSheet) {
      console.error('❌ Planilha "Clientes" não encontrada');
      return;
    }

    // Converter para JSON
    const dados = XLSX.utils.sheet_to_json(clientesSheet);
    console.log(`✓ ${dados.length} clientes encontrados no arquivo`);

    // Inicializar gerenciador
    const gerenciador = new GerenciadorClientes('./dados-clientes');

    // Importar cada cliente
    let importados = 0;
    let erros = 0;

    for (const linha of dados) {
      try {
        const cliente = gerenciador.adicionarCliente({
          id: linha['ID'] || `cliente_${Date.now()}_${Math.random()}`,
          nome: linha['Nome'] || 'Sem Nome',
          telefone: linha['Telefone'] || '',
          email: linha['Email'] || '',
          endereco: linha['Endereço'] || '',
          cidade: linha['Cidade'] || 'Palm Bay',
          status: linha['Status'] || 'ativo',
          valor: parseFloat(linha['Valor']) || 0
        });

        console.log(`✓ Cliente importado: ${cliente.nome}`);
        importados++;
      } catch (erro) {
        console.error(`✗ Erro ao importar cliente: ${erro.message}`);
        erros++;
      }
    }

    console.log(`\n✅ Importação concluída!`);
    console.log(`   - Importados: ${importados}`);
    console.log(`   - Erros: ${erros}`);
    console.log(`   - Total: ${importados + erros}`);
    console.log(`\n📂 Dados salvos em: ./dados-clientes/clientes.json`);

  } catch (erro) {
    console.error(`❌ Erro ao processar arquivo: ${erro.message}`);
  }
}

// Executar
const caminhoExcel = process.argv[2] || 'CLIENTES_AGENDAMENTO_MASTER.xlsx';
importarClientesDoPainelExcel(caminhoExcel);
