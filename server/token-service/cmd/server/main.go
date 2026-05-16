package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/shrimptank/token-service/internal/handler"
	"github.com/shrimptank/token-service/internal/repository"
	"github.com/shrimptank/token-service/internal/service"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func init() {
	godotenv.Load()
}

func main() {
	// 初始化数据库
	db, err := gorm.Open(postgres.Open(os.Getenv("DATABASE_URL")), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	// 初始化Redis
	rdb, err := repository.NewRedisClient(os.Getenv("REDIS_ADDR"), os.Getenv("REDIS_PASSWORD"), 0)
	if err != nil {
		log.Fatalf("failed to connect redis: %v", err)
	}

	// 初始化依赖
	tokenRepo := repository.NewTokenRepository(db)
	budgetRepo := repository.NewBudgetRepository(rdb)
	costCalc := service.NewCostCalculator()
	budgetMgr := service.NewBudgetManager(budgetRepo, tokenRepo, costCalc)
	tokenCounter := service.NewTokenCounter(tokenRepo, costCalc, budgetMgr, rdb)

	tokenHandler := handler.NewTokenHandler(tokenCounter)
	budgetHandler := handler.NewBudgetHandler(budgetMgr)


	// Gin 路由设置
	r := gin.Default()

	// CORS 中间件
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// 原有 Token 路由（兼容）
	api := r.Group("/api/v1/token")
	{
		api.POST("/record", tokenHandler.RecordUsage)
		api.GET("/usage/:userId", tokenHandler.GetUserUsage)
		api.GET("/usage/:userId/period", tokenHandler.GetUserUsageByPeriod)
		api.POST("/budget", budgetHandler.SetBudget)
		api.GET("/budget/:userId", budgetHandler.GetBudget)
	}

	// 新增 Telemetry 路由（统一记录入口）
	telemetry := r.Group("/api/v1/telemetry")
	{
		telemetry.POST("/record", tokenHandler.RecordUsage)
		telemetry.GET("/usage/:userId", tokenHandler.GetUserUsage)
		telemetry.GET("/usage/:userId/period", tokenHandler.GetUserUsageByPeriod)
	}

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// 启动服务器
	srv := &http.Server{
		Addr:    ":8081",
		Handler: r,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exiting")
}