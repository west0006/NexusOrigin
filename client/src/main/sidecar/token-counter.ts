import { encode } from 'gpt-tokenizer';

export class TokenCounter {
    countTokens(input: string | any[]): number {
        if (typeof input === 'string') {
            return encode(input).length;
        }
        if (Array.isArray(input)) {
            return input.reduce((sum, msg) => sum + encode(msg.content || '').length, 0);
        }
        return 0;
    }
}