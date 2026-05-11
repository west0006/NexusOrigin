// ─── server/token-service/pkg/tiktoken/tokenizer.go ──────
package tiktoken

// 提供各模型 token 估算的桩实现，生产环境应集成 tiktoken-go 等库

// EstimateTokens 粗略估计字符串的 token 数量
func EstimateTokens(text string) int {
	// 简单按字符/4 估算，这里仅作示意
	count := 0
	for _, ch := range text {
		if ch > 127 {
			count += 2 // 中文等字符约2个token
		} else {
			count++
		}
	}
	return count / 2
}