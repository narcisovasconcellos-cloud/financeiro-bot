# CLAUDE.md — Controle Financeiro do Casal

## Visão Geral do Projeto

Sistema de controle financeiro para o casal **Narciso & Bruna**, com interface web acessível
pelo celular e PC. O casal registra receitas, despesas, parcelamentos e contas fixas por um
formulário web simples, que alimenta automaticamente uma planilha Google Sheets.

**Arquitetura atual (v2.0): site 100% estático no GitHub Pages + Google Apps Script como backend.**
Não há mais servidor Node/Express nem Service Account — a gravação na planilha é feita por um
Apps Script publicado como Web App.

---

## Decisões do Projeto

| Decisão | Escolha | Motivo |
|---|---|---|
| Interface | App web estático | Simples, gratuito, sem servidor |
| Planilha | Google Sheets | Gratuito, familiar, integração nativa com Apps Script |
| Hospedagem | GitHub Pages | Gratuito, deploy via git push |
| Backend / gravação | Google Apps Script (Web App) | Site estático não grava direto no Sheets; Apps Script grava sem expor credenciais |
| Autenticação Google | Apps Script "Executar como: Eu" | Sem Service Account; usa o acesso da conta dona do script |
| Idioma | Português PT-BR | Preferência do casal |
| WhatsApp / IA | Descartados | Baileys com risco de banimento; interface estruturada dispensa NLP |

> **Histórico:** versões anteriores usaram Express + Railway + Service Account (v1.0) e,
> antes disso, um bot WhatsApp com Baileys (descartado por risco de banimento). A v2.0
> migrou para site estático + Apps Script para zerar custo e complexidade de servidor.

---

## Stack Técnica

| Componente | Tecnologia |
|---|---|
| Frontend | HTML + CSS + JS (vanilla, sem build) |
| Backend | Google Apps Script (Web App, `doPost`) |
| Planilha | Google Sheets |
| Hospedagem | GitHub Pages |
| Repositório | GitHub (narcisovasconcellos-cloud/financeiro-bot) |

---

## Arquitetura

```
[Celular / PC]
  Narciso ou Bruna abre o link do GitHub Pages
  Preenche o formulário (tipo, valor, categoria, descrição...)
  Clica em "Registrar"
        ↓  fetch POST (Content-Type: text/plain, evita preflight CORS)
[Google Apps Script — Web App /exec]
  doPost(e) → JSON.parse(e.postData.contents)
  SpreadsheetApp.openById(SHEET_ID)
  Insere nova linha na aba "📋 Lançamentos" (a partir da linha 4)
        ↓
[Google Sheets]
  Fórmulas das outras abas atualizam automaticamente
  → Resumo Mensal / Contas Fixas / Parcelamentos / Dashboard
```

---

## Estrutura do Repositório

```
financeiro-bot/
├── index.html            ← Formulário (estrutura HTML)
├── css/style.css         ← Estilos (tema verde/creme, responsivo mobile)
├── js/app.js             ← Lógica + envio ao Apps Script (configurar APPS_SCRIPT_URL)
├── apps-script/Codigo.gs ← Backend Apps Script (copiar para script.google.com)
├── .nojekyll             ← Evita processamento Jekyll no GitHub Pages
├── README.md             ← Instruções de deploy
└── CLAUDE.md             ← Este arquivo
```

> A pasta `files/` contém artefatos da arquitetura antiga (Express/Railway) mantidos apenas
> para referência histórica. Não fazem parte do app estático atual.

---

## Formulário Web — Campos

| Campo | Tipo | Obrigatório |
|---|---|---|
| Tipo | Tab (Despesa / Receita) | Sim |
| Quem | Chip (Narciso / Bruna) | Sim |
| Valor | Numérico (R$) | Sim |
| Categoria | Select (muda conforme o tipo) | Sim |
| Descrição | Texto | Sim |
| Conta fixa? | Toggle | Não |
| Parcelado? | Toggle | Não |
| Parcela atual / Total | Numérico (par) | Só se parcelado |
| Data | Date picker | Sim (default: hoje) |
| Observação | Textarea | Não |

---

## Categorias

**Despesa:** 🛒 Alimentação, 🏠 Moradia, 💡 Contas, 🚗 Transporte, 🏥 Saúde, 🎬 Lazer, 📚 Educação, 👗 Vestuário, 💳 Assinaturas, 📦 Outros

**Receita:** 💰 Salário, 💰 Renda extra, 💰 Investimento, 💰 Outros

> Definidas nos arrays `CATS_DESPESA` / `CATS_RECEITA` em `js/app.js`.

---

## Planilha Google Sheets

**ID:** `1QE7R_i9NvSOWZC4jfHQOda1sm4WUMKR5f-JN5ppkrQI`

**Aba de escrita:** `📋 Lançamentos` (o app insere a partir da linha 4).

