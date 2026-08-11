package langgraph

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/shrimptank/deploy-service/internal/driver"
)

const langgraphHealthURL = "http://localhost:8002/api/langgraph/health"

type Driver struct {
	installPath string
	config      driver.DeployConfig
}

var _ driver.AgentDriver = (*Driver)(nil)

func NewDriver() *Driver {
	return &Driver{}
}

func (d *Driver) Install(ctx context.Context, config driver.DeployConfig) (string, error) {
	homeDir, _ := os.UserHomeDir()
	installPath := config.InstallPath
	if installPath == "" {
		installPath = filepath.Join(homeDir, ".langgraph")
	}
	if err := os.MkdirAll(installPath, 0755); err != nil {
		return "", err
	}

	pythonPath := config.PythonPath
	if pythonPath == "" {
		var err error
		pythonPath, err = exec.LookPath("python3")
		if err != nil {
			pythonPath, _ = exec.LookPath("python")
		}
		if pythonPath == "" {
			return "", fmt.Errorf("python not found")
		}
	}

	// Install Flask + deps (the real service uses Flask, not langgraph CLI)
	cmd := exec.CommandContext(ctx, pythonPath, "-m", "pip", "install", "flask", "flask-cors")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("install flask: %w", err)
	}

	d.installPath = installPath
	d.config = config
	return installPath, nil
}

// Start assumes the service is launched by start_services.py.
// It verifies the health endpoint becomes reachable within 5 seconds.
func (d *Driver) Start(ctx context.Context) error {
	client := &http.Client{Timeout: 2 * time.Second}
	for i := 0; i < 10; i++ {
		resp, err := client.Get(langgraphHealthURL)
		if err == nil && resp.StatusCode == 200 {
			resp.Body.Close()
			return nil
		}
		if resp != nil {
			resp.Body.Close()
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(500 * time.Millisecond):
		}
	}
	return fmt.Errorf("LangGraph service did not become healthy on :8002")
}

func (d *Driver) Stop(ctx context.Context) error {
	// In practice, start_services.py manages the lifecycle.
	return nil
}

func (d *Driver) GetStatus(ctx context.Context) (*driver.Status, error) {
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(langgraphHealthURL)
	if err != nil {
		return &driver.Status{Running: false}, nil
	}
	defer resp.Body.Close()
	return &driver.Status{Running: resp.StatusCode == 200}, nil
}

func (d *Driver) GetLogs(ctx context.Context, lines int) (string, error) {
	return fmt.Sprintf("LangGraph service logs (port 8002) — view via start_services.py console output"), nil
}

func (d *Driver) Uninstall(ctx context.Context) error {
	_ = d.Stop(ctx)
	if d.installPath != "" {
		return os.RemoveAll(d.installPath)
	}
	return nil
}
