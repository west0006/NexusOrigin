// ─── server/token-service/internal/middleware/auth.go ─────
package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware 简单的 Bearer Token 校验（生产环境应使用 JWT 验证）
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing or invalid token"})
			return
		}
		// 这里应解析 token，设置用户信息到上下文
		c.Next()
	}
}