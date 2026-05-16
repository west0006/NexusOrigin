# 模块六：Agent市场与自定义Agent系统
## 一、核心功能确定
1. **Agent全生命周期管理**：支持Agent的创建、编辑、测试、发布、下架、版本管理
2. **Agent市场展示**：提供Agent分类浏览、搜索、筛选、详情展示功能
3. **Agent交易系统**：支持免费、付费、订阅三种Agent使用模式
4. **自定义Agent创建**：提供引导式和高级代码两种自定义Agent创建方式
5. **Agent沙箱测试**：提供安全的沙箱环境，供用户测试自定义Agent
6. **Agent评分与评价**：基于用户使用数据和评价，计算Agent综合评分
7. **Agent权限控制**：实现细粒度的Agent权限管理，控制Agent可访问的资源和工具
8. **Agent分账结算**：自动计算Agent开发者的收益并进行结算

## 二、业务逻辑设计
1. **Agent发布流程**
    - 开发者创建Agent，配置基本信息、角色、技能、工具权限
    - 在沙箱环境中测试Agent功能
    - 提交平台审核
    - 平台审核通过后，Agent发布到市场
    - 开发者可以随时更新Agent版本，新版本需要重新审核
    - 开发者可以设置Agent的价格和使用模式

2. **Agent搜索与推荐流程**
    - 用户输入关键词搜索Agent
    - 系统根据关键词匹配度、评分、下载量、使用量等因素进行排序
    - 基于用户历史使用记录和偏好，推荐个性化的Agent
    - 展示热门Agent、新品Agent、高评分Agent等榜单
    - 用户可以按分类、价格、评分等条件筛选Agent

3. **Agent购买与使用流程**
    - 用户查看Agent详情，了解功能、价格、评价等信息
    - 免费Agent：用户可以直接添加到自己的Agent库
    - 付费Agent：用户支付费用后，获得永久使用权
    - 订阅Agent：用户按月/按年支付订阅费用，获得使用权
    - 用户在发布任务时，可以选择使用自己Agent库中的Agent
    - 系统记录Agent的使用次数和时长，用于分账结算

4. **自定义Agent创建流程**
    - 引导式创建：用户通过回答问题，系统自动生成Agent配置
    - 高级创建：用户直接编辑Agent的系统提示词、工具配置、工作流程
    - 用户上传Agent的专属知识库
    - 在沙箱环境中测试Agent效果
    - 保存为私有Agent或发布到市场

5. **分账结算流程**
    - 系统记录每个Agent的每一次使用
    - 按照预设的分账比例（通常平台30%，开发者70%）计算收益
    - 每月自动进行结算，将收益发放到开发者账户
    - 生成详细的结算报表，供开发者查询
    - 支持开发者提现操作

## 三、技术路线和细节
1. **技术选型**
    - 前端：React 18 + TypeScript + Ant Design Pro
    - 后端：FastAPI + Python 3.10+
    - 数据库：PostgreSQL（存储Agent元数据）+ Redis（缓存热门Agent）
    - 搜索引擎：Elasticsearch（Agent全文检索）
    - 沙箱环境：Docker + Kubernetes（Agent隔离执行）
    - 工作流引擎：Apache Airflow（复杂Agent工作流）
    - 推荐系统：协同过滤 + 深度学习混合推荐

2. **关键技术方案**
    - **Agent沙箱隔离**：每个Agent在独立的Docker容器中执行，严格限制资源和权限
    - **版本管理**：使用Git思想管理Agent版本，支持版本回滚和对比
    - **统一Agent接口**：定义标准化的Agent执行接口，屏蔽不同Agent的实现差异
    - **工具权限控制**：实现基于角色的工具权限控制，Agent只能使用被授权的工具
    - **智能推荐算法**：结合内容推荐、协同过滤和深度学习，提供个性化推荐
    - **自动审核系统**：使用LLM自动审核Agent的提示词和功能，过滤违规内容

