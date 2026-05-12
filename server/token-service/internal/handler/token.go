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

// 统一的记录请求，支持多种资源类型
type recordReq struct {
	UserID       string `json:"userId" binding:"required"`
	ResourceType string `json:"resourceType" binding:"required"` // "llm-call", "mcp-tool", "a2a-task"
	ModelName    string `json:"modelName,omitempty"`
	InputTokens  int    `json:"inputTokens,omitempty"`
	OutputTokens int    `json:"outputTokens,omitempty"`
	ToolName     string `json:"toolName,omitempty"`
	DurationMs   int64  `json:"durationMs,omitempty"`
	SkillID      string `json:"skillId,omitempty"`
}

func (h *TokenHandler) RecordUsage(c *gin.Context) {
	var req recordReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	usage, err := h.svc.RecordUsage(service.UsageRecordRequest{
		UserID:       req.UserID,
		ResourceType: req.ResourceType,
		ModelName:    req.ModelName,
		InputTokens:  req.InputTokens,
		OutputTokens: req.OutputTokens,
		ToolName:     req.ToolName,
		DurationMs:   req.DurationMs,
		SkillID:      req.SkillID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":        usage.ID,
		"cost":      usage.CostAmount,
		"timestamp": usage.CreatedAt,
	})
}

func (h *TokenHandler) GetUserUsage(c *gin.Context) {
	userID := c.Param("userId")
	resourceType := c.DefaultQuery("resourceType", "")
	cost, err := h.svc.GetUserUsage(userID, resourceType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"userId":    userID,
		"totalCost": cost,
	})
}

func (h *TokenHandler) GetUserUsageByPeriod(c *gin.Context) {
	userID := c.Param("userId")
	period := c.DefaultQuery("period", "day")
	resourceType := c.DefaultQuery("resourceType", "")
	data, err := h.svc.GetUserUsageByPeriod(userID, period, resourceType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"userId": userID,
		"period": period,
		"data":   data,
	})
}