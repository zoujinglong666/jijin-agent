import * as winston from 'winston';
import * as path from 'path';

const { combine, timestamp, printf, colorize, json } = winston.format;

const logFormat = printf(({ level, message, timestamp: ts, context, ...meta }) => {
  const contextStr = context ? `[${context}]` : '';
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `${ts} ${level} ${contextStr} ${message} ${metaStr}`;
});

export const winstonConfig = {
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
      level: process.env.LOG_LEVEL || 'info',
    }),
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), json()),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), json()),
      maxsize: 20 * 1024 * 1024,
      maxFiles: 10,
    }),
  ],
};
