// electron/logger.ts
import winston from 'winston'
import * as path from 'path'
import { app } from 'electron'

const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] : ${message}`
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`
  }
  return msg
})

const createLogger = (): winston.Logger => {
  const logsDir = path.join(app.getPath('userData'), 'logs')

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
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5242880,
        maxFiles: 5
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize: 5242880,
        maxFiles: 5
      })
    ]
  })
}

export const logger = createLogger()

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        customFormat
      )
    })
  )
}

export const logInfo = (message: string, meta?: Record<string, unknown>): void => {
  logger.info(message, meta)
}

export const logError = (
  message: string,
  error?: unknown,
  meta?: Record<string, unknown>
): void => {
  logger.error(message, {
    ...meta,
    error: error instanceof Error ? error.message : String(error ?? ''),
    stack: error instanceof Error ? error.stack : undefined
  })
}

export const logWarning = (message: string, meta?: Record<string, unknown>): void => {
  logger.warn(message, meta)
}

export const logDebug = (message: string, meta?: Record<string, unknown>): void => {
  logger.debug(message, meta)
}

export const logDatabaseOperation = (
  operation: string,
  entity: string,
  userId?: number,
  meta?: Record<string, unknown>
): void => {
  logger.info(`Database: ${operation} ${entity}`, { operation, entity, userId, ...meta })
}

export const logIpcHandler = (
  handler: string,
  success: boolean,
  userId?: number,
  meta?: Record<string, unknown>
): void => {
  const level = success ? 'info' : 'error'
  logger.log(level, `IPC: ${handler}`, { handler, success, userId, ...meta })
}

export const logPerformance = (
  operation: string,
  durationMs: number,
  meta?: Record<string, unknown>
): void => {
  const level = durationMs > 1000 ? 'warn' : 'debug'
  logger.log(level, `Performance: ${operation} took ${durationMs}ms`, {
    operation,
    durationMs,
    ...meta
  })
}

export default logger