**Estrutura da linha de lançamento (colunas A→L):**
```
ID | Data | Quem | Tipo | Categoria | Descrição | Valor | Parcela Nº | Total Parcelas | Valor Total | Fixa? | Observação
```

| Coluna | Conteúdo | Exemplo |
|---|---|---|
| A — ID | 6 últimos dígitos do timestamp | `483920` |
| B — Data | DD/MM/AAAA | `18/06/2026` |
| C — Quem | Narciso / Bruna | `Bruna` |
| D — Tipo | Despesa / Receita | `Despesa` |
| E — Categoria | com emoji | `🛒 Alimentação` |
| F — Descrição | texto livre | `Supermercado` |
| G — Valor | da parcela/lançamento | `250.00` |
| H — Parcela Nº | só se parcelado | `3` |
| I — Total Parcelas | só se parcelado | `12` |
| J — Valor Total | valor × total parcelas | `3000.00` |
| K — Fixa? | Sim / Não | `Não` |
| L — Observação | texto livre | `` |

---

## Backend — Google Apps Script

Arquivo: `apps-script/Codigo.gs`. Publicado como **App da Web** em <https://script.google.com>.

- **Executar como:** Eu (conta com acesso de edição à planilha)
- **Quem pode acessar:** Qualquer pessoa
- **Senha:** constante `SENHA` no topo do `Codigo.gs`. Validada em todo `doPost`; fica só no
  backend, nunca no JS público. Trocar a senha exige reimplantar (Nova versão).
- **Endpoints:**
  - `doPost(e)` com `{ action: 'verificar', token }` — valida a senha (usado pela tela de login)
  - `doPost(e)` com `{ token, row: [...] }` — grava a linha (rejeita se `token` ≠ `SENHA`)
  - `doGet()` — health check (retorna `{ ok: true, status: "online" }`)

A URL `/exec` gerada deve ser colada em `CONFIG.APPS_SCRIPT_URL` no `js/app.js`.

**CORS:** o frontend envia `Content-Type: text/plain` de propósito — isso evita o *preflight*
`OPTIONS`, que o Apps Script não responde. O Apps Script ainda devolve a resposta JSON lida pelo
navegador.

---

## Deploy

### Backend (Apps Script)
1. <https://script.google.com> → Novo projeto → colar `Codigo.gs`.
2. Implantar → Nova implantação → App da Web → Executar como **Eu**, acesso **Qualquer pessoa**.
3. Copiar URL `/exec` → colar em `js/app.js`.

### Frontend (GitHub Pages)
1. `git push` para `narcisovasconcellos-cloud/financeiro-bot` (branch `main`).
2. GitHub → Settings → Pages → Deploy from branch → `main` / `(root)`.
3. App disponível em `https://narcisovasconcellos-cloud.github.io/financeiro-bot/`.

---

## Credenciais e Serviços

| Serviço | Conta | Observação |
|---|---|---|
| Google Sheets | narcisovasconcellos | Planilha do casal (ID acima) |
| Google Apps Script | narcisovasconcellos | Web App "Executar como: Eu" |
| GitHub | narcisovasconcellos-cloud | Repo: financeiro-bot (GitHub Pages) |

> A v2.0 **não usa** Service Account, Railway nem chave da Anthropic.

---

## Segurança

- **Senha de acesso (ativa):** o app abre com tela de bloqueio. A senha é validada pelo backend
  (`const SENHA` no `Codigo.gs`) em todo envio. Fica salva no `localStorage` do aparelho, então
  cada pessoa digita só uma vez. A senha verdadeira **não** aparece no JS público — o frontend
  só repassa o que o usuário digitou e o Apps Script decide.
- Fluxo de login: a tela manda `{ action: 'verificar', token }`; se `ok`, salva a senha e libera
  o formulário. Se o backend retornar `nao-autorizado` durante um envio, o app volta para a tela
  de bloqueio.
- Como é site estático, o código é visível — mas sem a senha ninguém grava na planilha, e em
  nenhum caso é possível ler ou apagar dados pela URL.

---

## Histórico de Versões

| Versão | Data | O que mudou |
|---|---|---|
| v0.x | Mai/2026 | Bot WhatsApp (Baileys) — descartado por risco de banimento |
| v1.0 | Mai/2026 | Interface web + API Express + Service Account (Railway) |
| v2.0 | Jun/2026 | Migração para site estático (GitHub Pages) + Apps Script; fim do servidor Node |

---

## Próximas Melhorias

- [ ] Página de resumo/extrato dentro do app
- [ ] Filtro por mês no extrato
- [ ] PWA completo (manifest, ícone, offline)
- [ ] Editar/apagar lançamentos pelo app

---

*Última atualização: Jun/2026 — v2.0 site estático + Apps Script*
