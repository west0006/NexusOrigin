// ─── client/src/main/utils/logger.ts ──────────────────────
import { app } from 'electron';
import { join } from 'path';
import { createWriteStream } from 'fs';

const logPath = join(app.getPath('logs'), 'shrimp.log');
const stream = createWriteStream(logPath, { flags: 'a' });

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

function now(): string {
    return new Date().toISOString();
}

export const logger = {
    debug(msg: string, ...args: unknown[]) {
        stream.write(`[${now()}] DEBUG ${msg} ${JSON.stringify(args)}\n`);
    },
    info(msg: string, ...args: unknown[]) {
        stream.write(`[${now()}] INFO ${msg} ${JSON.stringify(args)}\n`);
    },
    warn(msg: string, ...args: unknown[]) {
        stream.write(`[${now()}] WARN ${msg} ${JSON.stringify(args)}\n`);
    },
    error(msg: string, ...args: unknown[]) {
        stream.write(`[${now()}] ERROR ${msg} ${JSON.stringify(args)}\n`);
    },
};