## 四、具体技术实现
1. **核心数据模型**
```python
from sqlalchemy import Column, String, Float, DateTime, Integer, ForeignKey, Text, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

Base = declarative_base()

class Agent(Base):
    __tablename__ = 'agents'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    developer_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    avatar_url = Column(String(255))
    category = Column(String(50), nullable=False)
    tags = Column(JSON)
    system_prompt = Column(Text, nullable=False)
    tools = Column(JSON)  # 授权的工具列表
    capabilities = Column(JSON)  # Agent能力描述
    price_type = Column(String(20), default='free')  # free/paid/subscription
    price = Column(Float, default=0)
    subscription_price = Column(Float, default=0)
    status = Column(String(20), default='draft')  # draft/pending_review/published/rejected/removed
    version = Column(String(20), default='1.0.0')
    download_count = Column(Integer, default=0)
    usage_count = Column(Integer, default=0)
    average_rating = Column(Float, default=0)
    review_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime)
    
    developer = relationship('User', back_populates='developed_agents')
    versions = relationship('AgentVersion', back_populates='agent', order_by='desc(AgentVersion.created_at)')
    reviews = relationship('AgentReview', back_populates='agent')
    user_agents = relationship('UserAgent', back_populates='agent')

class AgentVersion(Base):
    __tablename__ = 'agent_versions'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String(36), ForeignKey('agents.id'), nullable=False)
    version = Column(String(20), nullable=False)
    changelog = Column(Text)
    system_prompt = Column(Text, nullable=False)
    tools = Column(JSON)
    capabilities = Column(JSON)
    status = Column(String(20), default='pending_review')
    created_at = Column(DateTime, default=datetime.utcnow)
    published_at = Column(DateTime)
    
    agent = relationship('Agent', back_populates='versions')

class UserAgent(Base):
    __tablename__ = 'user_agents'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    agent_id = Column(String(36), ForeignKey('agents.id'), nullable=False)
    license_type = Column(String(20), nullable=False)  # free/paid/subscription
    expires_at = Column(DateTime)  # 订阅到期时间
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime)
    
    user = relationship('User', back_populates='user_agents')
    agent = relationship('Agent', back_populates='user_agents')

class AgentReview(Base):
    __tablename__ = 'agent_reviews'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    agent_id = Column(String(36), ForeignKey('agents.id'), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5分
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship('User', back_populates='agent_reviews')
    agent = relationship('Agent', back_populates='reviews')
```

2. **Agent沙箱执行实现**
```python
import docker
import json
import time
from typing import Dict, Any
from docker.errors import DockerException

class AgentSandbox:
    def __init__(self):
        self.client = docker.from_env()
        self.image_name = "agent-executor:latest"
        self.timeout = 300  # 5分钟超时
    
    def execute(self, agent_config: Dict[str, Any], task: Dict[str, Any]) -> Dict[str, Any]:
        """在沙箱中执行Agent任务"""
        container = None
        try:
            # 创建容器
            container = self.client.containers.run(
                self.image_name,
                detach=True,
                network_mode="none",  # 禁用网络
                mem_limit="512m",     # 限制内存
                cpu_period=100000,
                cpu_quota=50000,      # 限制CPU使用率为50%
                environment={
                    "AGENT_CONFIG": json.dumps(agent_config),
                    "TASK": json.dumps(task)
                }
            )
            
            # 等待容器执行完成
            start_time = time.time()
            while time.time() - start_time < self.timeout:
                container.reload()
                if container.status == "exited":
                    break
                time.sleep(1)
            
            # 超时处理
            if container.status != "exited":
                container.kill()
                raise Exception("Agent execution timed out")
            
            # 获取执行结果
            logs = container.logs().decode("utf-8")
            try:
                result = json.loads(logs.split("===RESULT===")[-1].strip())
                return {
                    "success": True,
                    "data": result,
                    "logs": logs
                }
            except (IndexError, json.JSONDecodeError):
                return {
                    "success": False,
                    "error": "Invalid result format",
                    "logs": logs
                }
        
        except DockerException as e:
            return {
                "success": False,
                "error": f"Docker error: {str(e)}"
            }
        finally:
            # 确保容器被清理
            if container:
                try:
                    container.remove(force=True)
                except DockerException:
                    pass
```

3. **自定义Agent创建接口实现**
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
from models import Agent, AgentVersion, User
from database import get_db
from auth import get_current_user
from schemas import AgentCreate, AgentUpdate
from sandbox import AgentSandbox

router = APIRouter(prefix="/api/agents", tags=["agents"])
sandbox = AgentSandbox()

