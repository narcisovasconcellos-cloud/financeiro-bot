require('dotenv').config();
const express = require('express');
const path = require('path');
const { getSheetsClient, SHEET_ID } = require('../sheets/client');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const ABA = '📋 Lançamentos';

app.post('/api/lancamento', async (req, res) => {
  try {
    const { row } = req.body;
    if (!row || !Array.isArray(row)) {
      return res.json({ ok: false, error: 'Dados inválidos' });
    }

    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${ABA}!A4`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });

    console.log(`✅ Lançamento registrado: ${row[3]} - ${row[5]} - R$ ${row[6]} (${row[2]})`);
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao registrar lançamento:', err.message);
    res.json({ ok: false, error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Interface web rodando na porta ${PORT}`);
});

module.exports = app;
