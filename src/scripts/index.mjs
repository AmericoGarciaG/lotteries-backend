import FileManager from './FileManager.mjs';
import logger from './logger.mjs';
import DBManager from './DBManager.mjs';
import fs from 'fs';
import https from 'https';

// Configurar un agente HTTPS que ignora la verificación de certificados
const agent = new https.Agent({
    rejectUnauthorized: false
});

const configPath = './src/config/config.json';


/**
 * Función para cargar el archivo de configuración config.json.
 * @returns {object} - Configuración cargada desde el archivo config.json.
 */
function loadConfig() {
    try {
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
    } catch (error) {
        logger.error(`Error al cargar el archivo de configuración: ${error.message}`);
        throw error;
    }
}

// Cargar la configuración
const config = loadConfig();

// Extraer los parámetros del archivo de configuración
const { url, saveDirectory, fileName, operationMode } = config;

// Crear instancia de FileManager y DBManager
const fileManager = new FileManager(agent);
const dbManager = new DBManager(config.databasePath);

// Usar el FileManager para descargar el archivo y manejar la base de datos
(async () => {
    try {
        logger.info('El sistema ha iniciado correctamente.');
        logger.debug('Iniciando la descarga del archivo CSV...');
        
        await fileManager.downloadFile(url, saveDirectory, fileName);
        logger.info('El archivo CSV se ha descargado exitosamente!');

        // Conectar a la base de datos
        await dbManager.connect();

        // Crear la tabla si no existe
        await dbManager.createTableIfNotExists();

        // Modo de operación
        if (operationMode === 'insertNewOnly') {
            logger.debug('Modo: insertNewOnly. Insertando solo registros nuevos.');
            await dbManager.insertNewRecordsOnly(`${saveDirectory}/${fileName}`);
        } else if (operationMode === 'reloadAll') {
            logger.debug('Modo: reloadAll. Eliminando todos los datos y recargando.');
            await dbManager.reloadAllData(`${saveDirectory}/${fileName}`);
        } else {
            logger.warn(`Modo de operación desconocido: ${operationMode}.`);
        }

        console.log('Operaciones completadas exitosamente!');
    } catch (error) {
        logger.error(`Error durante la operación: ${error.message}`);
    } finally {
        // Cerrar la conexión a la base de datos
        await dbManager.close();
    }
})();
