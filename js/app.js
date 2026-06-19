/* ===================================================================
   CONFIGURAÇÃO
   =================================================================== */
const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxM2R9HHyizXTSl2UWgxguNIp6esFKTsuZ_8fV1ZN4sy-ne0ACYcPwg6jGCPniHOVFL/exec'
};

const STORAGE_KEY = 'financeiro-senha';
const QUEM_KEY = 'financeiro-quem';
let senha = localStorage.getItem(STORAGE_KEY) || '';

let tipo = 'Despesa';
let quem = localStorage.getItem(QUEM_KEY) || 'Narciso';
let fixaOn = false, parceladoOn = false;
let editId = null;            // id do lançamento em edição (null = novo)
let todosItens = [];          // cache do extrato
let mesAtual = new Date();    // mês exibido no extrato
let extratoCarregado = false;

const CATS_DESPESA = ['🛒 Alimentação','🏠 Moradia','💡 Contas','🚗 Transporte','🏥 Saúde','🎬 Lazer','📚 Educação','👗 Vestuário','💳 Assinaturas','📦 Outros'];
const CATS_RECEITA = ['💰 Salário','💰 Renda extra','💰 Investimento','💰 Outros'];
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

/* ===================== Comunicação com o backend ===================== */
async function api(payload) {
  const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(Object.assign({ token: senha }, payload))
  });
  return response.json();
}

function urlConfigurada() {
  return CONFIG.APPS_SCRIPT_URL && !CONFIG.APPS_SCRIPT_URL.startsWith('COLE_AQUI');
}

/* ===================== Formulário ===================== */
function setTipo(t) {
  tipo = t;
  document.querySelectorAll('.tipo-tab').forEach(el => el.classList.remove('active'));
  document.querySelector('.tipo-tab.' + t.toLowerCase()).classList.add('active');
  const btn = document.getElementById('btn-submit');
  btn.className = 'btn-submit ' + (t === 'Receita' ? 'receita' : '');
  atualizarBotao();
  updateCategorias();
}

function updateCategorias(manter) {
  const sel = document.getElementById('categoria');
  const cats = tipo === 'Receita' ? CATS_RECEITA : CATS_DESPESA;
  sel.innerHTML = '<option value="">Selecione...</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
  if (manter) sel.value = manter;
}

function setQuem(nome) {
  quem = nome;
  localStorage.setItem(QUEM_KEY, nome);
  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.quem === nome));
}

function setFixa(on) {
  fixaOn = on;
  document.getElementById('toggle-fixa').classList.toggle('on', on);
}
function toggleFixa() { setFixa(!fixaOn); }

function setParcelado(on) {
  parceladoOn = on;
  document.getElementById('toggle-parc').classList.toggle('on', on);
  document.getElementById('parcelas-row').classList.toggle('visible', on);
}
function toggleParcelado() { setParcelado(!parceladoOn); }

function atualizarBotao() {
  const txt = editId ? 'Salvar alterações' : ('Registrar ' + tipo);
  document.getElementById('btn-text').textContent = txt;
  document.getElementById('btn-icon').textContent = editId ? '💾' : (tipo === 'Receita' ? '💰' : '💸');
}

/* ===================== Login ===================== */
async function desbloquear() {
  const input = document.getElementById('lock-input');
  const erro = document.getElementById('lock-erro');
  const btn = document.getElementById('lock-btn');
  const tentativa = input.value.trim();

  if (!tentativa) { erro.textContent = 'Digite a senha'; return; }
  if (!urlConfigurada()) { erro.textContent = 'Configure a URL do Apps Script em js/app.js'; return; }

  btn.classList.add('loading');
  erro.textContent = '';
  try {
    const r = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'verificar', token: tentativa })
    });
    const result = await r.json();
    if (result.ok) {
      senha = tentativa;
      localStorage.setItem(STORAGE_KEY, senha);
      document.getElementById('lock-overlay').classList.add('hidden');
    } else {
      erro.textContent = '❌ Senha incorreta';
    }
  } catch (e) {
    erro.textContent = '❌ Erro de conexão';
  }
  btn.classList.remove('loading');
}

function bloquear() {
  senha = '';
  localStorage.removeItem(STORAGE_KEY);
  document.getElementById('lock-input').value = '';
  document.getElementById('lock-overlay').classList.remove('hidden');
}

/* ===================== Util ===================== */
function showToast(msg, t) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + t + ' show';
  setTimeout(() => el.classList.remove('show'), 3500);
}

