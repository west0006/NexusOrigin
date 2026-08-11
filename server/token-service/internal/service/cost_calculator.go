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

// Calculate 根据记录类型计算成本（单位：信用点或美元）
func (c *CostCalculator) Calculate(req UsageRecordRequest) float64 {
    switch req.ResourceType {
    case "llm-call":
        return c.calcLLMCost(req.ModelName, req.InputTokens, req.OutputTokens)
    case "mcp-tool":
        return c.calcMCPCost(req.ToolName, req.DurationMs)
    case "a2a-task":
        return c.calcA2ACost(req.DurationMs)
    default:
        return 0
    }
}

func (c *CostCalculator) calcLLMCost(model string, inputTokens, outputTokens int) float64 {
	price, ok := pricingTable[model]
	if !ok {
		// Unknown model — fall back to a conservative default
		price = struct{ Input, Output float64 }{Input: 2.5, Output: 10.0}
	}
	inputCost := float64(inputTokens) / 1_000_000 * price.Input
	outputCost := float64(outputTokens) / 1_000_000 * price.Output
	return inputCost + outputCost
}

func (c *CostCalculator) calcMCPCost(toolName string, durationMs int64) float64 {
    // 简单按调用次数+时长计费，将来可扩展
    base := 0.01 // 每次调用基础信用点
    durationCost := float64(durationMs) * 0.00001
    return base + durationCost
}

func (c *CostCalculator) calcA2ACost(durationMs int64) float64 {
    // A2A 任务按执行时长计费
    return float64(durationMs) * 0.00005
}