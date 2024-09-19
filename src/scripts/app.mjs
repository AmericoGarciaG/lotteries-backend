import express from 'express';
import cors from 'cors';
import logger from './logger.mjs'

// Usamos createRequire para sqlite3 (que sigue siendo CommonJS)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sqlite3 = require('sqlite3').verbose();

/*logger.silly('silly');
logger.debug('debug');
logger.verbose('verbose');
logger.http('http');
logger.warn('warn');
logger.error('error');
logger.info('Iniciando el sistema...');*/

const app = express();
const PORT = process.env.PORT || 3000;

// Habilitar CORS
app.use(cors());

// Inicializar la base de datos SQLite
const db = new sqlite3.Database('./src/db/lotteries.db');

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
