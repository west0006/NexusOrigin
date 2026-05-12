// server/deploy-service/internal/driver/openclaw/openclaw.go
package openclaw

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/shrimptank/deploy-service/internal/driver"
)

type Driver struct {
	installPath string
	config      driver.DeployConfig
}

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
	if err := os.MkdirAll(installPath, 0755); err != nil {
		return "", fmt.Errorf("create install dir: %w", err)
	}

	npmPath, err := exec.LookPath("npm")
	if err != nil {
		return "", fmt.Errorf("npm not found, please install Node.js first")
	}

	cmd := exec.CommandContext(ctx, npmPath, "install", "-g", "@anthropic-ai/claude-code")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("install OpenClaw via npm: %w", err)
	}

	if err := d.generateConfig(installPath, config); err != nil {
		return "", fmt.Errorf("generate config: %w", err)
	}

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
		return fmt.Errorf("OpenClaw not installed")
	}
	cmd := exec.CommandContext(ctx, "openclaw", "start", "--path", d.installPath)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func (d *Driver) Stop(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, "openclaw", "stop")
	return cmd.Run()
}

func (d *Driver) GetStatus(ctx context.Context) (*driver.Status, error) {
	cmd := exec.CommandContext(ctx, "openclaw", "status", "--json")
	out, err := cmd.Output()
	if err != nil {
		return &driver.Status{Running: false}, nil
	}
	s := string(out)
	status := &driver.Status{Running: strings.Contains(s, `"running":true`)}
	return status, nil
}

func (d *Driver) GetLogs(ctx context.Context, lines int) (string, error) {
	logPath := filepath.Join(d.installPath, "logs", "openclaw.log")
	cmd := exec.CommandContext(ctx, "tail", "-n", fmt.Sprintf("%d", lines), logPath)
	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("read logs: %w", err)
	}
	return string(out), nil
}

func (d *Driver) Uninstall(ctx context.Context) error {
	_ = d.Stop(ctx)
	if d.installPath != "" {
		return os.RemoveAll(d.installPath)
	}
	return nil
}

func (d *Driver) validateConfig(config driver.DeployConfig) error {
	if config.APIKey == "" {
		return fmt.Errorf("API key is required")
	}
	valid := map[string]bool{"openai": true, "anthropic": true, "siliconflow": true}
	if !valid[config.ModelProvider] {
		return fmt.Errorf("unsupported model provider: %s", config.ModelProvider)
	}
	return nil
}

func (d *Driver) generateConfig(installPath string, config driver.DeployConfig) error {
	configPath := filepath.Join(installPath, "openclaw.json")
	cfg := map[string]interface{}{
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
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(configPath, data, 0600)
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
	if err := os.MkdirAll(plistDir, 0755); err != nil {
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
        <string>openclaw</string>
        <string>start</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>`)
	return os.WriteFile(filepath.Join(plistDir, "com.openclaw.daemon.plist"), []byte(plistContent), 0644)
}

func (d *Driver) setupSystemd(installPath string) error {
	homeDir, _ := os.UserHomeDir()
	serviceDir := filepath.Join(homeDir, ".config", "systemd", "user")
	if err := os.MkdirAll(serviceDir, 0755); err != nil {
		return err
	}
	serviceContent := `[Unit]
Description=OpenClaw AI Service
After=network.target

[Service]
ExecStart=openclaw start
Restart=on-failure

[Install]
WantedBy=default.target`
	return os.WriteFile(filepath.Join(serviceDir, "openclaw.service"), []byte(serviceContent), 0644)
}

func (d *Driver) setupWindowsService(installPath string) error {
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