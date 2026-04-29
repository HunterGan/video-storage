import { createLogger as winstonCreateLogger, format, transports } from 'winston';

export function createLogger(context: string) {
  return winstonCreateLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.printf(({ timestamp, level, message, context }) => {
        return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
      }),
    ),
    transports: [new transports.Console()],
  });
}
