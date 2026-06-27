
export const logger = {
  info: (msg: string, meta?: any) => console.log(JSON.stringify({ level: 'INFO', msg, timestamp: new Date().toISOString(), ...meta })),
  warn: (msg: string, meta?: any) => console.warn(JSON.stringify({ level: 'WARN', msg, timestamp: new Date().toISOString(), ...meta })),
  error: (msg: string, err?: any, meta?: any) => console.error(JSON.stringify({ level: 'ERROR', msg, error: err?.message || err, timestamp: new Date().toISOString(), ...meta }))
};
