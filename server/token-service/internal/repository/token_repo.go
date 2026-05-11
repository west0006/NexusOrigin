// ─── server/token-service/internal/repository/token_repo.go
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
	db.AutoMigrate(&model.TokenUsage{})
	return &TokenRepository{db: db}
}

// SaveRecord 保存单条使用记录
func (r *TokenRepository) SaveRecord(usage *model.TokenUsage) error {
	return r.db.Create(usage).Error
}

// GetUserUsage 获取用户总使用量
func (r *TokenRepository) GetUserUsage(userID string) (totalTokens int64, totalCost float64, err error) {
	var result struct {
		Tokens int64
		Cost   float64
	}
	err = r.db.Model(&model.TokenUsage{}).
		Where("user_id = ?", userID).
		Select("SUM(input_tokens + output_tokens) as tokens, SUM(cost_usd) as cost").
		Row().Scan(&result.Tokens, &result.Cost)
	return result.Tokens, result.Cost, err
}

// GetUserUsageByPeriod 按时间段获取使用记录（返回每日汇总）
func (r *TokenRepository) GetUserUsageByPeriod(userID string, start time.Time) ([]map[string]interface{}, error) {
	var results []struct {
		Date   time.Time
		Tokens int64
		Cost   float64
	}
	err := r.db.Model(&model.TokenUsage{}).
		Where("user_id = ? AND created_at >= ?", userID, start).
		Select("DATE(created_at) as date, SUM(input_tokens + output_tokens) as tokens, SUM(cost_usd) as cost").
		Group("DATE(created_at)").
		Order("date DESC").
		Find(&results).Error
	if err != nil {
		return nil, err
	}

	// 转换为 map 方便 JSON 序列化
	var mapped []map[string]interface{}
	for _, r := range results {
		mapped = append(mapped, map[string]interface{}{
			"date":   r.Date.Format("2006-01-02"),
			"tokens": r.Tokens,
			"cost":   r.Cost,
		})
	}
	return mapped, nil
}

// GetMonthlyCost 获取用户当月总费用
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