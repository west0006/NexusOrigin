package crewai

import (
    "context"
    "fmt"
    "os"
    "os/exec"
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
    homeDir, _ := os.UserHomeDir()
    installPath := config.InstallPath
    if installPath == "" {
        installPath = filepath.Join(homeDir, ".crewai")
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

    // 安装 crewai
    cmd := exec.CommandContext(ctx, pythonPath, "-m", "pip", "install", "crewai")
    cmd.Stdout = os.Stdout
    cmd.Stderr = os.Stderr
    if err := cmd.Run(); err != nil {
        return "", fmt.Errorf("install crewai: %w", err)
    }

    // 生成默认 YAML 团队配置
    configPath := filepath.Join(installPath, "crew.yaml")
    crewConfig := fmt.Sprintf(`
crew:
  name: default_crew
  agents:
    - role: researcher
      goal: gather information
      backstory: you are a researcher
      llm:
        provider: %s
        api_key: %s
`, config.ModelProvider, config.APIKey)
    os.WriteFile(configPath, []byte(crewConfig), 0600)

    d.installPath = installPath
    d.config = config
    return installPath, nil
}

func (d *Driver) Start(ctx context.Context) error {
    if d.installPath == "" {
        return fmt.Errorf("CrewAI not installed")
    }
    cmd := exec.CommandContext(ctx, "crewai", "run", "--config", filepath.Join(d.installPath, "crew.yaml"))
    cmd.Stdout = os.Stdout
    cmd.Stderr = os.Stderr
    return cmd.Run()
}

func (d *Driver) Stop(ctx context.Context) error {
    cmd := exec.CommandContext(ctx, "pkill", "-f", "crewai run")
    return cmd.Run()
}

func (d *Driver) GetStatus(ctx context.Context) (*driver.Status, error) {
    cmd := exec.CommandContext(ctx, "pgrep", "-f", "crewai run")
    err := cmd.Run()
    return &driver.Status{Running: err == nil}, nil
}

func (d *Driver) GetLogs(ctx context.Context, lines int) (string, error) {
    logPath := filepath.Join(d.installPath, "logs", "crewai.log")
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