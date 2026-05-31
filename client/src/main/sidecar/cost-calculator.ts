const PRICING: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.5, output: 10.0 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'claude-3.5-sonnet': { input: 3.0, output: 15.0 },
    'deepseek-v3': { input: 0.14, output: 0.28 },
    'Qwen/Qwen3-235B-A22B': { input: 0.14, output: 0.28 },
};

export class CostCalculator {
    calculate(model: string, inputTokens: number, outputTokens: number): number {
        const price = PRICING[model] || { input: 2.5, output: 10.0 };
        return (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
    }
}