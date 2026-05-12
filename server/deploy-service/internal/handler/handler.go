package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/shrimptank/deploy-service/internal/driver"
	"github.com/shrimptank/deploy-service/internal/driver/openclaw"
	"github.com/shrimptank/deploy-service/internal/service"
)

type DeployHandler struct {
	svc        *service.DeployService
	envChecker *openclaw.EnvChecker
}

func NewDeployHandler() *DeployHandler {
	return &DeployHandler{
		svc:        service.NewDeployService(),
		envChecker: openclaw.NewEnvChecker(),
	}
}

func (h *DeployHandler) getDriver(c *gin.Context) (driver.AgentDriver, string, error) {
	framework := c.Param("framework")
	d, err := h.svc.GetDriver(framework)
	return d, framework, err
}

func (h *DeployHandler) CheckEnv(c *gin.Context) {
	result, err := h.envChecker.Check(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
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
	n, _ := strconv.Atoi(lines)
	logs, err := d.GetLogs(c.Request.Context(), n)
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