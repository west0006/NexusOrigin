// server/api-gateway/src/common/utils/encryption.spec.ts
import { encrypt, decrypt } from './encryption';

describe('encryption utils', () => {
    beforeAll(() => {
        // Provide a test key so tests don't throw
        process.env.ENCRYPTION_KEY = 'test-key-for-unit-tests-min-16chars';
    });

    describe('encrypt', () => {
        it('should return a string different from the input', () => {
            const result = encrypt('hello');
            expect(result).not.toBe('hello');
        });

        it('should output the iv:encrypted format', () => {
            const result = encrypt('hello');
            const parts = result.split(':');
            expect(parts).toHaveLength(2);
            expect(parts[0]).toHaveLength(32); // 16 bytes hex = 32 chars
            expect(parts[1].length).toBeGreaterThan(0);
        });

        it('should produce different output for same input (random IV)', () => {
            const a = encrypt('hello');
            const b = encrypt('hello');
            expect(a).not.toBe(b);
        });

        it('should handle empty string', () => {
            const result = encrypt('');
            expect(() => decrypt(result)).not.toThrow();
        });

        it('should handle special characters', () => {
            const input = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
            const result = encrypt(input);
            expect(decrypt(result)).toBe(input);
        });

        it('should handle Chinese characters', () => {
            const input = '你好世界 测试密钥';
            const result = encrypt(input);
            expect(decrypt(result)).toBe(input);
        });

        it('should handle long strings', () => {
            const input = 'a'.repeat(10000);
            const result = encrypt(input);
            expect(decrypt(result)).toBe(input);
        });
    });

    describe('decrypt', () => {
        it('should decrypt encrypted text back to original', () => {
            const original = 'my-secret-api-key-12345';
            const encrypted = encrypt(original);
            expect(decrypt(encrypted)).toBe(original);
        });

        it('should throw on invalid format', () => {
            expect(() => decrypt('not-valid-format')).toThrow('Invalid encrypted format');
        });

        it('should throw on empty string', () => {
            expect(() => decrypt('')).toThrow('Invalid encrypted format');
        });

        it('should throw on tampered ciphertext', () => {
            const encrypted = encrypt('secret');
            const [iv, cipher] = encrypted.split(':');
            const tampered = `${iv}:${cipher.slice(0, -2)}xx`;
            expect(() => decrypt(tampered)).toThrow();
        });
    });

    describe('round-trip', () => {
        const cases = [
            'sk-abc123',
            '',
            'a',
            '日本語テスト',
            '{"key":"value"}',
        ];

        cases.forEach((input) => {
            it(`should round-trip: "${input.slice(0, 20)}"`, () => {
                expect(decrypt(encrypt(input))).toBe(input);
            });
        });
    });
});
