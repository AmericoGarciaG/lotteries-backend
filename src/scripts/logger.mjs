import winston from 'winston';
import { readFileSync, existsSync } from 'fs';
import winstonDailyRotateFile from 'winston-daily-rotate-file';

// Ruta al archivo de configuración
const configPath = './src/config/config.json';

// Verificar si el archivo config.json existe
if (!existsSync(configPath)) {
  throw new Error(`El archivo de configuración no se encuentra en la ruta: ${configPath}`);
}

// Intentar leer el archivo config.json
let config;
try {
  config = JSON.parse(readFileSync(configPath, 'utf-8'));
} catch (error) {
  throw new Error(`Error al leer el archivo de configuración: ${error.message}`);
}

// Validar que se haya cargado correctamente el entorno y la configuración del entorno
const env = config.env || 'development';
const envConfig = config[env];

if (!envConfig) {
  throw new Error(`No se encontró la configuración para el entorno: ${env}`);
}

// Validar que los parámetros clave existan en la configuración del entorno
const requiredParams = [
  'fileLogLevel',
  'consoleLogLevel',
  'defaultLogLevel',
  'logToConsole',
  'logToFile',
  'logFilePath',
  'logFileMaxSize',
  'logFileMaxFiles'
];

requiredParams.forEach(param => {
  if (envConfig[param] === undefined) {
    throw new Error(`Falta el parámetro de configuración requerido: ${param} en el entorno ${env}`);
  }
});

// Crear los transportes de logs según el entorno
const transports = [];

// Configurar transporte para consola
if (envConfig.logToConsole) {
  transports.push(
    new winston.transports.Console({
      level: envConfig.consoleLogLevel || envConfig.defaultLogLevel,
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  );
}

// Configurar transporte para archivo con rotación
if (envConfig.logToFile) {
  transports.push(
    new winstonDailyRotateFile({
      filename: envConfig.logFilePath,
      level: envConfig.fileLogLevel || envConfig.defaultLogLevel,
      maxSize: envConfig.logFileMaxSize || '5m',  // Tamaño máximo de archivo
      maxFiles: envConfig.logFileMaxFiles || '5d', // Rotar un máximo de archivos
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
      )
    })
  );
}

// Crear el logger utilizando las configuraciones definidas
const logger = winston.createLogger({
  level: envConfig.defaultLogLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: transports
});

export default logger;
