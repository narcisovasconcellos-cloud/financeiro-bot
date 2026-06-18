# 💰 Financeiro Família

App web estático (HTML + CSS + JS) para controle financeiro do casal **Narciso & Bruna**.
Cada lançamento (receita ou despesa) é gravado automaticamente na aba **📋 Lançamentos**
de uma planilha Google Sheets, via Google Apps Script.

- **Frontend:** site estático hospedado no GitHub Pages
- **Backend:** Google Apps Script publicado como Web App (sem servidor, sem credenciais no navegador)
- **Banco de dados:** Google Sheets

---

## 📁 Estrutura

```
financeiro-bot/
├── index.html            ← Formulário (estrutura)
├── css/style.css         ← Estilos (tema verde/creme, responsivo mobile)
├── js/app.js             ← Lógica + envio ao Apps Script  ⚠️ configurar URL aqui
├── apps-script/Codigo.gs ← Backend Apps Script (copiar para script.google.com)
├── .nojekyll             ← Evita processamento Jekyll no GitHub Pages
├── CLAUDE.md             ← Documentação completa do projeto
└── README.md             ← Este arquivo
```

---

## 🚀 Como colocar no ar

### 1. Publicar o backend (Google Apps Script)

1. Acesse <https://script.google.com> com a conta Google que tem acesso de **edição** à planilha.
2. **Novo projeto** → cole o conteúdo de [`apps-script/Codigo.gs`](apps-script/Codigo.gs).
3. **Defina a senha:** na linha `const SENHA = 'TROQUE_ESTA_SENHA';`, troque pelo valor que o casal vai usar para entrar no app.
4. **Implantar → Nova implantação**:
   - **Tipo:** App da Web
   - **Executar como:** Eu
   - **Quem pode acessar:** Qualquer pessoa
5. Autorize os acessos quando solicitado.
6. Copie a **URL do app da Web** (termina em `/exec`).
7. Teste: abrir essa URL no navegador deve mostrar `{"ok":true,"status":"online"...}`.

### 2. Configurar o frontend

Em [`js/app.js`](js/app.js), cole a URL no campo `APPS_SCRIPT_URL`:

```js
const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/SEU_ID/exec'
};
```

### 3. Publicar no GitHub Pages

```bash
git init
git add .
git commit -m "App financeiro estático"
git branch -M main
git remote add origin https://github.com/narcisovasconcellos-cloud/financeiro-bot.git
git push -u origin main
```

No GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**.
Em ~1 minuto o app fica disponível em:

```
https://narcisovasconcellos-cloud.github.io/financeiro-bot/
```

### 4. Usar no celular

Abra o link, toque em **Compartilhar → Adicionar à Tela de Início**. Funciona como um app.

---

## 🧱 Estrutura da linha gravada (colunas A→L)

```
ID | Data | Quem | Tipo | Categoria | Descrição | Valor | Parcela Nº | Total Parcelas | Valor Total | Fixa? | Observação
```

---

## 🔒 Senha de acesso

O app abre com uma **tela de bloqueio**. A senha é definida em `const SENHA` no
[`apps-script/Codigo.gs`](apps-script/Codigo.gs) — ela fica **só no backend**, nunca no JS público.

- O navegador guarda a senha (localStorage), então cada pessoa digita só uma vez por aparelho.
- O backend valida a senha em **todo** envio: sem ela, não grava nada na planilha.
- Para trocar a senha: altere `const SENHA` no Apps Script e **reimplante** (Implantar → Gerenciar
  implantações → editar → Nova versão). Quem já estava logado precisará entrar de novo.

## ⚠️ Notas

- A URL do Apps Script fica visível no JS. Com a senha ativa, quem tiver só o link **não**
  consegue gravar (precisa da senha). Mesmo sem senha, ninguém consegue ler nem apagar dados.
- Para alterar categorias, edite os arrays `CATS_DESPESA` / `CATS_RECEITA` em `js/app.js`.
