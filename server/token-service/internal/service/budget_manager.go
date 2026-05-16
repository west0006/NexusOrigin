package service

import (
    "context"
    "fmt"
    "time"

    "github.com/shrimptank/token-service/internal/repository"
)

type BudgetManager struct {
    budgetRepo *repository.BudgetRepository
    tokenRepo  *repository.TokenRepository
    costCalc   *CostCalculator
}

func NewBudgetManager(budgetRepo *repository.BudgetRepository, tokenRepo *repository.TokenRepository, costCalc *CostCalculator) *BudgetManager {
    return &BudgetManager{budgetRepo, tokenRepo, costCalc}
}

// CheckAndBlock 检查预算，若超限返回 true
func (m *BudgetManager) CheckAndBlock(ctx context.Context, userID string, newCost float64) (bool, error) {
    budget, err := m.budgetRepo.GetBudget(ctx, userID)
    if err != nil || budget <= 0 {
        return false, nil // 未设置预算或查询失败，不阻断
    }

    now := time.Now()
    used, err := m.tokenRepo.GetMonthlyCost(userID, now.Year(), now.Month())
    if err != nil {
        return false, err
    }

    if used+newCost > budget {
        return true, nil // 超预算
    }
    return false, nil
}

// SetBudget / GetBudget 保持不变
func (m *BudgetManager) SetBudget(ctx context.Context, userID string, budget float64) error {
    if budget <= 0 {
        return fmt.Errorf("monthly budget must be positive")
    }
    return m.budgetRepo.SetBudget(ctx, userID, budget)
}

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