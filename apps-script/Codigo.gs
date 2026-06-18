/**
 * Financeiro Família — backend Google Apps Script
 * ------------------------------------------------
 * Recebe os lançamentos do app web (GitHub Pages) e grava na aba
 * "📋 Lançamentos" da planilha do casal.
 *
 * SENHA: NÃO fica no código. Fica nas "Propriedades do Script"
 * (Configurações do projeto → Propriedades do script → chave: SENHA).
 * Assim o código pode ser público (GitHub) e ser reenviado via clasp
 * sem nunca expor nem sobrescrever a senha.
 *
 * DEPLOY: feito via clasp (CLI) — `clasp push` envia este arquivo e
 * `clasp deploy -i <deploymentId>` atualiza o Web App mantendo a mesma URL.
 */

const SHEET_ID = '1QE7R_i9NvSOWZC4jfHQOda1sm4WUMKR5f-JN5ppkrQI';
const ABA = '📋 Lançamentos';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const SENHA = PropertiesService.getScriptProperties().getProperty('SENHA');

    // Validação da senha (token) — vale para login e para gravação.
    if (!SENHA || data.token !== SENHA) {
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
