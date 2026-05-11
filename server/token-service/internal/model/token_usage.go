// ─── server/token-service/internal/model/token_usage.go ───
package model

import "time"

type TokenUsage struct {
	ID           string    `gorm:"primaryKey" json:"id"`
	UserID       string    `gorm:"index" json:"userId"`
	ModelName    string    `json:"modelName"`
	InputTokens  int       `json:"inputTokens"`
	OutputTokens int       `json:"outputTokens"`
	CostUSD      float64   `json:"costUsd"`
	SkillID      string    `json:"skillId,omitempty"`
	Protocol     string    `gorm:"default:llm-call" json:"protocol"`
	CreatedAt    time.Time `json:"createdAt"`
}