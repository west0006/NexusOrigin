// server/deploy-service/internal/driver/openclaw/openclaw.go
package openclaw

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

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
	if config.APIKey == "" {
		return "", fmt.Errorf("API key is required")
	}

	homeDir, _ := os.UserHomeDir()
	installPath := config.InstallPath
	if installPath == "" {
		installPath = filepath.Join(homeDir, ".openclaw")
	}
	if err := os.MkdirAll(installPath, 0755); err != nil {
		return "", fmt.Errorf("create install dir: %w", err)
	}

	if err := d.generateConfig(installPath, config); err != nil {
		return "", fmt.Errorf("generate config: %w", err)
	}

	d.installPath = installPath
	d.config = config
	return installPath, nil
}

func (d *Driver) Start(ctx context.Context) error {
	if d.installPath == "" {
		return fmt.Errorf("OpenClaw not installed")
	}
	// OpenClaw runtime is managed externally (not via CLI).
	// The config file at installPath/openclaw.json is ready for use.
	return nil
}

func (d *Driver) Stop(ctx context.Context) error {
	return nil
}

func (d *Driver) GetStatus(ctx context.Context) (*driver.Status, error) {
	// Check if config exists as a proxy for "installed and configured"
	_, err := os.Stat(filepath.Join(d.installPath, "openclaw.json"))
	running := err == nil
	return &driver.Status{Running: running}, nil
}

func (d *Driver) GetLogs(ctx context.Context, lines int) (string, error) {
	return "OpenClaw logs — not available (runtime managed externally)", nil
}

func (d *Driver) Uninstall(ctx context.Context) error {
	if d.installPath != "" {
		return os.RemoveAll(d.installPath)
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
