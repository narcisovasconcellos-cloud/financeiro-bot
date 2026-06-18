# CLAUDE.md — Controle Financeiro do Casal

## Visão Geral do Projeto

Sistema de controle financeiro para casais com interface web acessível pelo celular e PC. O casal registra receitas, despesas, parcelamentos e contas fixas por um formulário web simples, que alimenta automaticamente uma planilha Google Sheets com dashboard.

---

## Decisões do Projeto

| Decisão | Escolha | Motivo |
|---|---|---|
| Interface | App web (PWA) | WhatsApp descartado por risco de banimento do Baileys |
| Planilha | Google Sheets | Gratuito, familiar, API robusta |
| Hospedagem | Railway | Fácil deploy via GitHub, gratuito para uso leve |
| Autenticação Google | Service Account | Acesso programático sem OAuth do usuário |
| Idioma | Português PT-BR | Preferência do casal |
| Notificações | Não implementado (v1) | Fora do escopo inicial |
| IA / NLP | Removido da v1 | Interface estruturada elimina necessidade |

---

## Stack Técnica (Atual)

| Componente | Tecnologia |
|---|---|
| Frontend | HTML + CSS + JS (vanilla) |
| Backend | Node.js + Express |
| Planilha | Google Sheets API v4 |
| Hospedagem | Railway |
| Repositório | GitHub (narcisovasconcellos-cloud/financeiro-bot) |

---

## Arquitetura

```
[Celular / PC]
  Narciso ou Bruna abre o link do app
  Preenche o formulário (tipo, valor, categoria, descrição...)
  Clica em "Registrar"
        ↓
[Express — Node.js no Railway]
  POST /api/lancamento
  Recebe os dados do formulário
  Chama Google Sheets API
        ↓
[Google Sheets]
  Insere nova linha na aba "📋 Lançamentos"
  Fórmulas atualizam automaticamente:
  → Resumo Mensal
  → Contas Fixas
  → Parcelamentos
  → Dashboard
```

---

## Estrutura do Repositório

```
financeiro-bot/
├── src/
│   ├── web/
│   │   ├── index.html        ← Interface do formulário (frontend)
│   │   └── server.js         ← Servidor Express + API /api/lancamento
│   ├── sheets/
│   │   └── client.js         ← Autenticação Google Sheets API
│   ├── bot/                  ← Código WhatsApp (inativo, mantido para referência)
│   ├── ai/                   ← Parser Claude API (inativo)
│   └── utils/                ← Formatters e categorias
├── .env.example
├── .gitignore
├── package.json
├── railway.json
├── README.md
└── CLAUDE.md                 ← Este arquivo
```

---

## Formulário Web — Campos

| Campo | Tipo | Obrigatório |
|---|---|---|
| Quem | Chip (Narciso / Bruna) | Sim |
| Tipo | Tab (Despesa / Receita) | Sim |
| Valor | Numérico | Sim |
| Categoria | Select | Sim |
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

---

## Planilha Google Sheets

**ID:** `1QE7R_i9NvSOWZC4jfHQOda1sm4WUMKR5f-JN5ppkrQI`

**Abas:**
- `📋 Lançamentos` — todos os registros (bot insere aqui, linha 4 em diante)
- `📊 Resumo Mensal` — receitas, despesas, saldo e breakdown por categoria
- `📌 Contas Fixas` — recorrências mensais
- `💳 Parcelamentos` — compras parceladas em aberto
- `🏠 Dashboard` — KPIs e gráficos
- `⚙️ Configurações` — categorias e membros

**Estrutura da linha de lançamento (colunas A→L):**
```
ID | Data | Quem | Tipo | Categoria | Descrição | Valor | Parcela Nº | Total Parcelas | Valor Total | Fixa? | Observação
```

---

## Variáveis de Ambiente (Railway)

| Variável | Descrição |
|---|---|
| `GOOGLE_SHEET_ID` | ID da planilha Google Sheets |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | E-mail da Service Account |
| `GOOGLE_PRIVATE_KEY` | Chave privada da Service Account |
| `ANTHROPIC_API_KEY` | Chave API Claude (reservado para v2) |
| `COUPLE_PHONE_A` | Número Narciso (reservado para v2 WhatsApp) |
| `COUPLE_PHONE_B` | Número Bruna (reservado para v2 WhatsApp) |
| `COUPLE_NAME_A` | Narciso |
| `COUPLE_NAME_B` | Bruna |
| `NODE_ENV` | production |

---

## Credenciais e Serviços

| Serviço | Conta | Observação |
|---|---|---|
| Google Cloud | narcisovasconcellos | Projeto: Financeiro-Casal (financeiro-casal-493613) |
| Service Account | finance-bot@financeiro-casal-493613.iam.gserviceaccount.com | Editor na planilha |
| Railway | narcisovasconcellos-cloud | Projeto: responsible-cooperation / production |
| GitHub | narcisovasconcellos-cloud | Repo: financeiro-bot (privado) |
| Anthropic Console | narcisovasconcellos | Chave: financeiro-bot |

---

## Como Fazer Deploy

1. Faça push no GitHub (branch `main`)
2. Railway detecta automaticamente e faz deploy
3. URL pública disponível nas configurações do serviço no Railway

---

## Como Usar o App

1. Acesse a URL do Railway no celular
2. Salve como atalho na tela inicial (funciona como app)
3. Selecione Despesa ou Receita
4. Selecione quem está registrando
5. Preencha valor, categoria e descrição
6. Ative toggles se for conta fixa ou parcelada
7. Confirme a data (default: hoje)
8. Clique em "Registrar"

---

## Histórico de Versões

| Versão | Data | O que mudou |
|---|---|---|
| v0.1 | Mai/2026 | Planejamento inicial, CLAUDE.md criado |
| v0.2 | Mai/2026 | Planilha Google Sheets criada com todas as abas |
| v0.3 | Mai/2026 | Código WhatsApp (Baileys) desenvolvido e testado |
| v0.4 | Mai/2026 | WhatsApp descartado (banimento), migração para interface web |
| v1.0 | Mai/2026 | Interface web + API Express + integração Google Sheets |

---

## Próximas Melhorias (v2)

- [ ] Página de resumo/extrato dentro do app
- [ ] Filtro por mês no extrato
- [ ] Editar e apagar lançamentos pelo app
- [ ] Notificações de contas a vencer
- [ ] Gráficos no próprio app (sem precisar abrir o Sheets)
- [ ] PWA completo (ícone, offline, notificações push)
- [ ] Retomar WhatsApp quando tiver número estável

---

*Última atualização: Mai/2026 — v1.0 interface web*
