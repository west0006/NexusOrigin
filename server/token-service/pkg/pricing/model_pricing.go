// ─── server/token-service/pkg/pricing/model_pricing.go ────
package pricing

var ModelPricing = map[string]struct{ Input, Output float64 }{
	"gpt-4o":          {2.5, 10.0},
	"gpt-4o-mini":     {0.15, 0.6},
	"claude-3.5-sonnet": {3.0, 15.0},
	"deepseek-v3":     {0.14, 0.28},
}

// GetPrice 返回模型定价，若不存在则返回默认值
func GetPrice(model string) (input, output float64) {
	if p, ok := ModelPricing[model]; ok {
		return p.Input, p.Output
	}
	return 2.5, 10.0
}