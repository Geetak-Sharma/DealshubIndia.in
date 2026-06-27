
import { AppError } from '../errors';

export const logger = {
  info: (msg: string, meta?: any) => console.log(JSON.stringify({ level: 'INFO', msg, timestamp: new Date().toISOString(), ...meta })),
  warn: (msg: string, meta?: any) => console.warn(JSON.stringify({ level: 'WARN', msg, timestamp: new Date().toISOString(), ...meta })),
  error: (msg: string, err?: any, meta?: any) => {
    const errorDetails = err instanceof AppError ? { type: err.type, meta: err.metadata } : { message: err?.message || err };
    console.error(JSON.stringify({ level: 'ERROR', msg, error: errorDetails, timestamp: new Date().toISOString(), ...meta }));
  },
  metric: (name: string, value: number, tags?: Record<string, string>) => {
    console.log(JSON.stringify({ type: 'METRIC', name, value, tags, timestamp: new Date().toISOString() }));
  }
};
