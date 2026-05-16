package service

import (
	"context"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/shrimptank/token-service/internal/model"
	"github.com/shrimptank/token-service/internal/repository"
	"github.com/shrimptank/token-service/pkg/tiktoken"
	"github.com/google/uuid"
)

type TokenCounter struct {
	repo      *repository.TokenRepository
	costCalc  *CostCalculator
	budgetMgr *BudgetManager
	rdb       *redis.Client
}

func NewTokenCounter(repo *repository.TokenRepository, costCalc *CostCalculator, budgetMgr *BudgetManager, rdb *redis.Client) *TokenCounter {
	return &TokenCounter{
		repo:      repo,
		costCalc:  costCalc,
		budgetMgr: budgetMgr,
		rdb:       rdb,
	}
}

type UsageRecordRequest struct {
	UserID       string `json:"userId" binding:"required"`
	ResourceType string `json:"resourceType" binding:"required"`
	ModelName    string `json:"modelName,omitempty"`
	InputTokens  int    `json:"inputTokens,omitempty"`
	OutputTokens int    `json:"outputTokens,omitempty"`
	InputText    string `json:"inputText,omitempty"`
	OutputText   string `json:"outputText,omitempty"`
	ToolName     string `json:"toolName,omitempty"`
	DurationMs   int64  `json:"durationMs,omitempty"`
	SkillID      string `json:"skillId,omitempty"`
}

func (s *TokenCounter) RecordUsage(req UsageRecordRequest) (*model.ResourceUsage, error) {
	// 若未提供 Token 数，则通过 tiktoken 估算
	if req.InputTokens == 0 && req.InputText != "" {
		count, err := tiktoken.CountTokens(req.ModelName, req.InputText)
		if err == nil {
			req.InputTokens = count
		}
	}
	if req.OutputTokens == 0 && req.OutputText != "" {
		count, err := tiktoken.CountTokens(req.ModelName, req.OutputText)
		if err == nil {
			req.OutputTokens = count
		}
	}

	// 计算成本
	cost := s.costCalc.Calculate(req)

	// 预算熔断检查
	ctx := context.Background()
	if blocked, err := s.budgetMgr.CheckAndBlock(ctx, req.UserID, cost); err != nil {
		return nil, fmt.Errorf("budget check failed: %w", err)
	} else if blocked {
		return nil, fmt.Errorf("monthly budget exceeded")
	}

	// 保存记录
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

	// 自动校准（异步）
	go s.calibrate(req.ModelName, req.InputTokens, req.OutputTokens, cost)

	return usage, nil
}

func (s *TokenCounter) calibrate(modelName string, estimatedInput, estimatedOutput int, cost float64) {
	ctx := context.Background()
	s.rdb.HIncrByFloat(ctx, "token:calibration:"+modelName, "total_estimated_input", float64(estimatedInput))
	s.rdb.HIncrByFloat(ctx, "token:calibration:"+modelName, "total_estimated_output", float64(estimatedOutput))
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