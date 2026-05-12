package service

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/shrimptank/token-service/internal/repository"
)

type BudgetManager struct {
	budgetRepo *repository.BudgetRepository
	tokenRepo  *repository.TokenRepository
	costCalc   *CostCalculator
}

func NewBudgetManager(budgetRepo *repository.BudgetRepository, tokenRepo *repository.TokenRepository, costCalc *CostCalculator) *BudgetManager {
	return &BudgetManager{
		budgetRepo: budgetRepo,
		tokenRepo:  tokenRepo,
		costCalc:   costCalc,
	}
}

// SetBudget 设置用户月度预算
func (m *BudgetManager) SetBudget(ctx context.Context, userID string, budget float64) error {
	if budget <= 0 {
		return fmt.Errorf("monthly budget must be positive")
	}
	return m.budgetRepo.SetBudget(ctx, userID, budget)
}

// GetBudget 获取用户预算及当月使用情况
func (m *BudgetManager) GetBudget(ctx context.Context, userID string) (budget, used, remaining float64, usageRate float64, err error) {
	budget, err = m.budgetRepo.GetBudget(ctx, userID)
	if err != nil {
		return 0, 0, 0, 0, err
	}
	now := time.Now()
	used, err = m.tokenRepo.GetMonthlyCost(userID, now.Year(), now.Month())
	if err != nil {
		return 0, 0, 0, 0, err
	}
	remaining = budget - used
	if budget > 0 {
		usageRate = used / budget * 100
	}
	return
}

// CheckBudget 异步检查预算并告警
func (m *BudgetManager) CheckBudget(userID string, newCost float64) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	budget, err := m.budgetRepo.GetBudget(ctx, userID)
	if err != nil || budget == 0 {
		return
	}

	now := time.Now()
	used, err := m.tokenRepo.GetMonthlyCost(userID, now.Year(), now.Month())
	if err != nil {
		return
	}

	usageRate := (used + newCost) / budget * 100
	if usageRate >= 95 {
		log.Printf("Budget warning for user %s: %.2f%% used ($%.2f remaining)", userID, usageRate, budget-(used+newCost))
	}
}