package repository

import (
	"time"

	"github.com/shrimptank/token-service/internal/model"
	"gorm.io/gorm"
)

type TokenRepository struct {
	db *gorm.DB
}

func NewTokenRepository(db *gorm.DB) *TokenRepository {
	// 自动迁移新旧两个模型，确保表结构存在
	db.AutoMigrate(&model.TokenUsage{}, &model.ResourceUsage{})
	return &TokenRepository{db: db}
}

// SaveRecord 保存旧的 TokenUsage 记录（向后兼容）
func (r *TokenRepository) SaveRecord(usage *model.TokenUsage) error {
	return r.db.Create(usage).Error
}

// SaveUsage 保存新的 ResourceUsage 记录（统一可观测性）
func (r *TokenRepository) SaveUsage(usage *model.ResourceUsage) error {
	return r.db.Create(usage).Error
}

// GetUserUsage 获取用户某类资源总消耗（成本）
func (r *TokenRepository) GetUserUsage(userID string, resourceType string) (totalCost float64, err error) {
	var result struct {
		Cost float64
	}
	query := r.db.Model(&model.ResourceUsage{}).Where("user_id = ?", userID)
	if resourceType != "" {
		query = query.Where("resource_type = ?", resourceType)
	}
	err = query.Select("SUM(cost_amount) as cost").Row().Scan(&result.Cost)
	return result.Cost, err
}

// GetUsageByPeriod 按时间段统计 ResourceUsage 成本
func (r *TokenRepository) GetUsageByPeriod(userID string, start time.Time, resourceType string) ([]map[string]interface{}, error) {
	var results []struct {
		Date time.Time
		Cost float64
	}
	query := r.db.Model(&model.ResourceUsage{}).
		Where("user_id = ? AND created_at >= ?", userID, start)
	if resourceType != "" {
		query = query.Where("resource_type = ?", resourceType)
	}
	err := query.Select("DATE(created_at) as date, SUM(cost_amount) as cost").
		Group("DATE(created_at)").Order("date DESC").Find(&results).Error
	if err != nil {
		return nil, err
	}
	var mapped []map[string]interface{}
	for _, r := range results {
		mapped = append(mapped, map[string]interface{}{
			"date": r.Date.Format("2006-01-02"),
			"cost": r.Cost,
		})
	}
	return mapped, nil
}

// GetMonthlyCost 基于 TokenUsage 计算当月总费用（用于预算检查）
func (r *TokenRepository) GetMonthlyCost(userID string, year int, month time.Month) (float64, error) {
	var cost float64
	start := time.Date(year, month, 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0)
	err := r.db.Model(&model.TokenUsage{}).
		Where("user_id = ? AND created_at >= ? AND created_at < ?", userID, start, end).
		Select("COALESCE(SUM(cost_usd), 0)").
		Row().Scan(&cost)
	return cost, err
}