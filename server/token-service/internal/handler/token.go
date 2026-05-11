// ─── server/token-service/internal/handler/token.go ───────
package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/shrimptank/token-service/internal/service"
)

type TokenHandler struct {
	svc *service.TokenCounter
}

func NewTokenHandler(svc *service.TokenCounter) *TokenHandler {
	return &TokenHandler{svc: svc}
}

type recordReq struct {
	UserID       string `json:"userId" binding:"required"`
	ModelName    string `json:"modelName" binding:"required"`
	InputTokens  int    `json:"inputTokens" binding:"required"`
	OutputTokens int    `json:"outputTokens" binding:"required"`
	SkillID      string `json:"skillId"`
}

func (h *TokenHandler) RecordUsage(c *gin.Context) {
	var req recordReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	usage, err := h.svc.RecordUsage(service.UsageRecordRequest{
		UserID:       req.UserID,
		ModelName:    req.ModelName,
		InputTokens:  req.InputTokens,
		OutputTokens: req.OutputTokens,
		SkillID:      req.SkillID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":        usage.ID,
		"costUsd":   usage.CostUSD,
		"timestamp": usage.CreatedAt,
	})
}

func (h *TokenHandler) GetUserUsage(c *gin.Context) {
	userID := c.Param("userId")
	tokens, cost, err := h.svc.GetUserUsage(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"userId":      userID,
		"totalTokens": tokens,
		"totalCost":   cost,
	})
}

func (h *TokenHandler) GetUserUsageByPeriod(c *gin.Context) {
	userID := c.Param("userId")
	period := c.DefaultQuery("period", "day")
	results, err := h.svc.GetUserUsageByPeriod(userID, period)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"userId": userID,
		"period": period,
		"data":   results,
	})
}