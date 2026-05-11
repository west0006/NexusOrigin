// ─── server/token-service/internal/service/token_counter.go
package service

import (
	"fmt"
	"time"

	"github.com/shrimptank/token-service/internal/model"
	"github.com/shrimptank/token-service/internal/repository"
	"github.com/google/uuid"
)

type TokenCounter struct {
	repo      *repository.TokenRepository
	costCalc  *CostCalculator
	budgetMgr *BudgetManager
}

func NewTokenCounter(repo *repository.TokenRepository, costCalc *CostCalculator, budgetMgr *BudgetManager) *TokenCounter {
	return &TokenCounter{repo: repo, costCalc: costCalc, budgetMgr: budgetMgr}
}

type UsageRecordRequest struct {
	UserID       string `json:"userId" binding:"required"`
	ModelName    string `json:"modelName" binding:"required"`
	InputTokens  int    `json:"inputTokens" binding:"required"`
	OutputTokens int    `json:"outputTokens" binding:"required"`
	SkillID      string `json:"skillId,omitempty"`
}

func (s *TokenCounter) RecordUsage(req UsageRecordRequest) (*model.TokenUsage, error) {
	cost := s.costCalc.Calculate(req.ModelName, req.InputTokens, req.OutputTokens)

	usage := &model.TokenUsage{
		ID:           uuid.New().String(),
		UserID:       req.UserID,
		ModelName:    req.ModelName,
		InputTokens:  req.InputTokens,
		OutputTokens: req.OutputTokens,
		CostUSD:      cost,
		SkillID:      req.SkillID,
		CreatedAt:    time.Now(),
	}

	if err := s.repo.SaveRecord(usage); err != nil {
		return nil, fmt.Errorf("failed to save token usage: %w", err)
	}

	// 异步检查预算（不阻塞请求）
	go s.budgetMgr.CheckBudget(req.UserID, cost)

	return usage, nil
}

func (s *TokenCounter) GetUserUsage(userID string) (tokens int64, cost float64, err error) {
	return s.repo.GetUserUsage(userID)
}

func (s *TokenCounter) GetUserUsageByPeriod(userID string, period string) ([]map[string]interface{}, error) {
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
	return s.repo.GetUserUsageByPeriod(userID, startTime)
}