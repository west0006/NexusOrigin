// ─── server/deploy-service/internal/driver/openclaw/openclaw.go
package openclaw

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"

	"github.com/shrimptank/deploy-service/internal/driver"
)

// Driver 是 OpenClaw 框架的 AgentDriver 实现
type Driver struct {
	installPath string
	config      driver.DeployConfig
}

// 确保 Driver 实现了 AgentDriver 接口（编译期断言）
var _ driver.AgentDriver = (*Driver)(nil)

func NewDriver() *Driver {
	return &Driver{}
}

func (d *Driver) Install(ctx context.Context, config driver.DeployConfig) (string, error) {
	if err := d.validateConfig(config); err != nil {
		return "", fmt.Errorf("invalid config: %w", err)
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("get home dir: %w", err)
	}

	installPath := config.InstallPath
	if installPath == "" {
		installPath = filepath.Join(homeDir, ".openclaw")
	}

	if err := os.MkdirAll(installPath, 0o755); err != nil {
		return "", fmt.Errorf("create install dir: %w", err)
	}

	// 步骤1：使用 npm 安装 OpenClaw
	npmPath, err := exec.LookPath("npm")
	if err != nil {
		return "", fmt.Errorf("npm not found, please install Node.js first: %w", err)
	}

	cmd := exec.CommandContext(ctx, npmPath, "install", "-g", "@anthropic-ai/claude-code")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("install OpenClaw via npm: %w", err)
	}

	// 步骤2：生成配置文件
	configPath := filepath.Join(installPath, "openclaw.json")
	configData := map[string]interface{}{
		"models": map[string]interface{}{
			"providers": map[string]interface{}{
				config.ModelProvider: map[string]interface{}{
					"baseUrl": getBaseURL(config.ModelProvider),
					"apiKey":  config.APIKey,
					"api":     "openai-completions",
					"models":  getDefaultModels(config.ModelProvider),
				},
			},
		},
	}

	data, err := json.MarshalIndent(configData, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal config: %w", err)
	}

	if err := os.WriteFile(configPath, data, 0o600); err != nil {
		return "", fmt.Errorf("write config: %w", err)
	}

	// 步骤3：设置自启动（可选）
	if config.AutoStart {
		if err := d.setupAutoStart(installPath); err != nil {
			return "", fmt.Errorf("setup auto start: %w", err)
		}
	}

	d.installPath = installPath
	d.config = config
	return installPath, nil
}

func (d *Driver) Start(ctx context.Context) error {
	if d.installPath == "" {
		return fmt.Errorf("OpenClaw not installed yet")
	}
	cmd := exec.CommandContext(ctx, "openclaw", "start", "--path", d.installPath)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func (d *Driver) Stop(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, "openclaw", "stop")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func (d *Driver) GetStatus(ctx context.Context) (*driver.Status, error) {
	cmd := exec.CommandContext(ctx, "openclaw", "status", "--json")
	output, err := cmd.Output()
	if err != nil {
		return &driver.Status{Running: false}, nil
	}

	var status driver.Status
	if err := json.Unmarshal(output, &status); err != nil {
		return &driver.Status{Running: true}, nil
	}
	return &status, nil
}

func (d *Driver) GetLogs(ctx context.Context, lines int) (string, error) {
	logPath := filepath.Join(d.installPath, "logs", "openclaw.log")
	cmd := exec.CommandContext(ctx, "tail", "-n", fmt.Sprintf("%d", lines), logPath)
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("read logs: %w", err)
	}
	return string(output), nil
}

func (d *Driver) Uninstall(ctx context.Context) error {
	// 先停止服务
	if err := d.Stop(ctx); err != nil {
		// 已停止则忽略错误
		_ = err
	}

	// 删除安装目录
	if d.installPath != "" {
		if err := os.RemoveAll(d.installPath); err != nil {
			return fmt.Errorf("remove install dir: %w", err)
		}
	}
	return nil
}

func (d *Driver) validateConfig(config driver.DeployConfig) error {
	if config.APIKey == "" {
		return fmt.Errorf("API key is required")
	}
	validProviders := map[string]bool{
		"openai": true, "anthropic": true, "siliconflow": true,
	}
	if !validProviders[config.ModelProvider] {
		return fmt.Errorf("unsupported model provider: %s", config.ModelProvider)
	}
	return nil
}

func (d *Driver) setupAutoStart(installPath string) error {
	switch runtime.GOOS {
	case "darwin":
		return d.setupLaunchAgent(installPath)
	case "linux":
		return d.setupSystemd(installPath)
	case "windows":
		return d.setupWindowsService(installPath)
	default:
		return fmt.Errorf("unsupported OS: %s", runtime.GOOS)
	}
}

func (d *Driver) setupLaunchAgent(installPath string) error {
	homeDir, _ := os.UserHomeDir()
	plistDir := filepath.Join(homeDir, "Library", "LaunchAgents")
	if err := os.MkdirAll(plistDir, 0o755); err != nil {
		return err
	}
	plistContent := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.openclaw.daemon</string>
    <key>ProgramArguments</key>
    <array>
        <string>%s</string>
        <string>start</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>`, "openclaw")
	return os.WriteFile(filepath.Join(plistDir, "com.openclaw.daemon.plist"), []byte(plistContent), 0o644)
}

func (d *Driver) setupSystemd(installPath string) error {
	serviceContent := fmt.Sprintf(`[Unit]
Description=OpenClaw AI Service
After=network.target

[Service]
ExecStart=%s start
Restart=on-failure
User=%%u

[Install]
WantedBy=default.target
`, "openclaw")
	return os.WriteFile(filepath.Join(os.Getenv("HOME"), ".config/systemd/user/openclaw.service"), []byte(serviceContent), 0o644)
}

func (d *Driver) setupWindowsService(installPath string) error {
	// Windows 服务安装需使用 sc 命令或 winsw
	cmd := exec.Command("sc", "create", "OpenClaw", "binPath=", installPath, "start=", "auto")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func getBaseURL(provider string) string {
	urls := map[string]string{
		"openai":      "https://api.openai.com/v1",
		"anthropic":   "https://api.anthropic.com/v1",
		"siliconflow": "https://api.siliconflow.cn/v1",
	}
	return urls[provider]
}

func getDefaultModels(provider string) []string {
	models := map[string][]string{
		"openai":      {"gpt-4o", "gpt-4o-mini"},
		"anthropic":   {"claude-sonnet-4-20250514", "claude-3.5-sonnet"},
		"siliconflow": {"Qwen/Qwen3-235B-A22B", "Pro/deepseek-ai/DeepSeek-V3"},
	}
	if m, ok := models[provider]; ok {
		return m
	}
	return []string{}
}