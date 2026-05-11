// ── server/token-service/internal/service/cost_calculator.go
package service

// PricingTable 模型定价表（单位：美元/百万Token）
var pricingTable = map[string]struct{ Input, Output float64 }{
	"gpt-4o":          {Input: 2.5, Output: 10.0},
	"gpt-4o-mini":     {Input: 0.15, Output: 0.6},
	"claude-3.5-sonnet": {Input: 3.0, Output: 15.0},
	"deepseek-v3":     {Input: 0.14, Output: 0.28},
	"glm-4.6":         {Input: 0.28, Output: 0.84},
}

type CostCalculator struct{}

func NewCostCalculator() *CostCalculator {
	return &CostCalculator{}
}

// Calculate 计算费用，若模型不在定价表中则使用默认价格
func (c *CostCalculator) Calculate(modelName string, inputTokens, outputTokens int) float64 {
	pricing, ok := pricingTable[modelName]
	if !ok {
		// 未知模型，使用保守默认值（GPT-4o 价格）
		pricing = struct{ Input, Output float64 }{Input: 2.5, Output: 10.0}
	}
	inputCost := (float64(inputTokens) / 1_000_000) * pricing.Input
	outputCost := (float64(outputTokens) / 1_000_000) * pricing.Output
	return inputCost + outputCost
}