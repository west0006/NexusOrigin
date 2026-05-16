package langgraph

import (
    "context"
    "encoding/json"
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
        installPath = filepath.Join(homeDir, ".langgraph")
    }
    if err := os.MkdirAll(installPath, 0755); err != nil {
        return "", err
    }

    // 1. 检查 Python 环境
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

    // 2. 安装 langgraph-cli
    cmd := exec.CommandContext(ctx, pythonPath, "-m", "pip", "install", "langgraph-cli")
    cmd.Stdout = os.Stdout
    cmd.Stderr = os.Stderr
    if err := cmd.Run(); err != nil {
        return "", fmt.Errorf("install langgraph-cli: %w", err)
    }

    // 3. 初始化项目（如果不存在）
    initCmd := exec.CommandContext(ctx, "langgraph", "init", "--path", installPath)
    initCmd.Stdout = os.Stdout
    initCmd.Stderr = os.Stderr
    _ = initCmd.Run() // 忽略已存在的错误

    // 4. 生成配置文件
    configPath := filepath.Join(installPath, "config.json")
    cfgData := map[string]interface{}{
        "model_provider": config.ModelProvider,
        "api_key":        config.APIKey,
    }
    data, _ := json.MarshalIndent(cfgData, "", "  ")
    os.WriteFile(configPath, data, 0600)

    d.installPath = installPath
    d.config = config
    return installPath, nil
}

func (d *Driver) Start(ctx context.Context) error {
    if d.installPath == "" {
        return fmt.Errorf("LangGraph not installed")
    }
    cmd := exec.CommandContext(ctx, "langgraph", "serve", "--path", d.installPath)
    cmd.Stdout = os.Stdout
    cmd.Stderr = os.Stderr
    return cmd.Run()
}

func (d *Driver) Stop(ctx context.Context) error {
    // 简易：查找并终止 langgraph 进程
    cmd := exec.CommandContext(ctx, "pkill", "-f", "langgraph serve")
    return cmd.Run()
}

func (d *Driver) GetStatus(ctx context.Context) (*driver.Status, error) {
    // 简易判断：检查进程是否存在
    cmd := exec.CommandContext(ctx, "pgrep", "-f", "langgraph serve")
    err := cmd.Run()
    status := &driver.Status{Running: err == nil}
    return status, nil
}

func (d *Driver) GetLogs(ctx context.Context, lines int) (string, error) {
    logPath := filepath.Join(d.installPath, "logs", "langgraph.log")
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