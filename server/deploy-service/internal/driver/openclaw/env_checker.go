package openclaw

import (
	"context"
	"os/exec"
	"runtime"
	"strings"

	"github.com/shrimptank/deploy-service/internal/driver"
)

type EnvChecker struct{}

func NewEnvChecker() *EnvChecker {
	return &EnvChecker{}
}

func (e *EnvChecker) Check(ctx context.Context) (*driver.EnvCheckResult, error) {
	result := &driver.EnvCheckResult{
		Os:   runtime.GOOS,
		Arch: runtime.GOARCH,
	}

	// Node 版本
	if out, err := exec.CommandContext(ctx, "node", "--version").Output(); err == nil {
		result.NodeVersion = strings.TrimSpace(string(out))
	}

	// npm 版本
	if out, err := exec.CommandContext(ctx, "npm", "--version").Output(); err == nil {
		result.NpmVersion = strings.TrimSpace(string(out))
	}
// Python 版本（尝试 python3 和 python）
	if out, err := exec.CommandContext(ctx, "python3", "--version").Output(); err == nil {
		result.PythonVersion = strings.TrimSpace(string(out))
	} else if out, err := exec.CommandContext(ctx, "python", "--version").Output(); err == nil {
		result.PythonVersion = strings.TrimSpace(string(out))
	}

	// 获取磁盘空间（简化，生产应使用 syscall）
	result.DiskSpace = 1024 * 10 // 假设10GB

	return result, nil
}