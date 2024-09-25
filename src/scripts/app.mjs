import express from 'express';
import cors from 'cors';
import logger from './logger.mjs';
import DBManagerClass from './DBManager.mjs';  // Cambiar el nombre para distinguir la clase
import config from '../config/config.json' assert { type: 'json' };

// Crear la aplicación Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Validar límite máximo de registros por página
const maxPageSize = config.maxPageSize || 100;

// Crear una instancia de DBManager
const DBManager = new DBManagerClass(config.databasePath);

// Ruta para obtener todos los concursos con paginación
app.get('/concursos', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Validar que el límite no exceda el valor máximo configurado
        if (limit > maxPageSize) {
            return res.status(400).json({ error: `El límite máximo permitido es ${maxPageSize}` });
        }

        // Conectar a la base de datos antes de hacer la consulta
        await DBManager.connect();

        const offset = (page - 1) * limit;
        const results = await DBManager.getConcursos(limit, offset);
        
        res.json(results);
    } catch (error) {
        logger.error(`Error al obtener los concursos: ${error.message}`);
        res.status(500).json({ error: 'Error al obtener los concursos' });
    } finally {
        // Solo cerrar la conexión si está abierta
        if (DBManager.db) {
            await DBManager.close();
        }
    }
});

// Ruta para obtener combinaciones más frecuentes
app.get('/combinaciones', async (req, res) => {
    try {
        const k = parseInt(req.query.k) || 1;

        // Validar que el valor de k esté dentro del rango permitido
        if (k < 1 || k > 6) {
            return res.status(400).json({ error: 'El valor de k debe estar entre 1 y 6' });
        }

        // Conectar a la base de datos antes de hacer la consulta
        await DBManager.connect();

        // Obtener las combinaciones más frecuentes
        const combinaciones = await DBManager.getFrequentCombinations(k);
        res.json(combinaciones);
    } catch (error) {
        logger.error(`Error al obtener las combinaciones más frecuentes: ${error.message}`);
        res.status(500).json({ error: 'Error al obtener las combinaciones' });
    } finally {
        // Solo cerrar la conexión si está abierta
        if (DBManager.db) {
            await DBManager.close();
        }
    }
});

app.get('/total-concursos', async (req, res) => {
    try {
        // Conectar a la base de datos antes de hacer la consulta
        await DBManager.connect();

        // Realizar la consulta para obtener el número total de concursos
        const result = await DBManager.get('SELECT COUNT(*) AS total FROM Concursos');
        res.json({ total: result.total });
    } catch (error) {
        logger.error("Error fetching total concursos:", error);
        res.status(500).json({ error: 'Error fetching total concursos' });
    } finally {
        // Solo cerrar la conexión si está abierta
        if (DBManager.db) {
            await DBManager.close();
        }
    }
});

app.post('/buscar-combinacion', async (req, res) => {
    const { numeros } = req.body;
  
    try {
      const query = `SELECT COUNT(*) AS frecuencia FROM Concursos WHERE NPRODUCTO IN (${numeros.join(',')})`;
      const result = await DBManager.get(query);
  
      res.json({ existe: result.frecuencia > 0, frecuencia: result.frecuencia });
    } catch (error) {
      logger.error('Error al buscar la combinación:', error);
      res.status(500).json({ error: 'Error al buscar la combinación.' });
    } finally {
      // Solo cerrar la conexión si está abierta
      if (DBManager.db) {
        await DBManager.close();
    }
    }
  });
  

export default app;
