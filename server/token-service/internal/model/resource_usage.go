package model

import "time"

type ResourceUsage struct {
    ID           string    `gorm:"primaryKey" json:"id"`
    UserID       string    `gorm:"index" json:"userId"`
    ResourceType string    `json:"resourceType"` // "llm-call", "mcp-tool", "a2a-task", "vector-query"
    ModelName    string    `json:"modelName,omitempty"`
    InputTokens  int       `json:"inputTokens,omitempty"`
    OutputTokens int       `json:"outputTokens,omitempty"`
    ToolName     string    `json:"toolName,omitempty"`
    DurationMs   int64     `json:"durationMs,omitempty"`
    CostAmount   float64   `json:"costAmount"`      // 统一的成本（信用点或美元）
    SkillID      string    `json:"skillId,omitempty"`
    CreatedAt    time.Time `json:"createdAt"`
}