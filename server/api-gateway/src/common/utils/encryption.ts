// server/api-gateway/src/common/utils/encryption.ts
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length < 16) {
        throw new Error('ENCRYPTION_KEY environment variable is required (min 16 chars)');
    }
    return crypto.createHash('sha256').update(key).digest();
}

/** 加密文本，返回格式：iv:encryptedHex */
export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
}

/** 解密存储的密文（格式：iv:encryptedHex） */
export function decrypt(stored: string): string {
    const [ivHex, encrypted] = stored.split(':');
    if (!ivHex || !encrypted) {
        throw new Error('Invalid encrypted format');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}