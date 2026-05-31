"""
成本工具函数
"""

from typing import TypedDict


class TokenCount(TypedDict):
    input: int
    output: int


class CostInfo(TypedDict):
    totalTokens: int
    inputTokens: int
    outputTokens: int
    estimatedCost: float
    currency: str


def estimate_tokens(text: str) -> int:
    """粗略估算 Token 数"""
    return max(1, int(len(text) / 2.5))


def calculate_cost(input_text: str, output_text: str, rate_per_1k: float = 0.001) -> CostInfo:
    """计算成本和 Token 用量"""
    input_tokens = estimate_tokens(input_text)
    output_tokens = estimate_tokens(output_text)
    total_tokens = input_tokens + output_tokens
    cost = total_tokens / 1000 * rate_per_1k

    return {
        "totalTokens": total_tokens,
        "inputTokens": input_tokens,
        "outputTokens": output_tokens,
        "estimatedCost": round(cost, 6),
        "currency": "CNY",
    }


def format_cost(cost_info: CostInfo) -> str:
    """格式化成本信息"""
    return (
        f"Token: {cost_info['totalTokens']} "
        f"(输入 {cost_info['inputTokens']} / 输出 {cost_info['outputTokens']}) | "
        f"费用: ¥{cost_info['estimatedCost']:.6f}"
    )