import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import logger from './logger.mjs';
import fs from 'fs';
import csvParser from 'csv-parser';
import path from 'path';
import { combinations } from 'combinatorial-generators'; // Usaremos una librería para generar combinaciones de tamaño k

/**
 * Clase DBManager
 * Maneja todas las operaciones relacionadas con la base de datos.
 */
export default class DBManager {
    /**
     * Constructor de DBManager
     * @param {string} databasePath - Ruta de la base de datos SQLite.
     */
    constructor(databasePath) {
        this.databasePath = databasePath;
    }

    /**
     * Conecta a la base de datos.
     * @throws {Error} - Si ocurre un error al conectar a la base de datos.
     */
    async connect() {
        try {
            const dbDirectory = path.dirname(this.databasePath);

            // Verificar si el directorio de la base de datos existe, si no, crearlo
            if (!fs.existsSync(dbDirectory)) {
                fs.mkdirSync(dbDirectory, { recursive: true });
                logger.debug(`Directorio de BD creado: ${dbDirectory}`);
            }

            // Verificar si la base de datos existe
            const dbExists = fs.existsSync(this.databasePath);
            if (!dbExists) {
                logger.debug(`Base de datos no encontrada en ${this.databasePath}. Será creada automáticamente.`);
            }

            // Abrir o crear la base de datos
            this.db = await open({
                filename: this.databasePath,
                driver: sqlite3.Database
            });

            logger.info("Conexión a la base de datos establecida.");

        } catch (err) {
            logger.error(`Error al conectar a la base de datos: ${err.message}`);
            throw new Error("Failed to open database connection");
        }
    }

    /**
     * Verifica si la tabla 'Concursos' existe en la base de datos.
     * @returns {boolean} - True si la tabla existe, False en caso contrario.
     * @throws {Error} - Si ocurre un error durante la verificación.
     */
    async tableExists() {
        try {
            const result = await this.db.get(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='Concursos';"
            );
            return result !== undefined;
        } catch (err) {
            throw new Error(`Error verificando la existencia de la tabla: ${err.message}`);
        }
    }

    /**
     * Crea la tabla 'Concursos' si no existe.
     * @throws {Error} - Si ocurre un error al crear la tabla.
     */
    async createTableIfNotExists() {
        const tableExists = await this.tableExists();
        if (!tableExists) {
            const createTableQuery = `
                CREATE TABLE IF NOT EXISTS Concursos (
                    CONCURSO INTEGER PRIMARY KEY,
                    NPRODUCTO INTEGER,
                    R1 INTEGER,
                    R2 INTEGER,
                    R3 INTEGER,
                    R4 INTEGER,
                    R5 INTEGER,
                    R6 INTEGER,
                    R7 INTEGER,
                    BOLSA REAL,
                    FECHA TEXT
                );
            `;
            try {
                await this.db.run(createTableQuery);
                logger.info("Tabla 'Concursos' creada exitosamente.");
            } catch (err) {
                throw new Error(`Error creando la tabla 'Concursos': ${err.message}`);
            }
        }
    }

