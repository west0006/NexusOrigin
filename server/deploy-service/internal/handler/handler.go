// ─── server/deploy-service/internal/handler/handler.go ────
package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/shrimptank/deploy-service/internal/driver"
	"github.com/shrimptank/deploy-service/internal/service"
)

type DeployHandler struct {
	svc *service.DeployService
}

func NewDeployHandler() *DeployHandler {
	return &DeployHandler{svc: service.NewDeployService()}
}

func (h *DeployHandler) getDriver(c *gin.Context) (driver.AgentDriver, string, error) {
	framework := c.Param("framework")
	d, err := h.svc.GetDriver(framework)
	return d, framework, err
}

func (h *DeployHandler) Install(c *gin.Context) {
	d, _, err := h.getDriver(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var config driver.DeployConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	path, err := d.Install(c.Request.Context(), config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "path": path})
}

func (h *DeployHandler) Start(c *gin.Context) {
	d, _, err := h.getDriver(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := d.Start(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *DeployHandler) Stop(c *gin.Context) {
	d, _, err := h.getDriver(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := d.Stop(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *DeployHandler) GetStatus(c *gin.Context) {
	d, _, err := h.getDriver(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	status, err := d.GetStatus(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, status)
}

func (h *DeployHandler) GetLogs(c *gin.Context) {
	d, _, err := h.getDriver(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	lines := c.DefaultQuery("lines", "50")
	lineCount := 50
	if n, ok := parseInt(lines); ok {
		lineCount = n
	}
	logs, err := d.GetLogs(c.Request.Context(), lineCount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.String(http.StatusOK, logs)
}

func (h *DeployHandler) Uninstall(c *gin.Context) {
	d, _, err := h.getDriver(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := d.Uninstall(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func parseInt(s string) (int, bool) {
	n := 0
	for _, ch := range s {
		if ch < '0' || ch > '9' {
			return 0, false
		}
		n = n*10 + int(ch-'0')
	}
	return n, true
}