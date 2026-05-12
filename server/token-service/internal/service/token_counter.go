package service

import (
    "fmt"
    "time"

    "github.com/shrimptank/token-service/internal/model"
    "github.com/shrimptank/token-service/internal/repository"
    "github.com/google/uuid"
)

type UsageRecordRequest struct {
    UserID       string  `json:"userId" binding:"required"`
    ResourceType string  `json:"resourceType" binding:"required"` // "llm-call", "mcp-tool", "a2a-task"
    ModelName    string  `json:"modelName,omitempty"`
    InputTokens  int     `json:"inputTokens,omitempty"`
    OutputTokens int     `json:"outputTokens,omitempty"`
    ToolName     string  `json:"toolName,omitempty"`
    DurationMs   int64   `json:"durationMs,omitempty"`
    SkillID      string  `json:"skillId,omitempty"`
}

type TokenCounter struct {
    repo      *repository.TokenRepository
    costCalc  *CostCalculator
    // 注：budgetMgr 可继续保留，但略作扩展以适应多种资源
}

func NewTokenCounter(repo *repository.TokenRepository, costCalc *CostCalculator) *TokenCounter {
    return &TokenCounter{repo: repo, costCalc: costCalc}
}

func (s *TokenCounter) RecordUsage(req UsageRecordRequest) (*model.ResourceUsage, error) {
    cost := s.costCalc.Calculate(req)
    usage := &model.ResourceUsage{
        ID:           uuid.New().String(),
        UserID:       req.UserID,
        ResourceType: req.ResourceType,
        ModelName:    req.ModelName,
        InputTokens:  req.InputTokens,
        OutputTokens: req.OutputTokens,
        ToolName:     req.ToolName,
        DurationMs:   req.DurationMs,
        CostAmount:   cost,
        SkillID:      req.SkillID,
        CreatedAt:    time.Now(),
    }
    if err := s.repo.SaveUsage(usage); err != nil {
        return nil, fmt.Errorf("failed to save usage: %w", err)
    }
    // 预算检查略（保留原有逻辑，可扩展为信用点预算）
    return usage, nil
}

func (s *TokenCounter) GetUserUsage(userID string, resourceType string) (float64, error) {
    return s.repo.GetUserUsage(userID, resourceType)
}

func (s *TokenCounter) GetUserUsageByPeriod(userID string, period string, resourceType string) ([]map[string]interface{}, error) {
    var startTime time.Time
    now := time.Now()
    switch period {
    case "day":
        startTime = now.AddDate(0, 0, -1)
    case "week":
        startTime = now.AddDate(0, 0, -7)
    case "month":
        startTime = now.AddDate(0, -1, 0)
    default:
        startTime = now.AddDate(0, 0, -1)
    }
    return s.repo.GetUsageByPeriod(userID, startTime, resourceType)
}