// ─── server/token-service/internal/handler/budget.go ──────
package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/shrimptank/token-service/internal/service"
)

type BudgetHandler struct {
	svc *service.BudgetManager
}

func NewBudgetHandler(svc *service.BudgetManager) *BudgetHandler {
	return &BudgetHandler{svc: svc}
}

type setBudgetReq struct {
	UserID        string  `json:"userId" binding:"required"`
	MonthlyBudget float64 `json:"monthlyBudget" binding:"required"`
}

func (h *BudgetHandler) SetBudget(c *gin.Context) {
	var req setBudgetReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.SetBudget(c.Request.Context(), req.UserID, req.MonthlyBudget); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "budget set successfully"})
}

func (h *BudgetHandler) GetBudget(c *gin.Context) {
	userID := c.Param("userId")
	budget, used, remaining, usageRate, err := h.svc.GetBudget(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"budget":    budget,
		"used":      used,
		"remaining": remaining,
		"usageRate": usageRate,
	})
}