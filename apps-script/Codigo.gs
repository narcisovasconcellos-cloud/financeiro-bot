/**
 * Financeiro Família — backend Google Apps Script
 * ------------------------------------------------
 * Recebe os lançamentos do app web (GitHub Pages) e grava na aba
 * "📋 Lançamentos" da planilha do casal.
 *
 * COMO PUBLICAR:
 * 1. Abra https://script.google.com e crie um novo projeto.
 * 2. Cole este código no arquivo Codigo.gs.
 * 3. Implantar → Nova implantação → Tipo: App da Web.
 *    - Executar como: Eu (sua conta Google que tem acesso à planilha)
 *    - Quem pode acessar: Qualquer pessoa
 * 4. Copie a URL gerada (termina em /exec) e cole em js/app.js (CONFIG.APPS_SCRIPT_URL).
 *
 * Observação: a planilha precisa estar acessível pela conta que executa o script.
 * Como "Executar como: Eu", basta que VOCÊ tenha acesso de edição à planilha —
 * não é necessária Service Account.
 */

const SHEET_ID = '1QE7R_i9NvSOWZC4jfHQOda1sm4WUMKR5f-JN5ppkrQI';
const ABA = '📋 Lançamentos';

// ⚠️ SENHA: defina a senha real DIRETO no editor do Apps Script (script.google.com),
// NÃO neste arquivo do repositório. Como o repo é público (GitHub Pages), deixar a senha
// aqui a tornaria visível para qualquer pessoa. A senha real fica só no backend publicado.
const SENHA = 'DEFINA_NO_APPS_SCRIPT';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Validação da senha (token) — vale para login e para gravação.
    if (data.token !== SENHA) {
      return jsonResponse({ ok: false, error: 'nao-autorizado' });
    }

    // Ação "verificar": usada pela tela de login, apenas confirma a senha.
    if (data.action === 'verificar') {
      return jsonResponse({ ok: true });
    }

    const row = data.row;
    if (!Array.isArray(row)) {
      return jsonResponse({ ok: false, error: 'Dados inválidos' });
    }

    // Converte para que a planilha SOME corretamente (texto não entra em fórmula):
    // Colunas numéricas: G(6)=Valor, H(7)=Parcela Nº, I(8)=Total Parcelas, J(9)=Valor Total
    [6, 7, 8, 9].forEach(function (i) {
      if (row[i] !== '' && row[i] != null) row[i] = Number(row[i]);
    });
    // Coluna B(1) = Data "DD/MM/AAAA" -> objeto Date (para agrupar por mês).
    if (typeof row[1] === 'string' && row[1].indexOf('/') > -1) {
      var p = row[1].split('/');
      row[1] = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
    }

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(ABA);

    if (!sheet) {
      return jsonResponse({ ok: false, error: 'Aba "' + ABA + '" não encontrada' });
    }

    // Insere a partir da linha 4 (linhas 1–3 reservadas para título/cabeçalho).
    const proxima = Math.max(sheet.getLastRow() + 1, 4);
    sheet.getRange(proxima, 1, 1, row.length).setValues([row]);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

// Endpoint de teste — abrir a URL /exec no navegador deve mostrar "online".
function doGet() {
  return jsonResponse({ ok: true, status: 'online', aba: ABA });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
