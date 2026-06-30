/**
 * Financeiro Família — backend Google Apps Script
 * ------------------------------------------------
 * Recebe os lançamentos do app web (GitHub Pages) e lê/grava/edita/apaga
 * na aba "📋 Lançamentos" da planilha do casal.
 *
 * SENHA: NÃO fica no código. Fica nas "Propriedades do Script"
 * (Configurações do projeto → Propriedades do script → chave: SENHA).
 *
 * DEPLOY: via clasp — `clasp push` envia este arquivo e
 * `clasp update-deployment <deploymentId>` atualiza o Web App (mesma URL).
 *
 * Colunas da aba (A→L):
 * 0 ID | 1 Data | 2 Quem | 3 Tipo | 4 Categoria | 5 Descrição |
 * 6 Valor | 7 Parcela Nº | 8 Total Parcelas | 9 Valor Total | 10 Fixa? | 11 Observação
 */

const SHEET_ID = '1QE7R_i9NvSOWZC4jfHQOda1sm4WUMKR5f-JN5ppkrQI';
const ABA = '📋 Lançamentos';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const props = PropertiesService.getScriptProperties();
    const SENHA = props.getProperty('SENHA') || props.getProperty('senha');

    // Validação da senha (token) — vale para todas as ações.
    if (!SENHA || data.token !== SENHA) {
      return jsonResponse({ ok: false, error: 'nao-autorizado' });
    }

    // Login: apenas confirma a senha.
    if (data.action === 'verificar') {
      return jsonResponse({ ok: true });
    }

    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ABA);
    if (!sheet) {
      return jsonResponse({ ok: false, error: 'Aba "' + ABA + '" não encontrada' });
    }

    // Listar: devolve todos os lançamentos para o extrato do app.
    if (data.action === 'listar') {
      return jsonResponse({ ok: true, itens: listarItens(sheet) });
    }

    // Editar: sobrescreve a linha cujo ID (coluna A) bate com data.id.
    if (data.action === 'editar') {
      const linha = acharLinhaPorId(sheet, data.id);
      if (linha < 0) return jsonResponse({ ok: false, error: 'nao-encontrado' });
      if (!Array.isArray(data.row)) return jsonResponse({ ok: false, error: 'Dados inválidos' });
      const rowE = normalizar(data.row);
      sheet.getRange(linha, 1, 1, rowE.length).setValues([rowE]);
      sheet.getRange(linha, 2).setNumberFormat('dd/mm/yy');
      return jsonResponse({ ok: true });
    }

    // Apagar: remove a linha cujo ID bate com data.id.
    if (data.action === 'apagar') {
      const linha = acharLinhaPorId(sheet, data.id);
      if (linha < 0) return jsonResponse({ ok: false, error: 'nao-encontrado' });
      sheet.deleteRow(linha);
      return jsonResponse({ ok: true });
    }

    // Reset: limpa todos os lançamentos abaixo do cabeçalho (linha 4+).
    if (data.action === 'reset') {
      const last = sheet.getLastRow();
      if (last >= 4) sheet.getRange(4, 1, last - 3, sheet.getLastColumn()).clearContent();
      return jsonResponse({ ok: true, limpas: Math.max(last - 3, 0) });
    }

    // Corrigir: limpa linhas com dados deslocados (col A vazia mas há dados na linha).
    if (data.action === 'corrigir') {
      var resultado = corrigirDados(sheet);
      return jsonResponse({ ok: true, corrigidas: resultado });
    }

    // Formatar: aplica formatação condicional e numérica até a linha 1000.
    if (data.action === 'formatar') {
      aplicarFormatacao(sheet);
      return jsonResponse({ ok: true });
    }

    // Criar aba Empresa com fórmulas de filtro automático.
    if (data.action === 'criarAbaEmpresa') {
      criarAbaEmpresa(SpreadsheetApp.openById(SHEET_ID));
      return jsonResponse({ ok: true });
    }

    // Padrão: gravar novo lançamento.
    if (!Array.isArray(data.row)) {
      return jsonResponse({ ok: false, error: 'Dados inválidos' });
    }
    const row = normalizar(data.row);
    const proxima = proximaLinhaVazia(sheet);
    // Copia formato visual da linha 5 (modelo) antes de gravar os valores
    sheet.getRange('A5:L5').copyTo(sheet.getRange(proxima, 1, 1, 12), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    sheet.getRange(proxima, 1, 1, row.length).setValues([row]);
    sheet.getRange(proxima, 2).setNumberFormat('dd/mm/yy');
    sheet.getRange(proxima, 7).setNumberFormat('R$ #,##0.00');
    sheet.getRange(proxima, 10).setNumberFormat('R$ #,##0.00');
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

// Encontra a próxima linha vazia pela coluna A (mais robusto que getLastRow).
function proximaLinhaVazia(sheet) {
  var last = sheet.getLastRow();
  if (last < 4) return 4;
  var colA = sheet.getRange(4, 1, last - 3, 1).getValues();
  for (var i = 0; i < colA.length; i++) {
    if (colA[i][0] === '' || colA[i][0] == null) return 4 + i;
  }
  return last + 1;
}

// Corrige linhas com dados deslocados: col A vazia mas resto da linha tem conteúdo.
// Move os dados uma coluna para a esquerda e limpa a coluna extra no fim.
function corrigirDados(sheet) {
  var last = sheet.getLastRow();
  if (last < 4) return 0;
  var corrigidas = 0;
  var totalCols = 12;
  for (var r = 4; r <= last; r++) {
    var rangeA = sheet.getRange(r, 1).getValue();
    if (rangeA !== '' && rangeA != null) continue; // col A preenchida, ok
    // Lê B até M (13 colunas) para ver se há dados deslocados
    var vals = sheet.getRange(r, 2, 1, totalCols + 1).getValues()[0];
    var temConteudo = vals.some(function(v) { return v !== '' && v != null; });
    if (!temConteudo) continue;
    // Escreve de A a L (deslocando uma coluna para a esquerda)
    var corrected = vals.slice(0, totalCols);
    sheet.getRange(r, 1, 1, totalCols).setValues([corrected]);
    // Limpa a coluna M que ficou sobrando
    sheet.getRange(r, totalCols + 2).clearContent();
    // Reformata data (col B = índice 1 nos dados corrigidos)
    sheet.getRange(r, 2).setNumberFormat('dd/mm/yy');
    corrigidas++;
  }
  return corrigidas;
}

// Converte colunas numéricas para Number e a data "DD/MM/AAAA" para Date.
function normalizar(row) {
  [6, 7, 8, 9].forEach(function (i) {
    if (row[i] !== '' && row[i] != null) row[i] = Number(row[i]);
  });
  if (typeof row[1] === 'string' && row[1].indexOf('/') > -1) {
    var p = row[1].split('/');
    row[1] = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
  }
  return row;
}

// Acha o número da linha (>=4) cujo ID (coluna A) bate; -1 se não achar.
function acharLinhaPorId(sheet, id) {
  var last = sheet.getLastRow();
  if (last < 4) return -1;
  var ids = sheet.getRange(4, 1, last - 3, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return 4 + i;
  }
  return -1;
}

// Lê os lançamentos e devolve objetos prontos para o app (com data em ISO e BR).
function listarItens(sheet) {
  var last = sheet.getLastRow();
  if (last < 4) return [];
  var vals = sheet.getRange(4, 1, last - 3, 12).getValues();
  var tz = 'America/Sao_Paulo';
  var itens = [];
  for (var i = 0; i < vals.length; i++) {
    var v = vals[i];
    if (v[0] === '' && v[5] === '' && (v[6] === '' || v[6] === 0)) continue; // pula linha vazia
    var dataISO = '', dataBR = '';
    if (v[1] instanceof Date) {
      dataISO = Utilities.formatDate(v[1], tz, 'yyyy-MM-dd');
      dataBR = Utilities.formatDate(v[1], tz, 'dd/MM/yy');
    } else if (v[1]) {
      dataBR = String(v[1]);
    }
    itens.push({
      id: String(v[0]),
      dataISO: dataISO,
      dataBR: dataBR,
      quem: v[2],
      tipo: v[3],
      categoria: v[4],
      descricao: v[5],
      valor: v[6],
      parcelaAtual: v[7],
      parcelaTotal: v[8],
      fixa: v[10],
      obs: v[11]
    });
  }
  return itens;
}

// Aplica formatação completa (bordas, alinhamento, cores, R$) até linha 1000.
function aplicarFormatacao(sheet) {
  // Copia o formato visual completo de uma linha existente (linha 5) para todo o range de dados.
  // Isso garante bordas, fonte, alinhamento e cor de fundo idênticos.
  var modeloRange = sheet.getRange('A5:L5');
  var destino = sheet.getRange('A4:L1000');
  modeloRange.copyTo(destino, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);

  // Formatos numéricos específicos por coluna
  sheet.getRange('G4:G1000').setNumberFormat('R$ #,##0.00');
  sheet.getRange('J4:J1000').setNumberFormat('R$ #,##0.00');
  sheet.getRange('B4:B1000').setNumberFormat('dd/mm/yy');

  // Alinhamento: ID e Data centralizados, resto à esquerda, Valor à direita
  sheet.getRange('A4:A1000').setHorizontalAlignment('center');
  sheet.getRange('B4:B1000').setHorizontalAlignment('center');
  sheet.getRange('C4:C1000').setHorizontalAlignment('center');
  sheet.getRange('D4:D1000').setHorizontalAlignment('center');
  sheet.getRange('G4:G1000').setHorizontalAlignment('right');
  sheet.getRange('H4:H1000').setHorizontalAlignment('center');
  sheet.getRange('I4:I1000').setHorizontalAlignment('center');
  sheet.getRange('J4:J1000').setHorizontalAlignment('right');
  sheet.getRange('K4:K1000').setHorizontalAlignment('center');

  // Formatação condicional: cores por tipo e conta fixa
  var ruleLinhReceita = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$D4="Receita"')
    .setBackground('#EAF4EC')
    .setRanges([sheet.getRange('A4:L1000')])
    .build();

  var ruleDespesa = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Despesa')
    .setFontColor('#C0392B')
    .setBold(true)
    .setRanges([sheet.getRange('D4:D1000')])
    .build();

  var ruleReceita = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Receita')
    .setFontColor('#1E8449')
    .setBold(true)
    .setRanges([sheet.getRange('D4:D1000')])
    .build();

  var ruleFixa = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('Sim')
    .setFontColor('#E67E22')
    .setRanges([sheet.getRange('K4:K1000')])
    .build();

  sheet.setConditionalFormatRules([ruleLinhReceita, ruleDespesa, ruleReceita, ruleFixa]);
}

// Cria (ou recria) a aba 🏢 Empresa com filtro automático dos lançamentos da empresa.
// Usa named ranges (LanData/LanTipo/LanValor/LanTodos) para evitar emoji nas fórmulas.
function criarAbaEmpresa(ss) {
  var nomeAba = '🏢 Empresa';
  var lanSheet = ss.getSheetByName(ABA); // ABA = '📋 Lançamentos'

  // Cria (ou atualiza) named ranges para as colunas-chave de Lançamentos
  // Usando Named Ranges, as fórmulas na aba Empresa não precisam referenciar
  // o emoji/cedilha do nome da aba — evita #ERROR! de parsing.
  ss.setNamedRange('LanData',  lanSheet.getRange('B4:B1000'));
  ss.setNamedRange('LanTipo',  lanSheet.getRange('D4:D1000'));
  ss.setNamedRange('LanValor', lanSheet.getRange('G4:G1000'));
  ss.setNamedRange('LanTodos', lanSheet.getRange('A4:L1000'));

  var abaExistente = ss.getSheetByName(nomeAba);
  if (abaExistente) ss.deleteSheet(abaExistente);

  var aba = ss.insertSheet(nomeAba);

  // Cabeçalho título
  aba.getRange('A1:F1').merge()
    .setValue('🏢 CUSTOS DA EMPRESA — Bruna')
    .setBackground('#4A0E5C')
    .setFontColor('#FFFFFF')
    .setFontSize(14)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  aba.setRowHeight(1, 40);

  // Subtítulo
  aba.getRange('A2:F2').merge()
    .setValue('Lançamentos com tipo "Empresa" — atualizados automaticamente')
    .setBackground('#7B2D8B')
    .setFontColor('#F3E8F7')
    .setFontSize(10)
    .setHorizontalAlignment('center');

  // Cards de resumo — usam named ranges (sem emoji nas fórmulas)
  aba.getRange('A3').setValue('Total do Mês Atual').setFontWeight('bold').setBackground('#F3E8F7');
  aba.getRange('B3').setFormula('=SUMPRODUCT((TEXT(LanData,"yyyy-mm")=TEXT(TODAY(),"yyyy-mm"))*(LanTipo="Empresa"),LanValor)')
    .setNumberFormat('R$ #,##0.00').setBackground('#F3E8F7').setFontWeight('bold').setFontColor('#7B2D8B');

  aba.getRange('C3').setValue('Total Geral').setFontWeight('bold').setBackground('#F3E8F7');
  aba.getRange('D3').setFormula('=SUMIF(LanTipo,"Empresa",LanValor)')
    .setNumberFormat('R$ #,##0.00').setBackground('#F3E8F7').setFontWeight('bold').setFontColor('#7B2D8B');

  aba.getRange('E3').setValue('Nº Lançamentos').setFontWeight('bold').setBackground('#F3E8F7');
  aba.getRange('F3').setFormula('=COUNTIF(LanTipo,"Empresa")')
    .setBackground('#F3E8F7').setFontWeight('bold').setFontColor('#7B2D8B');

  // Cabeçalho da tabela
  var headers = ['Data', 'Quem', 'Categoria', 'Descrição', 'Valor (R$)', 'Observação'];
  var headerRange = aba.getRange(4, 1, 1, headers.length);
  headerRange.setValues([headers])
    .setBackground('#4A0E5C')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  aba.setRowHeight(4, 30);

  // QUERY usando LanTodos (named range) — Col1=A,Col2=B,Col3=C,Col4=D,Col5=E,Col6=F,Col7=G,Col12=L
  aba.getRange('A5').setFormula(
    '=IFERROR(QUERY(LanTodos,"SELECT Col2,Col3,Col5,Col6,Col7,Col12 WHERE Col4=\'Empresa\' ORDER BY Col2 DESC",0),"")'
  );

  // Formatação das colunas de dados
  aba.getRange('A5:A1000').setNumberFormat('dd/mm/yy').setHorizontalAlignment('center');
  aba.getRange('B5:B1000').setHorizontalAlignment('center');
  aba.getRange('E5:E1000').setNumberFormat('R$ #,##0.00').setHorizontalAlignment('right');

  // Larguras das colunas
  aba.setColumnWidth(1, 90);
  aba.setColumnWidth(2, 80);
  aba.setColumnWidth(3, 160);
  aba.setColumnWidth(4, 200);
  aba.setColumnWidth(5, 110);
  aba.setColumnWidth(6, 180);

  // Congela as 4 primeiras linhas
  aba.setFrozenRows(4);

  // Move a aba para logo após Lançamentos
  var sheets = ss.getSheets();
  var lanIdx = -1;
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName() === ABA) { lanIdx = i; break; }
  }
  if (lanIdx >= 0) { ss.setActiveSheet(aba); ss.moveActiveSheet(lanIdx + 2); }
}

// Função auxiliar para rodar MANUALMENTE no editor do Apps Script.
// Selecionar esta função no dropdown e clicar em "Executar".
function executarCriarEmpresa() {
  criarAbaEmpresa(SpreadsheetApp.openById(SHEET_ID));
}

// Health check — abrir a URL /exec no navegador deve mostrar "online".
function doGet() {
  return jsonResponse({ ok: true, status: 'online', aba: ABA });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
