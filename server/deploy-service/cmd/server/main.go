// ─── server/deploy-service/cmd/server/main.go ─────────────
package main

import (
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	"context"

	"github.com/gin-gonic/gin"
	"github.com/shrimptank/deploy-service/internal/handler"
)

func main() {
	deployHandler := handler.NewDeployHandler()

	r := gin.Default()
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
	api := r.Group("/api/v1/deploy")
	{
	api.GET("/env", deployHandler.CheckEnv)
		api.POST("/:framework/install", deployHandler.Install)
		api.POST("/:framework/start", deployHandler.Start)
		api.POST("/:framework/stop", deployHandler.Stop)
		api.GET("/:framework/status", deployHandler.GetStatus)
		api.GET("/:framework/logs", deployHandler.GetLogs)
		api.DELETE("/:framework", deployHandler.Uninstall)
	}

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	srv := &http.Server{
		Addr:    ":8082",
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
	log.Println("Shutting down deploy-service...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}
	log.Println("Server exiting")
}