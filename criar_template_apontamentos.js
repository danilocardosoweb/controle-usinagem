const XLSX = require('xlsx');
const path = require('path');

// Criar workbook
const wb = XLSX.utils.book_new();

// ===== ABA 1: INSTRUÇÕES =====
const instructionsData = [
  ['TEMPLATE DE APONTAMENTOS DE USINAGEM'],
  [''],
  ['INSTRUÇÕES DE PREENCHIMENTO:'],
  [''],
  ['1. CAMPOS OBRIGATÓRIOS (devem ser preenchidos):'],
  ['   - Data Início: formato DD/MM/YYYY HH:MM (ex: 18/03/2026 14:55)'],
  ['   - Data Fim: formato DD/MM/YYYY HH:MM (ex: 18/03/2026 15:55)'],
  ['   - Pedido/Seq: código do pedido (ex: 84659/10)'],
  ['   - Máquina: nome da máquina (consulte a aba "Referência")'],
  ['   - Quantidade: número de peças produzidas'],
  [''],
  ['2. CAMPOS OPCIONAIS:'],
  ['   - Qtd Refugo: quantidade de peças refugadas'],
  ['   - Comprimento Refugo: comprimento em mm'],
  ['   - Dureza: valor de dureza do material'],
  ['   - Rack/Pallet: identificação do rack ou pallet'],
  ['   - Observações: anotações adicionais'],
  [''],
  ['3. CAMPOS PREENCHIDOS AUTOMATICAMENTE:'],
  ['   - Operador: será preenchido com o usuário logado'],
  ['   - Produto: extraído do pedido'],
  ['   - Cliente: extraído do pedido'],
  ['   - Perfil Longo: extraído do pedido'],
  [''],
  ['4. DATAS E HORAS:'],
  ['   - Use formato DD/MM/YYYY HH:MM'],
  ['   - A hora de fim NÃO pode ser anterior à hora de início'],
  ['   - Exemplo correto: 18/03/2026 14:55 até 18/03/2026 15:55'],
  [''],
  ['5. MÁQUINAS DISPONÍVEIS:'],
  ['   - Consulte a aba "Referência" para ver a lista de máquinas'],
  [''],
  ['6. APÓS PREENCHER:'],
  ['   - Salve o arquivo em formato Excel (.xlsx)'],
  ['   - Importe no app em "Apontamentos > Importar Planilha"'],
  ['   - O app validará e carregará os dados automaticamente'],
];

const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
wsInstructions['!cols'] = [{ wch: 80 }];
XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instruções');

// ===== ABA 2: REFERÊNCIA =====
const referenceData = [
  ['MÁQUINAS DISPONÍVEIS', '', 'OPERADORES'],
  ['Nome da Máquina', 'Código', 'Nome do Operador'],
  ['Serra Doppia 2 cabeças', 'SERRA_DOPPIA_2', 'Danilo Cardoso'],
  ['Torno CNC', 'TORNO_CNC', 'João Silva'],
  ['Fresadora', 'FRESADORA', 'Maria Santos'],
  ['Retífica', 'RETIFICA', 'Pedro Oliveira'],
  ['', '', ''],
  ['DICAS:', '', ''],
  ['- Use o nome exato da máquina ao preencher', '', ''],
  ['- Se a máquina não está na lista, contate o administrador', '', ''],
];

const wsReference = XLSX.utils.aoa_to_sheet(referenceData);
wsReference['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 25 }];
XLSX.utils.book_append_sheet(wb, wsReference, 'Referência');

// ===== ABA 3: ENTRADA DE DADOS =====
const headerRow = [
  'Data Início',
  'Data Fim',
  'Pedido/Seq',
  'Máquina',
  'Quantidade',
  'Qtd Refugo',
  'Comprimento Refugo (mm)',
  'Dureza',
  'Rack/Pallet',
  'Observações'
];

const exampleRow = [
  '18/03/2026 14:55',
  '18/03/2026 15:55',
  '84659/10',
  'Serra Doppia 2 cabeças',
  '8000',
  '50',
  '1340',
  '58',
  '4117',
  'Troca de pallet 10:20/10:40'
];

const emptyRows = Array(19).fill(null).map(() => [
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  ''
]);

const entryData = [headerRow, exampleRow, ...emptyRows];

const wsEntry = XLSX.utils.aoa_to_sheet(entryData);
wsEntry['!cols'] = [
  { wch: 18 },
  { wch: 18 },
  { wch: 15 },
  { wch: 25 },
  { wch: 12 },
  { wch: 12 },
  { wch: 20 },
  { wch: 10 },
  { wch: 15 },
  { wch: 30 }
];

// Formatar cabeçalho
for (let col = 0; col < headerRow.length; col++) {
  const cellRef = XLSX.utils.encode_col(col) + '1';
  wsEntry[cellRef].s = {
    fill: { fgColor: { rgb: 'FF4472C4' } },
    font: { bold: true, color: { rgb: 'FFFFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
  };
}

// Formatar linha de exemplo
for (let col = 0; col < headerRow.length; col++) {
  const cellRef = XLSX.utils.encode_col(col) + '2';
  wsEntry[cellRef].s = {
    fill: { fgColor: { rgb: 'FFE7E6E6' } },
    font: { italic: true, color: { rgb: 'FF595959' } }
  };
}

XLSX.utils.book_append_sheet(wb, wsEntry, 'Apontamentos');

// Salvar arquivo
const outputPath = path.join('c:\\Users\\Danilo\\Desktop\\apps\\Usinagem', 'TEMPLATE_APONTAMENTOS.xlsx');
XLSX.writeFile(wb, outputPath);

console.log('✅ Template Excel criado com sucesso!');
console.log(`📁 Arquivo: ${outputPath}`);
