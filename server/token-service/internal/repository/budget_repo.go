// ─── server/token-service/internal/repository/budget_repo.go
package repository

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/go-redis/redis/v8"
)

type BudgetRepository struct {
	rdb *redis.Client
}

func NewRedisClient(addr, password string, db int) (*redis.Client, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, err
	}
	return rdb, nil
}

func NewBudgetRepository(rdb *redis.Client) *BudgetRepository {
	return &BudgetRepository{rdb: rdb}
}

func (r *BudgetRepository) GetBudget(ctx context.Context, userID string) (float64, error) {
	val, err := r.rdb.Get(ctx, budgetKey(userID)).Result()
	if err == redis.Nil {
		return 0, nil
	} else if err != nil {
		return 0, err
	}
	return strconv.ParseFloat(val, 64)
}

func (r *BudgetRepository) SetBudget(ctx context.Context, userID string, budget float64) error {
	// 设置30天过期，与月度预算匹配
	return r.rdb.Set(ctx, budgetKey(userID), budget, 30*24*time.Hour).Err()
}

// IncrementDailyUsage 增加当日使用量（用于实时预算检查）
func (r *BudgetRepository) IncrementDailyUsage(ctx context.Context, userID string, tokens int64, cost float64) error {
	today := time.Now().Format("2006-01-02")
	pipe := r.rdb.Pipeline()
	pipe.HIncrBy(ctx, "token:daily:"+today, userID+":tokens", tokens)
	pipe.HIncrByFloat(ctx, "token:daily:"+today, userID+":cost", cost)
	pipe.Expire(ctx, "token:daily:"+today, 24*time.Hour)
	_, err := pipe.Exec(ctx)
	return err
}

func budgetKey(userID string) string {
	return fmt.Sprintf("budget:monthly:%s", userID)
}