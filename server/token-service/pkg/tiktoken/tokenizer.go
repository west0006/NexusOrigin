package tiktoken

import (
    "github.com/pkoukk/tiktoken-go"
)

// CountTokens 使用 tiktoken 精确计算文本的 Token 数
func CountTokens(model string, text string) (int, error) {
    // 根据模型选择编码器
    encoding := "cl100k_base" // 默认 GPT-4/3.5
    switch model {
    case "gpt-4o", "gpt-4o-mini", "gpt-4", "gpt-3.5-turbo":
        encoding = "cl100k_base"
    case "text-davinci-003", "text-davinci-002":
        encoding = "p50k_base"
    default:
        encoding = "cl100k_base"
    }

    tke, err := tiktoken.GetEncoding(encoding)
    if err != nil {
        return 0, err
    }
    tokens := tke.Encode(text, nil, nil)
    return len(tokens), nil
}