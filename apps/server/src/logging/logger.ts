import { pino } from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      '*.apiKey',
      '*.password',
      '*.secret',
      '*.token'
    ],
    censor: '***REDACTED***'
  },
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'SYS:HH:MM:ss'
    }
  } : undefined
});
