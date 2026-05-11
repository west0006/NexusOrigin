// ─── server/deploy-service/internal/driver/interface.go ───
package driver

import "context"

// Status 表示 Agent 框架的运行状态
type Status struct {
	Running bool   `json:"running"`
	Version string `json:"version"`
	PID     int    `json:"pid"`
	Port    int    `json:"port"`
}

// DeployConfig 部署配置（框架无关）
type DeployConfig struct {
	InstallPath    string            `json:"installPath"`
	PythonPath     string            `json:"pythonPath,omitempty"`
	ModelProvider  string            `json:"modelProvider"`
	APIKey         string            `json:"apiKey"`
	AutoStart      bool              `json:"autoStart"`
	Extra          map[string]string `json:"extra,omitempty"`
}

// AgentDriver 定义 Agent 框架的统一生命周期接口
// 每种框架（OpenClaw、LangGraph、CrewAI）均需实现此接口
type AgentDriver interface {
	// Install 安装框架及依赖，返回安装路径
	Install(ctx context.Context, config DeployConfig) (string, error)

	// Start 启动框架服务
	Start(ctx context.Context) error

	// Stop 停止框架服务
	Stop(ctx context.Context) error

	// GetStatus 获取当前运行状态
	GetStatus(ctx context.Context) (*Status, error)

	// GetLogs 获取最近 N 行日志
	GetLogs(ctx context.Context, lines int) (string, error)

	// Uninstall 卸载框架及依赖
	Uninstall(ctx context.Context) error
}