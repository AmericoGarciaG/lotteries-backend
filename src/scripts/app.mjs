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
        // Asegurarse de cerrar la conexión
        await DBManager.close();
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
        // Asegurarse de cerrar la conexión a la base de datos
        await DBManager.close();
    }
});


export default app;
