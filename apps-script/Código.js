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

    // Padrão: gravar novo lançamento.
    if (!Array.isArray(data.row)) {
      return jsonResponse({ ok: false, error: 'Dados inválidos' });
    }
    const row = normalizar(data.row);
    const proxima = Math.max(sheet.getLastRow() + 1, 4);
    sheet.getRange(proxima, 1, 1, row.length).setValues([row]);
    sheet.getRange(proxima, 2).setNumberFormat('dd/mm/yy');
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
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

// Health check — abrir a URL /exec no navegador deve mostrar "online".
function doGet() {
  return jsonResponse({ ok: true, status: 'online', aba: ABA });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
