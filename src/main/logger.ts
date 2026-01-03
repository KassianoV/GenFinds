// src/main/logger.ts
import winston from 'winston';
import * as path from 'path';
import { app } from 'electron';

// Formatos customizados
const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] : ${message}`;

  // Adicionar metadata se existir
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

// Criar logger
const createLogger = () => {
  const logsDir = path.join(app.getPath('userData'), 'logs');

  return winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ),
    defaultMeta: { service: 'genfinds' },
    transports: [
      // Arquivo de erros
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),

      // Arquivo combinado (todos os níveis)
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ],
  });
};

// Criar instância do logger
export const logger = createLogger();

// Adicionar console transport apenas em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        customFormat
      ),
    })
  );
}

// Funções auxiliares para logging estruturado
export const logInfo = (message: string, meta?: Record<string, any>) => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error | any, meta?: Record<string, any>) => {
  logger.error(message, {
    ...meta,
    error: error?.message || error,
    stack: error?.stack,
  });
};

export const logWarning = (message: string, meta?: Record<string, any>) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: Record<string, any>) => {
  logger.debug(message, meta);
};

// Logger para operações de banco de dados
export const logDatabaseOperation = (
  operation: string,
  entity: string,
  userId?: number,
  meta?: Record<string, any>
) => {
  logger.info(`Database: ${operation} ${entity}`, {
    operation,
    entity,
    userId,
    ...meta,
  });
};

// Logger para IPC handlers
export const logIpcHandler = (
  handler: string,
  success: boolean,
  userId?: number,
  meta?: Record<string, any>
) => {
  const level = success ? 'info' : 'error';
  logger.log(level, `IPC: ${handler}`, {
    handler,
    success,
    userId,
    ...meta,
  });
};

// Logger para performance
export const logPerformance = (
  operation: string,
  durationMs: number,
  meta?: Record<string, any>
) => {
  const level = durationMs > 1000 ? 'warn' : 'debug';
  logger.log(level, `Performance: ${operation} took ${durationMs}ms`, {
    operation,
    durationMs,
    ...meta,
  });
};

export default logger;
