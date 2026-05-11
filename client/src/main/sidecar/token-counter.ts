// ─── client/src/main/sidecar/token-counter.ts ─────────────
import { encode } from 'gpt-tokenizer';

export class TokenCounter {
    /**
     * 计算消息列表的 token 数量
     */
    countTokens(messages: any): number {
        if (typeof messages === 'string') {
            return encode(messages).length;
        }
        if (Array.isArray(messages)) {
            return messages.reduce((sum, m) => sum + encode(m.content || '').length, 0);
        }
        return 0;
    }
}