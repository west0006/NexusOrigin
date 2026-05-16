// ─── server/deploy-service/internal/service/deploy_service.go
package service

import (
	"fmt"
	"sync"

	"github.com/shrimptank/deploy-service/internal/driver"
	"github.com/shrimptank/deploy-service/internal/driver/openclaw"
	"github.com/shrimptank/deploy-service/internal/driver/langgraph"
	"github.com/shrimptank/deploy-service/internal/driver/crewai"
)

// DeployService 管理多个框架的部署实例
type DeployService struct {
	mu       sync.RWMutex
	drivers  map[string]driver.AgentDriver // key: framework name
}

func NewDeployService() *DeployService {
	svc := &DeployService{
		drivers: make(map[string]driver.AgentDriver),
	}
	// 注册已实现的 Driver
	svc.registerDriver("openclaw", openclaw.NewDriver())
	svc.registerDriver("langgraph", langgraph.NewDriver())
    svc.registerDriver("crewai", crewai.NewDriver())
	return svc
}

func (s *DeployService) registerDriver(name string, d driver.AgentDriver) {
	s.drivers[name] = d
}

func (s *DeployService) GetDriver(framework string) (driver.AgentDriver, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	d, ok := s.drivers[framework]
	if !ok {
		return nil, fmt.Errorf("unsupported framework: %s", framework)
	}
	return d, nil
}

// RegisterDriver 动态注册新框架（预留扩展）
func (s *DeployService) RegisterDriver(name string, d driver.AgentDriver) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.drivers[name] = d
}