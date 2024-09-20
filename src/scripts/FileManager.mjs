import logger from './logger.mjs';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import https from 'https';
import { exit } from 'process';

/**
 * Clase FileManager
 * 
 * Maneja todas las operaciones relacionadas con archivos, incluyendo la descarga, guardado,
 * y lectura de archivos. Esta clase está diseñada para ser modular y reutilizable en otros
 * proyectos que requieran operaciones con archivos.
 */
export default class FileManager {

    /**
     * Constructor de la clase FileManager
     * 
     * @param {https.Agent} agent - Un agente HTTPS personalizado que se usará para ignorar la verificación de certificados SSL.
     * 
     * Este constructor permite la configuración de un agente HTTPS que se utilizará en todas las solicitudes de red realizadas por esta clase. 
     * Si no se proporciona un agente, se utiliza uno por defecto que ignora la verificación de certificados SSL.
     */
    constructor(agent = new https.Agent({ rejectUnauthorized: false })) {
        this.agent = agent;
    }

    /**
     * Descarga un archivo desde una URL específica y lo guarda en el directorio indicado.
     * 
     * @param {string} url - La URL desde donde se descargará el archivo.
     * @param {string} directory - El directorio donde se guardará el archivo.
     * @param {string} fileName - El nombre con el que se guardará el archivo.
     * 
     * @throws {Error} Lanzará un error si la descarga falla o si ocurre algún problema
     * durante el guardado del archivo.
     * 
     * Este método maneja todo el proceso de descarga de un archivo desde una URL dada, asegurándose de que el archivo se guarde en un directorio
     * específico con el nombre proporcionado. Se utiliza un agente HTTPS personalizado para manejar situaciones en las que es necesario ignorar
     * la verificación de certificados SSL.
     */
    async downloadFile(url, directory, fileName) {
        try {
            // Aseguramos que el directorio exista, si no, lo creamos
            if (!fs.existsSync(directory)) {
                fs.mkdirSync(directory, { recursive: true });
            }

            // Obtenemos el archivo desde la URL
            const response = await fetch(url, { agent: this.agent }); // Usar el agente HTTPS personalizado
            if (!response.ok) {
                throw new Error(`Error en la función fetch de descarga: ${response.statusText}`);
            }

            // Creamos el stream para escribir el archivo
            const fileStream = fs.createWriteStream(path.join(directory, fileName));
            await new Promise((resolve, reject) => {
                response.body.pipe(fileStream);
                response.body.on('error', (err) => {
                    reject(err);
                });
                fileStream.on('finish', resolve);
            });

            logger.info(`Archivo CSV guardado como ${fileName} en ${directory}`);
        } catch (error) {
            console.error(`Error en el método downloadFile: ${error.message}`);
            throw error;
        }
    }

    /**
     * Verifica si un archivo existe en un directorio específico.
     * 
     * @param {string} directory - El directorio donde se encuentra el archivo.
     * @param {string} fileName - El nombre del archivo a verificar.
     * @returns {boolean} Retorna true si el archivo existe, false en caso contrario.
     * 
     * Este método es utilizado para verificar la existencia de un archivo en un directorio dado.
     * Es útil para evitar sobrescrituras innecesarias o para asegurarse de que un archivo necesario está disponible antes de realizar operaciones.
     */
    fileExists(directory, fileName) {
        return fs.existsSync(path.join(directory, fileName));
    }
}