    /**
     * Inserta solo los registros nuevos en la tabla 'Concursos'.
     * @param {string} filePath - Ruta del archivo CSV que contiene los registros.
     * @throws {Error} - Si ocurre un error durante la inserción.
     */
    async insertNewRecordsOnly(filePath) {
        try {
            await this.db.run('BEGIN TRANSACTION');
    
            const records = [];
    
            await new Promise((resolve, reject) => {
                fs.createReadStream(filePath)
                    .pipe(csvParser())
                    .on('data', (row) => {
                        records.push(row);
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });
    
            for (const record of records) {
                const { CONCURSO } = record;
                const existingRecord = await this.get(
                    "SELECT * FROM Concursos WHERE CONCURSO = ?",
                    [CONCURSO]
                );
                if (!existingRecord) {
                    const query = `
                        INSERT INTO Concursos (CONCURSO, NPRODUCTO, R1, R2, R3, R4, R5, R6, R7, BOLSA, FECHA)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    await this.executeQuery(query, [
                        record.CONCURSO,
                        record.NPRODUCTO,
                        record.R1,
                        record.R2,
                        record.R3,
                        record.R4,
                        record.R5,
                        record.R6,
                        record.R7,
                        record.BOLSA,
                        record.FECHA
                    ]);
                }
            }
    
            await this.db.run('COMMIT');
        } catch (err) {
            await this.db.run('ROLLBACK');
            throw new Error(`Error insertando nuevos registros: ${err.message}`);
        }
    }
    

    /**
     * Elimina la tabla 'Concursos' y la vuelve a crear.
     * @throws {Error} - Si ocurre un error durante la operación.
     */
    async reloadAllData(filePath) {
        try {
            await this.db.run('BEGIN TRANSACTION');
    
            // Desactivar índices
            await this.db.run('PRAGMA foreign_keys = OFF;');
    
            // Eliminar la tabla si existe
            await this.db.run("DROP TABLE IF EXISTS Concursos");
    
            // Crear la tabla nuevamente
            await this.createTableIfNotExists();
    
            // Insertar nuevos registros desde el archivo CSV
            await this.insertNewRecordsOnly(filePath);
    
            // Reactivar índices
            await this.db.run('PRAGMA foreign_keys = ON;');
    
            await this.db.run('COMMIT');
            console.log("Tabla 'Concursos' recreada y registros insertados exitosamente.");
        } catch (err) {
            await this.db.run('ROLLBACK');
            throw new Error(`Error recargando todos los datos: ${err.message}`);
        }
    }
    
    /**
     * Ejecuta una consulta SQL.
     * @param {string} query - La consulta SQL a ejecutar.
     * @param {Array} params - Parámetros opcionales para la consulta.
     * @returns {Object} - Resultado de la ejecución.
     * @throws {Error} - Si ocurre un error al ejecutar la consulta.
     */
    async executeQuery(query, params = []) {
        try {
            return await this.db.run(query, params);
        } catch (err) {
            throw new Error(`Error ejecutando query: ${err.message}`);
        }
    }

    /**
     * Obtiene un registro de la base de datos.
     * @param {string} query - La consulta SQL para obtener el registro.
     * @param {Array} params - Parámetros opcionales para la consulta.
     * @returns {Object} - El registro obtenido de la base de datos.
     * @throws {Error} - Si ocurre un error al obtener el registro.
     */
    async get(query, params = []) {
        try {
            return await this.db.get(query, params);
        } catch (err) {
            throw new Error(`Error obteniendo datos: ${err.message}`);
        }
    }
   
    async getConcursos(limit, offset) {
        const query = `SELECT * FROM Concursos ORDER BY CONCURSO DESC LIMIT ? OFFSET ?`;
        try {
            return await this.db.all(query, [limit, offset]);
        } catch (err) {
            logger.error(`Error al obtener los concursos: ${err.message}`);
            throw new Error("Failed to retrieve concursos");
        }
    }
    
    // Implementar la función para obtener combinaciones frecuentes en DBManager.mjs
    async getFrequentCombinations(k) {
        try {
            // Obtener todos los concursos de la base de datos
            const rows = await this.db.all("SELECT R1, R2, R3, R4, R5, R6 FROM Concursos");
    
            // Diccionario para contar la frecuencia de cada combinación
            const combinationFrequency = {};
    
            // Iterar sobre cada concurso y generar combinaciones de tamaño k
            for (const row of rows) {
                const numbers = [row.R1, row.R2, row.R3, row.R4, row.R5, row.R6];
    
                // Generar todas las combinaciones de tamaño k
                for (const combo of combinations(numbers, k)) {
                    const sortedCombo = combo.sort((a, b) => a - b).join(','); // Ordenar y convertir a string para agrupar
                    combinationFrequency[sortedCombo] = (combinationFrequency[sortedCombo] || 0) + 1;
                }
            }
    
            // Convertir el diccionario en un array de combinaciones y su frecuencia
            const result = Object.entries(combinationFrequency)
                .map(([combination, frequency]) => ({ combination, frequency }))
                .sort((a, b) => b.frequency - a.frequency) // Ordenar por frecuencia descendente
                .slice(0, 20); // Limitar a las 10 combinaciones más frecuentes
    
            return result;
        } catch (err) {
            logger.error(`Error al obtener las combinaciones más frecuentes: ${err.message}`);
            throw new Error("Failed to retrieve frequent combinations");
        }
    }

    // Agregamos un nuevo método para encontrar combinaciones
    async findCombination(numeros) {
        try {
            const placeholders = Array(numeros.length).fill('(R1 = ? OR R2 = ? OR R3 = ? OR R4 = ? OR R5 = ? OR R6 = ?)').join(' AND ');
            const query = `SELECT COUNT(*) AS frecuencia FROM Concursos WHERE ${placeholders}`;
            const result = await this.db.get(query, numeros);
            return result.frecuencia;
        } catch (error) {
            logger.error(`Error al buscar combinación: ${error.message}`);
            throw new Error("Error al buscar combinación");
        }
    }
    
    // Método para verificar si la base de datos está conectada
async isConnected() {
    if (!this.db) {
        logger.warn("Conexión a la base de datos no inicializada.");
        return false;
    }
    try {
        const result = await this.db.get("SELECT 1");
        return true; // Si la consulta es exitosa, la conexión está activa
    } catch (error) {
        logger.error("Error verificando la conexión de la base de datos: " + error.message);
        return false; // Si hay un error, la conexión no está activa
    }
}
      
    /**
     * Cierra la conexión a la base de datos.
     * @throws {Error} - Si ocurre un error al cerrar la conexión.
     */
    async close() {
        if (this.db && await this.isConnected()) {
            try {
                await this.db.close();
                this.db = null; // Asegurarse de limpiar la referencia
                logger.info("Conexión a la base de datos cerrada correctamente.");
            } catch (error) {
                logger.error("Error al cerrar la base de datos: " + error.message);
            }
        } else {
            logger.warn("Intento de cerrar una conexión a la base de datos que ya está cerrada o no fue inicializada.");
        }
    }
    
}