function formatBRL(n) {
  return (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function limparFormulario() {
  ['valor','descricao','observacao','parcela-atual','parcela-total'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('categoria').value = '';
  if (fixaOn) setFixa(false);
  if (parceladoOn) setParcelado(false);
  document.getElementById('data').value = new Date().toISOString().split('T')[0];
}

/* ===================== Gravar / Editar ===================== */
async function enviar() {
  const valor = parseFloat(document.getElementById('valor').value);
  const categoria = document.getElementById('categoria').value;
  const descricao = document.getElementById('descricao').value.trim();
  const data = document.getElementById('data').value;
  const observacao = document.getElementById('observacao').value.trim();
  const parcelaAtual = document.getElementById('parcela-atual').value;
  const parcelaTotal = document.getElementById('parcela-total').value;

  if (!valor || valor <= 0) { showToast('⚠️ Informe o valor', 'erro'); return; }
  if (!categoria) { showToast('⚠️ Selecione uma categoria', 'erro'); return; }
  if (!descricao) { showToast('⚠️ Informe a descrição', 'erro'); return; }
  if (!data) { showToast('⚠️ Informe a data', 'erro'); return; }
  if (parceladoOn && (!parcelaAtual || !parcelaTotal)) { showToast('⚠️ Informe as parcelas', 'erro'); return; }
  if (!urlConfigurada()) { showToast('⚠️ Configure a URL do Apps Script', 'erro'); return; }

  const btn = document.getElementById('btn-submit');
  btn.classList.add('loading');

  const dataFormatada = data.split('-').reverse().join('/');
  const id = editId || Date.now().toString().slice(-6);
  const valorTotal = parceladoOn && parcelaAtual && parcelaTotal ? (valor * parseInt(parcelaTotal)).toFixed(2) : '';

  // Colunas A→L
  const row = [
    id, dataFormatada, quem, tipo, categoria, descricao,
    valor.toFixed(2),
    parceladoOn ? parcelaAtual : '',
    parceladoOn ? parcelaTotal : '',
    valorTotal,
    fixaOn ? 'Sim' : 'Não',
    observacao
  ];

  try {
    const result = editId
      ? await api({ action: 'editar', id: editId, row })
      : await api({ row });

    if (result.ok) {
      showToast(editId ? '✅ Lançamento atualizado!' : '✅ Lançamento registrado!', 'sucesso');
      const estavaEditando = !!editId;
      cancelarEdicao();        // limpa estado de edição
      limparFormulario();
      extratoCarregado = false; // força recarregar o extrato
      if (estavaEditando) mostrarView('extrato');
    } else if (result.error === 'nao-autorizado') {
      showToast('🔒 Sessão expirada, faça login novamente', 'erro');
      bloquear();
    } else if (result.error === 'nao-encontrado') {
      showToast('❌ Lançamento não encontrado (já apagado?)', 'erro');
    } else {
      showToast('❌ Erro: ' + (result.error || 'Tente novamente'), 'erro');
    }
  } catch (e) {
    showToast('❌ Erro de conexão', 'erro');
  }
  btn.classList.remove('loading');
}

/* ===================== Navegação entre telas ===================== */
function mostrarView(nome) {
  const reg = nome === 'registrar';
  document.getElementById('view-registrar').style.display = reg ? '' : 'none';
  document.getElementById('view-extrato').style.display = reg ? 'none' : '';
  document.getElementById('nav-registrar').classList.toggle('active', reg);
  document.getElementById('nav-extrato').classList.toggle('active', !reg);
  document.getElementById('header-sub').textContent = reg
    ? 'Narciso & Bruna · Registrar lançamento'
    : 'Narciso & Bruna · Extrato do mês';
  window.scrollTo(0, 0);
  if (!reg && !extratoCarregado) carregarExtrato();
}

/* ===================== Extrato ===================== */
async function carregarExtrato() {
  const lista = document.getElementById('extrato-lista');
  lista.innerHTML = '<div class="extrato-vazio">Carregando…</div>';
  try {
    const result = await api({ action: 'listar' });
    if (result.ok) {
      todosItens = result.itens || [];
      extratoCarregado = true;
      renderExtrato();
    } else if (result.error === 'nao-autorizado') {
      bloquear();
    } else {
      lista.innerHTML = '<div class="extrato-vazio">Erro ao carregar.</div>';
    }
  } catch (e) {
    lista.innerHTML = '<div class="extrato-vazio">Erro de conexão.</div>';
  }
}

function mudarMes(delta) {
  mesAtual = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + delta, 1);
  renderExtrato();
}

function renderExtrato() {
  const ym = mesAtual.getFullYear() + '-' + String(mesAtual.getMonth() + 1).padStart(2, '0');
  document.getElementById('month-label').textContent = MESES[mesAtual.getMonth()] + ' ' + mesAtual.getFullYear();

  const doMes = todosItens.filter(it => (it.dataISO || '').slice(0, 7) === ym);

  let receitas = 0, despesas = 0;
  doMes.forEach(it => {
    const v = Number(it.valor) || 0;
    if (it.tipo === 'Receita') receitas += v; else despesas += v;
  });
  const saldo = receitas - despesas;
  document.getElementById('s-receitas').textContent = formatBRL(receitas);
  document.getElementById('s-despesas').textContent = formatBRL(despesas);
  const elSaldo = document.getElementById('s-saldo');
  elSaldo.textContent = formatBRL(saldo);
  elSaldo.className = saldo < 0 ? 'neg' : 'pos';

  const lista = document.getElementById('extrato-lista');
  if (doMes.length === 0) {
    lista.innerHTML = '<div class="extrato-vazio">Nenhum lançamento neste mês.</div>';
    return;
  }

  // mais recentes primeiro
  doMes.sort((a, b) => (b.dataISO || '').localeCompare(a.dataISO || ''));

  lista.innerHTML = doMes.map(it => {
    const receita = it.tipo === 'Receita';
    const sinal = receita ? '+' : '−';
    const emoji = (it.categoria || '').split(' ')[0] || '•';
    const parc = (it.parcelaAtual && it.parcelaTotal) ? ` · ${it.parcelaAtual}/${it.parcelaTotal}x` : '';
    const fixa = it.fixa === 'Sim' ? ' · 📌' : '';
    return `
      <div class="item">
        <div class="item-emoji">${emoji}</div>
        <div class="item-info">
          <div class="item-desc">${escapeHtml(it.descricao || '(sem descrição)')}</div>
          <div class="item-meta">${escapeHtml(it.quem || '')} · ${it.dataBR || ''}${parc}${fixa}</div>
        </div>
        <div class="item-right">
          <div class="item-valor ${receita ? 'pos' : 'neg'}">${sinal} ${formatBRL(it.valor)}</div>
          <div class="item-acoes">
            <button onclick="editarItem('${it.id}')" aria-label="Editar">✏️</button>
            <button onclick="apagarItem('${it.id}')" aria-label="Apagar">🗑️</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

/* ===================== Editar / Apagar ===================== */
function editarItem(id) {
  const it = todosItens.find(x => x.id === id);
  if (!it) { showToast('❌ Lançamento não encontrado', 'erro'); return; }

  editId = id;
  setTipo(it.tipo === 'Receita' ? 'Receita' : 'Despesa');
  updateCategorias(it.categoria);
  setQuem(it.quem === 'Bruna' ? 'Bruna' : 'Narciso');
  document.getElementById('valor').value = it.valor;
  document.getElementById('descricao').value = it.descricao || '';
  document.getElementById('observacao').value = it.obs || '';
  document.getElementById('data').value = it.dataISO || new Date().toISOString().split('T')[0];

  const temParc = it.parcelaAtual && it.parcelaTotal;
  setParcelado(!!temParc);
  document.getElementById('parcela-atual').value = temParc ? it.parcelaAtual : '';
  document.getElementById('parcela-total').value = temParc ? it.parcelaTotal : '';
  setFixa(it.fixa === 'Sim');

  document.getElementById('edit-banner').classList.add('show');
  atualizarBotao();
  mostrarView('registrar');
}

function cancelarEdicao() {
  editId = null;
  document.getElementById('edit-banner').classList.remove('show');
  atualizarBotao();
}

async function apagarItem(id) {
  const it = todosItens.find(x => x.id === id);
  const desc = it ? (it.descricao || 'este lançamento') : 'este lançamento';
  if (!confirm('Apagar "' + desc + '"?\nEssa ação não pode ser desfeita.')) return;

  try {
    const result = await api({ action: 'apagar', id });
    if (result.ok) {
      showToast('🗑️ Lançamento apagado', 'sucesso');
      todosItens = todosItens.filter(x => x.id !== id);
      renderExtrato();
    } else if (result.error === 'nao-autorizado') {
      bloquear();
    } else {
      showToast('❌ Erro ao apagar', 'erro');
    }
  } catch (e) {
    showToast('❌ Erro de conexão', 'erro');
  }
}

/* ===================== Inicialização ===================== */
if (senha) document.getElementById('lock-overlay').classList.add('hidden');
setQuem(quem);
updateCategorias();
atualizarBotao();
document.getElementById('data').value = new Date().toISOString().split('T')[0];
document.getElementById('data-hoje').textContent = 'Hoje: ' + new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
