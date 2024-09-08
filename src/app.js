const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();

const PORT = process.env.PORT || 3000;

// Inicializar la base de datos SQLite
const db = new sqlite3.Database('./db/lotteries.db');

// Endpoint para obtener los concursos
app.get('/api/concursos', (req, res) => {
  db.all('SELECT * FROM Concursos', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

