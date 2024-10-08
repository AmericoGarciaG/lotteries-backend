import express from 'express';
import cors from 'cors';
import logger from './logger.mjs';
import DBManagerClass from './DBManager.mjs'; // Cambiar el nombre para distinguir la clase
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

// Helper function to ensure database is connected
async function ensureDBConnection() {
    if (!await DBManager.isConnected()) {
        await DBManager.connect();
    }
}

// Ruta para obtener todos los concursos con paginación
app.get('/concursos', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        if (limit > maxPageSize) {
            return res.status(400).json({ error: `El límite máximo permitido es ${maxPageSize}` });
        }

        await ensureDBConnection();
        const offset = (page - 1) * limit;
        const results = await DBManager.getConcursos(limit, offset);

        res.json(results);
    } catch (error) {
        logger.error(`Error al obtener los concursos: ${error.message}`);
        res.status(500).json({ error: 'Error al obtener los concursos' });
    } finally {
        await DBManager.close();
    }
});

// Ruta para obtener combinaciones más frecuentes
app.get('/combinaciones', async (req, res) => {
    try {
        const k = parseInt(req.query.k) || 1;

        if (k < 1 || k > 6) {
            return res.status(400).json({ error: 'El valor de k debe estar entre 1 y 6' });
        }

        await ensureDBConnection();
        const combinaciones = await DBManager.getFrequentCombinations(k);

        res.json(combinaciones);
    } catch (error) {
        logger.error(`Error al obtener las combinaciones más frecuentes: ${error.message}`);
        res.status(500).json({ error: 'Error al obtener las combinaciones' });
    } finally {
        await DBManager.close();
    }
});

app.get('/total-concursos', async (req, res) => {
    try {
        await ensureDBConnection();
        const result = await DBManager.get('SELECT COUNT(*) AS total FROM Concursos');
        res.json({ total: result.total });
    } catch (error) {
        logger.error("Error fetching total concursos:", error);
        res.status(500).json({ error: 'Error fetching total concursos' });
    } finally {
        await DBManager.close();
    }
});

app.post('/buscar-combinacion', async (req, res) => {
    const { numeros } = req.body;
    try {
        await ensureDBConnection();

        // Usamos el método findCombination desde DBManager
        const frecuencia = await DBManager.findCombination(numeros);

        if (frecuencia > 0) {
            res.json({ existe: true, frecuencia });
        } else {
            res.json({ existe: false });
        }
    } catch (error) {
        logger.error('Error al buscar la combinación:', error);
        res.status(500).json({ error: 'Error al buscar la combinación.' });
    } finally {
        await DBManager.close();
    }
});

export default app;
