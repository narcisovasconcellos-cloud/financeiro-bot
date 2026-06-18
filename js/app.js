/* ===================================================================
   CONFIGURAÇÃO
   -------------------------------------------------------------------
   Cole abaixo a URL do seu Google Apps Script publicado como Web App.
   (Implantar → Nova implantação → App da Web → "Qualquer pessoa")
   Veja o passo a passo no README.md.
   =================================================================== */
const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxM2R9HHyizXTSl2UWgxguNIp6esFKTsuZ_8fV1ZN4sy-ne0ACYcPwg6jGCPniHOVFL/exec'
};

const STORAGE_KEY = 'financeiro-senha';
let senha = localStorage.getItem(STORAGE_KEY) || '';

let tipo = 'Despesa', quem = 'Narciso', fixaOn = false, parceladoOn = false;

const CATS_DESPESA = ['🛒 Alimentação','🏠 Moradia','💡 Contas','🚗 Transporte','🏥 Saúde','🎬 Lazer','📚 Educação','👗 Vestuário','💳 Assinaturas','📦 Outros'];
const CATS_RECEITA = ['💰 Salário','💰 Renda extra','💰 Investimento','💰 Outros'];

function setTipo(t) {
  tipo = t;
  document.querySelectorAll('.tipo-tab').forEach(el => el.classList.remove('active'));
  document.querySelector('.tipo-tab.' + t.toLowerCase()).classList.add('active');
  const btn = document.getElementById('btn-submit');
  btn.className = 'btn-submit ' + (t === 'Receita' ? 'receita' : '');
  document.getElementById('btn-text').textContent = 'Registrar ' + t;
  document.getElementById('btn-icon').textContent = t === 'Receita' ? '💰' : '💸';
  updateCategorias();
}

function updateCategorias() {
  const sel = document.getElementById('categoria');
  const cats = tipo === 'Receita' ? CATS_RECEITA : CATS_DESPESA;
  sel.innerHTML = '<option value="">Selecione...</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

function setQuem(nome, el) {
  quem = nome;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

function toggleFixa() {
  fixaOn = !fixaOn;
  document.getElementById('toggle-fixa').classList.toggle('on', fixaOn);
}

function toggleParcelado() {
  parceladoOn = !parceladoOn;
  document.getElementById('toggle-parc').classList.toggle('on', parceladoOn);
  document.getElementById('parcelas-row').classList.toggle('visible', parceladoOn);
}

function urlConfigurada() {
  return CONFIG.APPS_SCRIPT_URL && !CONFIG.APPS_SCRIPT_URL.startsWith('COLE_AQUI');
}

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
    const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'verificar', token: tentativa })
    });
    const result = await response.json();
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

function showToast(msg, t) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + t + ' show';
  setTimeout(() => el.classList.remove('show'), 3500);
}

function limparFormulario() {
  ['valor','descricao','observacao','parcela-atual','parcela-total'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('categoria').value = '';
  if (fixaOn) toggleFixa();
  if (parceladoOn) toggleParcelado();
}

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

  if (!urlConfigurada()) {
    showToast('⚠️ Configure a URL do Apps Script em js/app.js', 'erro');
    return;
  }

  const btn = document.getElementById('btn-submit');
  btn.classList.add('loading');

  const dataFormatada = data.split('-').reverse().join('/');
  const id = Date.now().toString().slice(-6);
  const valorTotal = parceladoOn && parcelaAtual && parcelaTotal ? (valor * parseInt(parcelaTotal)).toFixed(2) : '';

  // Colunas A→L da aba "📋 Lançamentos":
  // ID | Data | Quem | Tipo | Categoria | Descrição | Valor | Parcela Nº | Total Parcelas | Valor Total | Fixa? | Observação
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
    // Content-Type text/plain evita o preflight CORS (que o Apps Script não responde).
    const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: senha, row })
    });
    const result = await response.json();
    if (result.ok) {
      showToast('✅ Lançamento registrado!', 'sucesso');
      limparFormulario();
    } else if (result.error === 'nao-autorizado') {
      showToast('🔒 Sessão expirada, faça login novamente', 'erro');
      bloquear();
    } else {
      showToast('❌ Erro: ' + (result.error || 'Tente novamente'), 'erro');
    }
  } catch (e) {
    showToast('❌ Erro de conexão', 'erro');
  }
  btn.classList.remove('loading');
}

// Inicialização
if (senha) {
  // Senha já salva neste aparelho — entra direto (o backend valida em cada envio).
  document.getElementById('lock-overlay').classList.add('hidden');
}
updateCategorias();
const hoje = new Date();
document.getElementById('data').value = hoje.toISOString().split('T')[0];
document.getElementById('data-hoje').textContent = 'Hoje: ' + hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