@router.post("/custom")
def create_custom_agent(
    agent_data: AgentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """创建自定义Agent"""
    # 创建Agent记录
    agent = Agent(
        developer_id=current_user.id,
        name=agent_data.name,
        description=agent_data.description,
        category=agent_data.category,
        tags=agent_data.tags,
        system_prompt=agent_data.system_prompt,
        tools=agent_data.tools,
        capabilities=agent_data.capabilities,
        price_type=agent_data.price_type,
        price=agent_data.price,
        subscription_price=agent_data.subscription_price,
        status="draft"
    )
    
    db.add(agent)
    db.commit()
    db.refresh(agent)
    
    # 创建初始版本
    version = AgentVersion(
        agent_id=agent.id,
        version="1.0.0",
        system_prompt=agent_data.system_prompt,
        tools=agent_data.tools,
        capabilities=agent_data.capabilities,
        status="draft"
    )
    
    db.add(version)
    db.commit()
    
    return {"agent_id": agent.id, "message": "Custom agent created successfully"}

@router.post("/{agent_id}/test")
def test_agent(
    agent_id: str,
    test_task: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """测试自定义Agent"""
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.developer_id == current_user.id
    ).first()
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # 在沙箱中执行测试
    agent_config = {
        "system_prompt": agent.system_prompt,
        "tools": agent.tools,
        "capabilities": agent.capabilities
    }
    
    result = sandbox.execute(agent_config, test_task)
    
    return result

@router.post("/{agent_id}/publish")
def publish_agent(
    agent_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """提交Agent审核发布"""
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.developer_id == current_user.id
    ).first()
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    if agent.status != "draft":
        raise HTTPException(status_code=400, detail="Agent is not in draft status")
    
    # 更新状态为待审核
    agent.status = "pending_review"
    latest_version = db.query(AgentVersion).filter(
        AgentVersion.agent_id == agent_id
    ).order_by(AgentVersion.created_at.desc()).first()
    
    if latest_version:
        latest_version.status = "pending_review"
    
    db.commit()
    
    return {"message": "Agent submitted for review successfully"}
```

4. **Agent推荐算法实现**
```python
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session
from models import Agent, UserAgent, AgentReview

class AgentRecommender:
    def __init__(self, db: Session):
        self.db = db
    
    def get_recommendations(self, user_id: str, limit: int = 10) -> list[str]:
        """获取用户的Agent推荐列表"""
        # 获取用户已使用的Agent
        user_agents = self.db.query(UserAgent).filter(
            UserAgent.user_id == user_id
        ).all()
        
        if not user_agents:
            # 新用户，推荐热门Agent
            return self._get_popular_agents(limit)
        
        # 构建用户-Agent评分矩阵
        user_agent_ids = [ua.agent_id for ua in user_agents]
        all_agents = self.db.query(Agent).filter(
            Agent.status == "published",
            Agent.id.notin_(user_agent_ids)
        ).all()
        
        if not all_agents:
            return []
        
        # 计算内容相似度
        user_agent_vectors = []
        for agent_id in user_agent_ids:
            agent = self.db.query(Agent).get(agent_id)
            if agent:
                user_agent_vectors.append(self._get_agent_vector(agent))
        
        if not user_agent_vectors:
            return self._get_popular_agents(limit)
        
        user_vector = np.mean(user_agent_vectors, axis=0)
        
        # 计算所有Agent与用户向量的相似度
        similarities = []
        for agent in all_agents:
            agent_vector = self._get_agent_vector(agent)
            similarity = cosine_similarity([user_vector], [agent_vector])[0][0]
            similarities.append((agent.id, similarity))
        
        # 按相似度排序
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        # 结合评分和使用量进行加权
        weighted_scores = []
        for agent_id, similarity in similarities[:limit*2]:
            agent = self.db.query(Agent).get(agent_id)
            score = similarity * 0.6 + (agent.average_rating / 5) * 0.2 + (min(agent.usage_count, 1000) / 1000) * 0.2
            weighted_scores.append((agent_id, score))
        
        weighted_scores.sort(key=lambda x: x[1], reverse=True)
        
        return [agent_id for agent_id, score in weighted_scores[:limit]]
    
    def _get_agent_vector(self, agent: Agent) -> np.ndarray:
        """获取Agent的特征向量"""
        # 这里简化处理，实际应该使用词向量模型将Agent描述转换为向量
        # 示例：使用标签和类别构建简单向量
        categories = ["writing", "coding", "analysis", "design", "research", "other"]
        tags = ["ai", "data", "marketing", "finance", "education", "health", "other"]
        
        vector = np.zeros(len(categories) + len(tags))
        
        # 类别特征
        if agent.category in categories:
            vector[categories.index(agent.category)] = 1
        
        # 标签特征
        for tag in agent.tags:
            if tag in tags:
                vector[len(categories) + tags.index(tag)] = 1
        
        return vector
    
    def _get_popular_agents(self, limit: int) -> list[str]:
        """获取热门Agent"""
        popular_agents = self.db.query(Agent).filter(
            Agent.status == "published"
        ).order_by(
            Agent.download_count.desc(),
            Agent.average_rating.desc()
        ).limit(limit).all()
        
        return [agent.id for agent in popular_agents]
```

## 五、注意事项
1. **安全隔离**：必须严格隔离自定义Agent的执行环境，防止恶意代码执行和数据泄露，使用Docker容器并限制网络、内存、CPU等资源
2. **内容审核**：建立严格的Agent审核机制，使用自动审核+人工审核相结合的方式，过滤违规和有害内容
3. **性能优化**：Agent沙箱执行会消耗大量资源，需要优化容器启动速度和资源利用率，使用容器池技术减少启动时间
4. **质量控制**：建立Agent质量评估体系，对低质量Agent进行下架处理，维护市场生态
5. **知识产权保护**：明确Agent的知识产权归属，保护开发者的合法权益，防止抄袭和盗用
6. **用户体验**：简化自定义Agent的创建流程，提供丰富的模板和示例，降低使用门槛
7. **数据安全**：严格保护用户和开发者的数据安全，防止敏感信息泄露
8. **可扩展性**：设计可扩展的Agent架构，支持未来添加更多的工具和能力