## 第一阶段深入：单框架内四级角色闭环

### 1.1 任务分解与依赖管理

**业务逻辑**：领导Agent收到复杂任务后，调用大模型将其拆解为多个有序子任务。

**核心流程**：
1. 接收用户提交的任务描述和预期输出
2. 构建分解提示词，包含：任务类型、历史分解模板、可用Agent能力列表
3. 大模型返回结构化的子任务列表（JSON格式）
4. 解析并验证子任务依赖关系（DAG图）
5. 将子任务持久化，初始状态为`PENDING`

**伪代码**：

```
function decomposeTask(mainTask):
    // 1. 查询该任务类型的历史分解模板
    historyTemplates = db.query(
        "SELECT decomposition FROM task_templates WHERE task_type = ?", 
        mainTask.type
    )
    
    // 2. 获取当前可用Agent的能力列表
    availableCapabilities = agentRegistry.getAvailableCapabilities()
    
    // 3. 构建提示词
    prompt = buildPrompt([
        "你是一个任务分解专家。请将以下复杂任务分解为多个子任务：",
        "任务描述：" + mainTask.description,
        "预期输出：" + mainTask.expectedOutput,
        "可用的Agent能力：" + availableCapabilities.join(", "),
        "历史参考模板：" + historyTemplates.first(),
        "请返回JSON格式，包含subtasks数组，每个子任务包含：",
        "- description: 子任务描述",
        "- type: 任务类型(data_collection/analysis/generation)",
        "- dependencies: 依赖的子任务序号列表"
    ])
    
    // 4. 调用大模型
    response = llm.invoke(prompt)
    subtasks = parseJSON(response)
    
    // 5. 验证依赖关系（检查是否有循环依赖）
    if hasCircularDependency(subtasks):
        // 重新请求大模型修正
        return decomposeTask(mainTask)  // 递归重试，最多3次
    
    // 6. 持久化子任务
    for each subtask in subtasks:
        db.insert("multi_agent_subtasks", {
            main_task_id: mainTask.id,
            description: subtask.description,
            task_type: subtask.type,
            dependencies: subtask.dependencies,
            status: "PENDING",
            version: 1
        })
    
    return subtasks
```

### 1.2 基于能力的任务分配

**业务逻辑**：领导Agent根据子任务需求，匹配最合适的组员Agent。

**核心流程**：
1. 获取所有状态为`ONLINE`的组员Agent
2. 按子任务类型筛选具备匹配能力的Agent
3. 计算每个候选Agent的综合得分（能力匹配度 × 0.6 + 当前负载 × (-0.3) + 历史成功率 × 0.1）
4. 选择得分最高的Agent分配任务
5. 更新子任务状态为`ASSIGNED`

**伪代码**：

```
function assignSubtask(subtask):
    // 1. 获取在线且匹配能力的Agent
    candidates = agentRegistry.findAgents({
        status: "ONLINE",
        agent_type: "worker",
        capabilities: [subtask.task_type]
    })
    
    if candidates.isEmpty():
        // 加入等待队列，定期重试
        pendingQueue.enqueue(subtask)
        return null
    
    // 2. 计算综合得分
    for each agent in candidates:
        agent.score = (
            agent.capability_match * 0.6 +
            (1 - agent.current_load) * 0.3 +
            agent.history_success_rate * 0.1
        )
    
    // 3. 选择最佳Agent
    bestAgent = candidates.sortBy("score", descending=true).first()
    
    // 4. 分配并更新状态（乐观锁）
    success = db.update(
        "UPDATE multi_agent_subtasks SET assignee_id = ?, status = 'ASSIGNED', version = version + 1 WHERE id = ? AND version = ?",
        bestAgent.id, subtask.id, subtask.version
    )
    
    if not success:
        // 版本冲突，说明被其他进程修改，重新读取再试
        subtask = db.get("multi_agent_subtasks", subtask.id)
        return assignSubtask(subtask)  // 递归重试，最多3次
    
    // 5. 发布事件通知
    eventBus.publish("task.assigned", {
        subtask_id: subtask.id,
        assignee_id: bestAgent.id,
        timestamp: now()
    })
    
    return bestAgent
```

### 1.3 实时过程检测与分级问题上报

**业务逻辑**：审查Agent监控组员执行过程，根据规则库检测问题并分级上报。

**核心流程**：
1. 审查Agent订阅`task.assigned`事件，开始监控
2. 接收组员Agent的执行日志流（通过gRPC双向流或WebSocket）
3. 每条日志经过规则引擎匹配
4. 匹配到规则后，根据规则定义的问题类型进行分级
5. 一般问题记录到数据库并通知综合Agent
6. 严重问题立即通知综合Agent，综合评估后决定是否上报领导
7. 重大问题直接通过紧急通道通知领导Agent

**伪代码**：

```
class ReviewerAgent:
    
    // 规则库定义
    detection_rules = [
        {type: "error_keyword", keywords: ["ERROR", "FAIL", "timeout"], level: "critical"},
        {type: "duration_threshold", max_duration_ms: 300000, level: "warning"},
        {type: "resource_threshold", max_memory_mb: 4096, level: "warning"},
        {type: "retry_count", max_retries: 3, level: "serious"},
        {type: "output_quality", min_score: 60, level: "serious"},
    ]
    
    function onTaskAssigned(event):
        subtask_id = event.subtask_id
        worker_id = event.assignee_id
        
        // 建立与组员Agent的日志流连接
        logStream = communicationManager.streamFromAgent(worker_id, subtask_id)
        
        // 启动异步监控协程
        async.startMonitoring(subtask_id, logStream)
    
    async function startMonitoring(subtask_id, logStream):
        while logStream.hasData():
            logEntry = logStream.next()
            
            // 对每条日志进行规则匹配
            for each rule in detection_rules:
                if matchRule(logEntry, rule):
                    problem = {
                        task_id: subtask_id,
                        rule_type: rule.type,
                        level: rule.level,
                        message: formatMessage(rule, logEntry),
                        timestamp: now()
                    }
                    
                    // 根据问题等级上报
                    switch problem.level:
                        case "info":
                            db.insert("problems", problem)
                            break
                        case "warning":
                            db.insert("problems", problem)
                            eventBus.publish("problem.detected", problem)
                            break
                        case "serious":
                            // 同步通知综合Agent
                            integratorAgent.reportSeriousProblem(problem)
                            break
                        case "critical":
                            // 直接通过紧急通道通知领导
                            leaderAgent.reportCriticalProblem(problem)
                            break
            
            // 如果接收到停止监控信号，退出循环
            if stopSignal.received():
                break
    
    function matchRule(logEntry, rule):
        switch rule.type:
            case "error_keyword":
                return any(keyword in logEntry.message for keyword in rule.keywords)
            case "duration_threshold":
                return logEntry.duration_ms > rule.max_duration_ms
            case "retry_count":
                return logEntry.retry_count > rule.max_retries
            // ...其他规则匹配逻辑
```

### 1.4 阶段评审与智能回退

**业务逻辑**：综合Agent在预设评审节点对中间结果进行质量检查。

**核心流程**：
1. 组员完成当前阶段后，提交中间结果给综合Agent
2. 综合Agent触发阶段评审
3. 收集该阶段的执行日志、检测报告和中间结果
4. 构建评审提示词，调用大模型进行自动评审
5. 评审通过：通知组员继续下一阶段
6. 评审不通过：生成修正意见，通知组员修正
7. 超过最大重试次数：升级为严重问题，上报领导

**伪代码**：

```
class IntegratorAgent:
    
    function conductPhaseReview(subtask_id, phase, intermediateResult):
        subtask = db.get("multi_agent_subtasks", subtask_id)
        
        // 1. 收集评审所需上下文
        executionLogs = db.query(
            "SELECT * FROM execution_logs WHERE subtask_id = ?", subtask_id
        )
        problems = db.query(
            "SELECT * FROM problems WHERE task_id = ?", subtask_id
        )
        
        // 2. 构建评审提示词
        prompt = buildPrompt([
            "请对以下任务中间结果进行严格评审：",
            "任务描述：" + subtask.description,
            "当前阶段：" + phase,
            "中间结果：" + intermediateResult,
            "执行日志摘要：" + summarizeLogs(executionLogs),
            "已检测到的问题：" + problems.toJSON(),
            "评审标准：",
            "1. 数据格式是否符合要求",
            "2. 内容是否完整准确",
            "3. 是否有明显的逻辑错误",
            "请返回JSON格式：{passed: bool, score: 0-100, comments: str, suggestions: str}"
        ])
        
        // 3. 调用大模型评审
        response = llm.invoke(prompt)
        reviewResult = parseJSON(response)
        
        // 4. 记录评审结果
        db.insert("review_records", {
            subtask_id: subtask_id,
            phase: phase,
            passed: reviewResult.passed,
            score: reviewResult.score,
            comments: reviewResult.comments,
            timestamp: now()
        })
        
        // 5. 处理评审结果
        if reviewResult.passed:
            eventBus.publish("review.passed", {
                subtask_id: subtask_id,
                next_phase: getNextPhase(phase)
            })
            return {success: true, action: "continue"}
        else:
            // 检查重试次数
            subtask.review_failure_count += 1
            db.update("multi_agent_subtasks", subtask_id, subtask)
            
            if subtask.review_failure_count >= MAX_RETRIES:
                // 超过最大重试次数，升级为严重问题
                eventBus.publish("problem.detected", {
                    task_id: subtask_id,
                    level: "serious",
                    message: "阶段评审" + MAX_RETRIES + "次不通过"
                })
                return {success: false, action: "escalate"}
            else:
                // 通知组员修正
                eventBus.publish("review.revision_required", {
                    subtask_id: subtask_id,
                    comments: reviewResult.comments,
                    suggestions: reviewResult.suggestions
                })
                return {success: false, action: "revise"}
```

### 1.5 多子任务结果整合

**业务逻辑**：所有子任务完成后，综合Agent将碎片化结果整合成统一输出。

**核心流程**：
1. 监听所有子任务完成事件
2. 当主任务的所有子任务都完成时，触发整合流程
3. 收集所有子任务结果
4. 构建整合提示词，调用大模型
5. 大模型按预期输出格式生成最终结果
6. 更新主任务状态为`COMPLETED`
7. 通知用户并生成成本报告

**伪代码**：

```
class IntegratorAgent:
    
    function onSubtaskCompleted(event):
        subtask_id = event.subtask_id
        main_task_id = event.main_task_id
        
        // 检查主任务的所有子任务是否都已完成
        allSubtasks = db.query(
            "SELECT * FROM multi_agent_subtasks WHERE main_task_id = ?", main_task_id
        )
        
        if all(allSubtasks, status == "COMPLETED"):
            // 所有子任务完成，启动整合
            async.integrateResults(main_task_id)
    
    async function integrateResults(main_task_id):
        mainTask = db.get("multi_agent_tasks", main_task_id)
        subtasks = db.query(
            "SELECT * FROM multi_agent_subtasks WHERE main_task_id = ?", main_task_id
        )
        
        // 1. 收集所有子任务结果
        subtaskResults = {}
        for each subtask in subtasks:
            subtaskResults[subtask.id] = {
                description: subtask.description,
                result: subtask.result,
                cost: subtask.actual_cost
            }
        
        // 2. 构建整合提示词
        prompt = buildPrompt([
            "请整合以下多个子任务的结果，生成最终输出：",
            "主任务描述：" + mainTask.description,
            "预期输出格式：" + mainTask.expectedOutput,
            "子任务结果：" + subtaskResults.toJSON(),
            "请确保逻辑连贯、内容完整，严格按照预期输出格式组织内容。"
        ])
        
        // 3. 调用大模型整合
        response = llm.invoke(prompt)
        finalResult = response.content
        
        // 4. 存储最终结果
        db.update("multi_agent_tasks", main_task_id, {
            status: "COMPLETED",
            result: finalResult,
            completed_at: now()
        })
        
        // 5. 通知用户
        notificationService.send(mainTask.client_id, {
            title: "任务已完成",
            body: "您的任务" + mainTask.description.truncate(50) + "已完成",
            task_id: main_task_id
        })
        
        // 6. 生成成本报告
        costManager.generateReport(main_task_id)
```

---

## 第二阶段深入：跨框架任务分发与A2A协作

### 2.1 Agent Card能力描述与注册

**业务逻辑**：无论用什么框架开发，Agent注册时需提交一份标准化的能力描述文档。

**Agent Card核心字段**：
- `id`: 全局唯一标识（DID）
- `name`: 人类可读名称
- `capabilities`: 能力标签列表，如["data_collection", "sentiment_analysis"]
- `endpoint`: A2A通信端点URL
- `input_schema`: 输入参数JSON Schema
- `output_schema`: 输出结果JSON Schema
- `reputation`: 信誉分（初始0，动态更新）
- `supported_protocols`: 支持的协议版本，如["A2A/v1.0"]

**伪代码**：

```
function registerAgent(agentInfo):
    // 1. 验证Agent Card格式
    if not validateAgentCard(agentInfo):
        return error("Agent Card格式不符合规范")
    
    // 2. 检查是否已注册（通过DID）
    existing = db.get("agents", agentInfo.id)
    if existing:
        // 更新已有记录
        db.update("agents", agentInfo.id, agentInfo)
    else:
        // 创建新记录
        db.insert("agents", {
            id: agentInfo.id,
            name: agentInfo.name,
            capabilities: agentInfo.capabilities,
            endpoint: agentInfo.endpoint,
            input_schema: agentInfo.input_schema,
            output_schema: agentInfo.output_schema,
            reputation: 0.0,
            status: "ONLINE",
            registered_at: now()
        })
    
    // 3. 发布Agent上线事件
    eventBus.publish("agent.registered", {
        agent_id: agentInfo.id,
        capabilities: agentInfo.capabilities
    })
    
    return {success: true, agent_id: agentInfo.id}
```

### 2.2 跨框架任务分发的A2A网关实现

**业务逻辑**：领导Agent分配任务时，通过A2A网关向目标Agent发送标准化任务消息。

**核心流程**：
1. 领导Agent确定目标Agent的A2A端点
2. 构建A2A标准任务消息
3. 通过A2A网关发送到目标端点
4. 目标Agent执行完成后，通过回调URL或直接返回结果
5. A2A网关处理响应，更新任务状态

**伪代码**：

```
class A2AGateway:
    
    function dispatchTask(subtask, targetAgent):
        // 1. 构建A2A标准任务消息
        taskMessage = {
            protocol: "A2A",
            version: "1.0",
            message_type: "task_request",
            message_id: generateUUID(),
            task_id: subtask.id,
            description: subtask.description,
            parameters: subtask.parameters,
            callback_url: getServiceURL() + "/a2a/callback/" + subtask.id,
            deadline: now() + subtask.timeout_ms,
            budget: subtask.cost_limit
        }
        
        // 2. 签名消息（用于验证来源）
        signedMessage = signWithPlatformKey(taskMessage)
        
        // 3. 通过HTTP POST发送到目标Agent的A2A端点
        response = http.post(
            targetAgent.endpoint + "/a2a/task",
            body: signedMessage,
            headers: {"Content-Type": "application/json"},
            timeout: 5000  // 5秒连接超时
        )
        
        if response.status == 202:  // Accepted
            // Agent已接收任务，更新状态
            db.update("multi_agent_subtasks", subtask.id, {
                status: "EXECUTING",
                dispatched_at: now()
            })
            return {success: true, message: "任务已分发"}
        else:
            // 分发失败，尝试下一个候选Agent
            return {success: false, message: "Agent拒绝任务"}
    
    function handleTaskCallback(callbackData):
        subtask_id = callbackData.task_id
        
        // 1. 验证消息签名
        if not verifySignature(callbackData):
            return error("签名验证失败")
        
        // 2. 更新子任务状态
        subtask = db.get("multi_agent_subtasks", subtask_id)
        
        switch callbackData.status:
            case "completed":
                db.update("multi_agent_subtasks", subtask_id, {
                    status: "PENDING_REVIEW",
                    result: callbackData.result,
                    completed_at: now()
                })
                // 通知综合Agent进行阶段评审
                eventBus.publish("subtask.completed", {
                    subtask_id: subtask_id,
                    main_task_id: subtask.main_task_id,
                    result: callbackData.result
                })
                break
            case "failed":
                db.update("multi_agent_subtasks", subtask_id, {
                    status: "FAILED",
                    error: callbackData.error
                })
                // 通知领导Agent重新分配
                eventBus.publish("subtask.failed", {
                    subtask_id: subtask_id,
                    error: callbackData.error
                })
                break
            case "progress":
                // 更新进度
                db.update("multi_agent_subtasks", subtask_id, {
                    progress: callbackData.progress
                })
                break
        
        return {success: true}
```

### 2.3 跨框架的信誉与身份传递

**业务逻辑**：Agent在不同框架中积累的信誉，通过DID和可验证凭证实现跨框架传递。

**核心流程**：
1. 为每个Agent创建DID（去中心化标识符）
2. 每次任务完成后，更新该Agent的信誉分
3. 信誉分作为Agent Card的一部分，跟随DID跨框架传播
4. 其他框架或平台可验证信誉分的真实性

**伪代码**：

```
function updateAgentReputation(agent_id, taskResult):
    // 1. 获取Agent当前信誉数据
    agent = db.get("agents", agent_id)
    
    // 2. 计算本次任务的信誉增量
    reputationDelta = calculateDelta(taskResult)
    // - 成功完成任务: +0.1
    // - 高质量完成（评分>=80）: +0.2
    // - 失败: -0.3
    // - 被评审打回: -0.1
    
    // 3. 使用贝叶斯平均法更新信誉分
    // 公式: new_score = (old_score * total_tasks + delta * C) / (total_tasks + C)
    // 其中C为平滑因子，避免样本少时波动过大
    C = 5  // 平滑因子
    new_reputation = (agent.reputation * agent.total_tasks + reputationDelta * C) / (agent.total_tasks + C)
    
    // 4. 更新数据库
    db.update("agents", agent_id, {
        reputation: new_reputation,
        total_tasks: agent.total_tasks + 1,
        last_evaluated_at: now()
    })
    
    // 5. 更新Agent Card中的信誉字段
    agentCard = generateAgentCard(agent_id)  // 重新生成包含新信誉分的Agent Card
    
    // 6. 将信誉变更记录到审计日志
    db.insert("reputation_logs", {
        agent_id: agent_id,
        old_reputation: agent.reputation,
        new_reputation: new_reputation,
        delta: reputationDelta,
        task_id: taskResult.task_id,
        timestamp: now()
    })
    
    return new_reputation
```

---

好的，我们继续深入第三到第五阶段。

---

## 第三阶段深入：平台AI助理与任务市场

### 3.1 自然语言意图识别与任务转化

**业务逻辑**：用户通过自然语言与平台AI助理交互，AI助理需要理解用户意图，将模糊的指令转化为结构化的任务描述，并自动判断是直接分配给特定Agent，还是发布到任务市场竞标。

**核心流程**：
1. 用户输入自然语言指令（如“帮我生成一份上周的销售分析报告”）
2. AI助理调用大模型进行意图识别，提取关键信息：任务类型、时间范围、输出格式、是否紧急、预算上限等
3. AI助理根据意图分类决定执行路径：
    - 简单查询：直接调用合适的Agent立即执行
    - 复杂任务：启动协作流程（领导Agent分解）
    - 需要人工决策：发布到任务市场
4. 将提取的参数结构化，创建任务记录
5. 返回给用户一个任务ID和预估完成时间

**伪代码**：

```
class AIAssistant:
    
    function processUserCommand(userId, command, context):
        // 1. 意图识别与槽位填充
        intentResult = llm.invoke(buildPrompt([
            "你是一个AI助理，请分析用户指令并提取关键信息。",
            "用户指令：" + command,
            "对话上下文：" + context.toJSON(),
            "请返回JSON格式：",
            "{",
            "  intent: 'task_submission' | 'simple_query' | 'agent_control',",
            "  task_type: str,          // 任务类型",
            "  description: str,        // 任务描述",
            "  expected_output: str,    // 预期输出格式",
            "  deadline: str | null,    // 截止时间",
            "  budget: number | null,   // 预算上限",
            "  urgency: 'low' | 'medium' | 'high',",
            "  target_agent_id: str | null  // 是否指定Agent"
            "}"
        ]))
        
        parsedIntent = parseJSON(intentResult)
        
        // 2. 根据意图执行不同逻辑
        switch parsedIntent.intent:
            case "simple_query":
                return handleSimpleQuery(userId, parsedIntent)
            case "task_submission":
                return handleTaskSubmission(userId, parsedIntent)
            case "agent_control":
                return handleAgentControl(userId, parsedIntent)
            default:
                return {reply: "抱歉，我无法理解您的指令，请换一种方式描述。"}
    
    function handleTaskSubmission(userId, intent):
        // 1. 评估任务复杂度
        complexity = evaluateComplexity(intent.description)
        // - simple: 单步任务，直接分配
        // - medium: 需要2-3步，启动协作
        // - complex: 需要4步以上，启动完整协作流程
        
        // 2. 成本预估
        estimatedCost = costManager.estimate(intent.description, intent.task_type)
        
        // 3. 检查是否指定了目标Agent
        if intent.target_agent_id:
            // 直接分配给指定Agent
            agent = agentRegistry.get(intent.target_agent_id)
            if agent and agent.status == "ONLINE":
                return assignDirectTask(agent, intent)
            else:
                return {reply: "指定的Agent当前不可用，是否转为公开发布？"}
        
        // 4. 根据复杂度决定执行方式
        if complexity == "simple":
            // 直接找最合适的Agent执行
            bestAgent = findBestAgent(intent.task_type)
            if bestAgent:
                return assignDirectTask(bestAgent, intent)
            else:
                return {reply: "当前没有可用的Agent，任务已发布到市场等待接单。"}
        else:
            // 启动协作流程
            task = multiAgentService.submitAndDecompose({
                description: intent.description,
                taskType: intent.task_type,
                expectedOutput: intent.expected_output,
                budget: intent.budget,
                userId: userId
            })
            return {
                reply: "已为您创建协作任务（ID: " + task.id + "），预计" + estimatedCost.duration + "分钟完成。",
                task_id: task.id,
                estimated_cost: estimatedCost.total,
                estimated_duration: estimatedCost.duration
            }
    
    function evaluateComplexity(description):
        // 调用大模型评估任务复杂度
        result = llm.invoke(buildPrompt([
            "请评估以下任务的复杂度，只返回一个词：",
            "任务：" + description,
            "simple: 单步即可完成，如翻译、摘要",
            "medium: 需要2-3步，如数据采集+分析",
            "complex: 需要4步以上，如完整的报告生成"
        ]))
        return result.content.trim().lower()
```

### 3.2 任务市场自动匹配与竞标

**业务逻辑**：任务市场中的任务可以被Agent自动发现、竞标和接取，形成一个供需匹配的市场机制。

**核心流程**：
1. 用户发布任务到市场（可设置公开或指定能力要求）
2. Agent开发者设置自动接单规则（匹配的任务类型、价格阈值、信誉要求等）
3. 任务市场定时扫描新任务，匹配Agent的接单规则
4. 匹配成功的Agent自动竞标或接单
5. 多个Agent竞标时，用户可选择（或系统自动选择最优）
6. 接单后，任务自动转化为协作流程

**伪代码**：

```
class TaskMarket:
    
    function publishTask(taskInfo, userId):
        // 1. 创建市场任务
        marketTask = db.insert("market_tasks", {
            publisher_id: userId,
            description: taskInfo.description,
            task_type: taskInfo.task_type,
            required_capabilities: taskInfo.capabilities,
            budget: taskInfo.budget,
            deadline: taskInfo.deadline,
            status: "OPEN",
            created_at: now()
        })
        
        // 2. 发布事件，通知所有在线的Agent
        eventBus.publish("market.task_published", {
            task_id: marketTask.id,
            task_type: marketTask.task_type,
            budget: marketTask.budget,
            capabilities: marketTask.required_capabilities
        })
        
        return marketTask
    
    function autoMatchAgent(task):
        // 1. 查询匹配的Agent（考虑能力、信誉、历史表现）
        matchingAgents = db.query("""
            SELECT a.* FROM agents a
            WHERE a.status = 'ONLINE'
            AND a.capabilities @> ARRAY[?]
            AND a.reputation >= ?
            ORDER BY a.reputation DESC, a.completed_tasks DESC
            LIMIT 5
        """, task.required_capabilities, MIN_REPUTATION_FOR_AUTO_MATCH)
        
        // 2. 对每个匹配的Agent，检查其自动接单规则
        for each agent in matchingAgents:
            autoRule = db.get("agent_auto_rules", agent.id)
            if autoRule and matchAutoRule(autoRule, task):
                // 自动接单
                return acceptTask(task.id, agent.id)
        
        // 3. 没有自动匹配的Agent，任务保持OPEN状态等待手动接单
        return null
    
    function matchAutoRule(rule, task):
        // 检查Agent的自动接单规则是否匹配此任务
        if rule.max_budget and task.budget > rule.max_budget:
            return false
        if rule.min_budget and task.budget < rule.min_budget:
            return false
        if rule.excluded_types and task.task_type in rule.excluded_types:
            return false
        if rule.only_types and task.task_type not in rule.only_types:
            return false
        return true
    
    function acceptTask(taskId, agentId):
        // 1. 更新任务状态
        success = db.update("market_tasks", taskId, {
            status: "ASSIGNED",
            assignee_id: agentId,
            assigned_at: now()
        })
        
        if not success:
            return {error: "任务已被其他人接取"}
        
        // 2. 创建协作任务（转入内部流程）
        task = db.get("market_tasks", taskId)
        collaborationTask = multiAgentService.submitAndDecompose({
            description: task.description,
            taskType: task.task_type,
            expectedOutput: task.expected_output,
            budget: task.budget,
            userId: task.publisher_id
        })
        
        // 3. 通知发布者
        notificationService.send(task.publisher_id, {
            title: "任务已被接取",
            body: "Agent " + agentId + " 正在执行您的任务",
            task_id: taskId
        })
        
        return {success: true, collaboration_task_id: collaborationTask.id}
```

### 3.3 任务执行全流程追踪

**业务逻辑**：无论是通过AI助理还是任务市场发起的任务，用户都能在统一界面追踪任务的完整生命周期。

**核心流程**：
1. 提供统一的任务列表视图，合并AI助理任务和市场任务
2. 每个任务展示当前状态、进度、已消耗成本
3. 点击进入详情，展示任务分解图（DAG）、各子任务状态、执行日志
4. 支持用户手动干预：暂停、恢复、终止、修改预算

**伪代码**：

```
class TaskTracker:
    
    function getUserTasks(userId):
        // 1. 合并两种来源的任务
        aiTasks = db.query(
            "SELECT *, 'ai_assistant' as source FROM multi_agent_tasks WHERE client_id = ?", userId
        )
        marketTasks = db.query(
            "SELECT *, 'market' as source FROM market_tasks WHERE publisher_id = ?", userId
        )
        
        allTasks = mergeAndSortByTime(aiTasks, marketTasks)
        
        // 2. 为每个任务附加实时状态信息
        for each task in allTasks:
            task.progress = calculateProgress(task.id)
            task.current_cost = costManager.getTaskCost(task.id)
            task.active_agents = getActiveAgents(task.id)
        
        return allTasks
    
    function getTaskDetail(taskId):
        // 1. 获取任务基本信息
        task = db.get("multi_agent_tasks", taskId)
        
        // 2. 获取子任务及其依赖关系（用于DAG图）
        subtasks = db.query(
            "SELECT * FROM multi_agent_subtasks WHERE main_task_id = ?", taskId
        )
        
        // 构建DAG节点和边
        nodes = subtasks.map(s => ({
            id: s.id,
            label: s.description.truncate(30),
            status: s.status,
            assignee: s.assignee_id,
            progress: s.progress,
            cost: s.actual_cost
        }))
        
        edges = []
        for each subtask in subtasks:
            for each dep_id in subtask.dependencies:
                edges.push({from: dep_id, to: subtask.id})
        
        // 3. 获取执行时间线（按时间排序的所有事件）
        timeline = db.query("""
            SELECT * FROM (
                SELECT 'task_created' as event_type, created_at as timestamp, task_id as id FROM multi_agent_tasks WHERE id = ?
                UNION ALL
                SELECT 'subtask_' || status as event_type, updated_at as timestamp, id FROM multi_agent_subtasks WHERE main_task_id = ?
                UNION ALL
                SELECT 'review_' || CASE WHEN passed THEN 'passed' ELSE 'failed' END, timestamp, subtask_id FROM review_records WHERE subtask_id IN (SELECT id FROM multi_agent_subtasks WHERE main_task_id = ?)
            ) ORDER BY timestamp ASC
        """, taskId, taskId, taskId)
        
        // 4. 获取成本明细
        costDetail = costManager.getTaskCostDetail(taskId)
        
        return {
            task: task,
            dag: {nodes: nodes, edges: edges},
            timeline: timeline,
            cost: costDetail
        }
    
    function pauseTask(taskId, userId):
        task = db.get("multi_agent_tasks", taskId)
        
        // 权限检查
        if task.client_id != userId:
            return error("无权操作此任务")
        
        // 更新状态
        db.update("multi_agent_tasks", taskId, {status: "PAUSED"})
        
        // 通知所有相关Agent暂停
        eventBus.publish("task.paused", {task_id: taskId})
        
        return {success: true, message: "任务已暂停"}
    
    function resumeTask(taskId, userId):
        // 类似pauseTask，更新状态为EXECUTING并发布resume事件
        db.update("multi_agent_tasks", taskId, {status: "EXECUTING"})
        eventBus.publish("task.resumed", {task_id: taskId})
        return {success: true}
    
    function terminateTask(taskId, userId, reason):
        task = db.get("multi_agent_tasks", taskId)
        
        if task.client_id != userId:
            return error("无权操作此任务")
        
        // 紧急终止
        db.update("multi_agent_tasks", taskId, {
            status: "TERMINATED",
            termination_reason: reason
        })
        
        // 通知所有Agent终止
        eventBus.publish("task.terminated", {task_id: taskId, reason: reason})
        
        // 清算成本
        finalCost = costManager.settleTask(taskId)
        
        return {success: true, final_cost: finalCost}
```

---

## 第四阶段深入：可视化与独立对话

### 4.1 协作流程DAG图可视化

**业务逻辑**：将任务分解结果实时渲染为有向无环图，节点颜色和动画反映子任务状态。

**核心流程**：
1. 获取任务的子任务列表和依赖关系
2. 使用拓扑排序算法布局节点（避免连线交叉）
3. 根据状态映射节点颜色：PENDING灰、EXECUTING绿、PENDING_REVIEW黄、COMPLETED蓝、FAILED红
4. 执行中的节点显示呼吸灯动画
5. 连线表示依赖关系，完成后变实线
6. 点击节点展开聚焦面板，显示该子任务详情

**伪代码**：

```
class DAGVisualizer:
    
    // 状态到颜色的映射
    colorMap = {
        "PENDING": "#D1D5DB",      // 灰色
        "ASSIGNED": "#74B9FF",     // 蓝色
        "EXECUTING": "#00B894",    // 绿色（带呼吸动画）
        "PENDING_REVIEW": "#FDCB6E", // 黄色
        "REVISING": "#E17055",     // 橙色
        "COMPLETED": "#6C5CE7",    // 紫色
        "FAILED": "#E17055",       // 红色
        "TERMINATED": "#9CA3AF"    // 深灰
    }
    
    function buildDAGData(taskId):
        subtasks = db.query(
            "SELECT * FROM multi_agent_subtasks WHERE main_task_id = ?", taskId
        )
        
        // 1. 拓扑排序布局
        layout = topologicalLayout(subtasks)
        
        // 2. 构建节点
        nodes = []
        for each subtask in subtasks:
            node = {
                id: subtask.id,
                type: "subtask",
                position: layout[subtask.id],
                data: {
                    label: subtask.description.truncate(40),
                    status: subtask.status,
                    assignee: subtask.assignee_id,
                    progress: subtask.progress,
                    cost: subtask.actual_cost
                },
                style: {
                    background: colorMap[subtask.status],
                    border: subtask.status == "EXECUTING" ? "2px solid #00B894" : "1px solid #E2E8F0",
                    animation: subtask.status == "EXECUTING" ? "breath 2s infinite" : "none"
                }
            }
            nodes.push(node)
        
        // 3. 构建边（依赖关系）
        edges = []
        for each subtask in subtasks:
            for each depId in subtask.dependencies:
                depSubtask = findById(subtasks, depId)
                edge = {
                    id: depId + "->" + subtask.id,
                    source: depId,
                    target: subtask.id,
                    animated: subtask.status == "EXECUTING",
                    style: {
                        stroke: depSubtask.status == "COMPLETED" ? "#6C5CE7" : "#D1D5DB",
                        strokeWidth: depSubtask.status == "COMPLETED" ? 2 : 1
                    }
                }
                edges.push(edge)
        
        return {nodes: nodes, edges: edges}
    
    function topologicalLayout(subtasks):
        // 实现拓扑排序布局算法
        // 1. 计算每个节点的入度
        // 2. 将入度为0的节点放在第一层
        // 3. 逐层放置，同一层节点水平均匀分布
        // 4. 返回每个节点的{x, y}坐标
        
        layers = []
        visited = set()
        
        // 找到所有根节点（无依赖）
        roots = subtasks.filter(s => s.dependencies.isEmpty())
        layers.push(roots)
        visited.addAll(roots.map(s => s.id))
        
        // BFS逐层遍历
        currentLayer = roots
        while currentLayer.notEmpty():
            nextLayer = []
            for each node in currentLayer:
                // 找到所有依赖当前节点的子节点
                children = subtasks.filter(s => node.id in s.dependencies)
                for each child in children:
                    if child.id not in visited:
                        // 检查child的所有依赖是否都已访问
                        if all(dep in visited for dep in child.dependencies):
                            nextLayer.push(child)
                            visited.add(child.id)
            
            if nextLayer.notEmpty():
                layers.push(nextLayer)
            currentLayer = nextLayer
        
        // 为每层分配坐标
        positions = {}
        for layerIndex, layer in enumerate(layers):
            y = layerIndex * 150  // 层间距150px
            for nodeIndex, node in enumerate(layer):
                x = (nodeIndex - (layer.length - 1) / 2) * 250  // 节点间距250px
                positions[node.id] = {x: x, y: y}
        
        return positions
```

### 4.2 执行时间线与日志流展示

**业务逻辑**：按时间顺序展示任务执行过程中的所有事件，模仿终端的日志流风格。

**核心流程**：
1. 查询所有相关事件（任务创建、分配、执行、评审、完成等）
2. 按时间倒序排列
3. 不同事件类型使用不同图标和颜色
4. 日志流支持实时WebSocket推送
5. 支持关键词搜索和级别过滤（INFO/WARN/ERROR）

**伪代码**：

```
class TimelineView:
    
    function getTaskTimeline(taskId):
        // 合并所有事件源
        events = []
        
        // 任务状态变更
        taskEvents = db.query(
            "SELECT 'task_status' as type, status, created_at as timestamp FROM task_status_log WHERE task_id = ?", taskId
        )
        events.extend(taskEvents)
        
        // 子任务状态变更
        subtaskEvents = db.query(
            "SELECT 'subtask_status' as type, status, assignee_id, updated_at as timestamp FROM multi_agent_subtasks WHERE main_task_id = ?", taskId
        )
        events.extend(subtaskEvents)
        
        // 评审记录
        reviewEvents = db.query(
            "SELECT 'review' as type, passed, score, comments, timestamp FROM review_records WHERE subtask_id IN (SELECT id FROM multi_agent_subtasks WHERE main_task_id = ?)", taskId
        )
        events.extend(reviewEvents)
        
        // 问题上报
        problemEvents = db.query(
            "SELECT 'problem' as type, level, message, timestamp FROM problems WHERE task_id IN (SELECT id FROM multi_agent_subtasks WHERE main_task_id = ?)", taskId
        )
        events.extend(problemEvents)
        
        // 成本记录
        costEvents = db.query(
            "SELECT 'cost' as type, amount, cost_type, timestamp FROM cost_records WHERE task_id = ?", taskId
        )
        events.extend(costEvents)
        
        // 按时间排序（最新的在前）
        events.sortBy("timestamp", descending=true)
        
        // 为每个事件生成显示信息
        for each event in events:
            event.icon = getEventIcon(event.type)
            event.color = getEventColor(event.type, event.status)
            event.description = formatEventDescription(event)
        
        return events
    
    function getEventIcon(eventType):
        icons = {
            "task_status": "📋",
            "subtask_status": "🔧",
            "review": "✅",
            "problem": "⚠️",
            "cost": "💰"
        }
        return icons.get(eventType, "📌")
    
    function getEventColor(eventType, status):
        if eventType == "problem":
            if status == "critical": return "#E17055"
            if status == "serious": return "#FDCB6E"
            return "#74B9FF"
        if eventType == "review":
            if status == true: return "#00B894"
            return "#E17055"
        return "#6B7280"
    
    // WebSocket实时推送
    function subscribeToTaskTimeline(taskId, callback):
        // 订阅任务相关的事件频道
        eventBus.subscribe("task." + taskId + ".*", (event) => {
            callback(event)
        })
        
        // 返回取消订阅函数
        return () => eventBus.unsubscribe("task." + taskId + ".*")
```

### 4.3 单Agent独立对话

**业务逻辑**：提供与单个Agent的直接对话界面，用于测试、调试和简单任务执行。

**核心流程**：
1. 用户选择一个已注册的Agent
2. 打开对话窗口，显示历史对话记录
3. 用户输入指令，Agent执行并返回结果
4. 对话历史保存在本地SQLite数据库
5. 支持多轮对话（Agent记住上下文）

**伪代码**：

```
class AgentChat:
    
    function sendMessage(agentId, message, conversationId):
        // 1. 获取或创建对话
        if not conversationId:
            conversationId = createConversation(agentId)
        
        // 2. 保存用户消息
        db.insert("chat_messages", {
            conversation_id: conversationId,
            role: "user",
            content: message,
            timestamp: now()
        })
        
        // 3. 获取对话历史（最近10轮）
        history = db.query(
            "SELECT role, content FROM chat_messages WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT 20", conversationId
        ).reverse()
        
        // 4. 通过A2A协议发送给Agent
        agent = agentRegistry.get(agentId)
        if not agent or agent.status != "ONLINE":
            return {error: "Agent不可用"}
        
        // 构建A2A对话请求
        response = a2aGateway.sendMessage(agent.endpoint, {
            type: "conversation",
            conversation_id: conversationId,
            message: message,
            history: history
        })
        
        // 5. 保存Agent回复
        db.insert("chat_messages", {
            conversation_id: conversationId,
            role: "assistant",
            content: response.content,
            timestamp: now(),
            metadata: {
                tokens_used: response.tokens,
                cost: response.cost,
                tools_called: response.tools
            }
        })
        
        return {
            conversation_id: conversationId,
            reply: response.content,
            tokens: response.tokens,
            cost: response.cost
        }
    
    function createConversation(agentId):
        return db.insert("conversations", {
            agent_id: agentId,
            created_at: now(),
            status: "active"
        }).id
    
    function getConversationHistory(conversationId):
        return db.query(
            "SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY timestamp ASC", conversationId
        )
    
    function listAgentConversations(agentId):
        return db.query(
            "SELECT * FROM conversations WHERE agent_id = ? ORDER BY updated_at DESC", agentId
        )
```

---

## 第五阶段深入：成本归因与预算控制闭环

### 5.1 全链路成本追踪与归因

**业务逻辑**：将Sidecar代理拦截的每笔API调用，打上完整的多维标签（任务ID、子任务ID、Agent ID、工具类型），实现精确到步骤的成本归因。

**核心流程**：
1. Sidecar代理拦截API调用时，从请求头中提取上下文标签（X-Task-ID, X-Subtask-ID, X-Agent-ID）
2. 记录每笔调用的Token消耗和费用
3. 提供按任务、按Agent、按工具、按时间维度的聚合查询
4. 实时更新任务的累计成本
5. 与预算上限对比，触发预警或熔断

**伪代码**：

```
class CostTracker:
    
    function recordCost(costEntry):
        // costEntry包含：task_id, subtask_id, agent_id, tool_type, 
        //              model, input_tokens, output_tokens, cost_amount
        
        // 1. 写入成本记录表
        db.insert("cost_records", {
            task_id: costEntry.task_id,
            subtask_id: costEntry.subtask_id,
            agent_id: costEntry.agent_id,
            tool_type: costEntry.tool_type,
            model: costEntry.model,
            input_tokens: costEntry.input_tokens,
            output_tokens: costEntry.output_tokens,
            cost_amount: costEntry.cost_amount,
            timestamp: now()
        })
        
        // 2. 更新子任务的累计成本
        db.execute(
            "UPDATE multi_agent_subtasks SET actual_cost = actual_cost + ? WHERE id = ?",
            costEntry.cost_amount, costEntry.subtask_id
        )
        
        // 3. 更新主任务的累计成本
        subtask = db.get("multi_agent_subtasks", costEntry.subtask_id)
        db.execute(
            "UPDATE multi_agent_tasks SET actual_cost = actual_cost + ? WHERE id = ?",
            costEntry.cost_amount, subtask.main_task_id
        )
        
        // 4. 检查是否触发预算预警
        checkBudgetAlert(subtask.main_task_id)
    
    function getTaskCostDetail(taskId):
        // 按维度聚合成本
        byAgent = db.query("""
            SELECT agent_id, SUM(cost_amount) as total_cost, 
                   SUM(input_tokens) as total_input, SUM(output_tokens) as total_output
            FROM cost_records WHERE task_id = ? GROUP BY agent_id
        """, taskId)
        
        bySubtask = db.query("""
            SELECT subtask_id, SUM(cost_amount) as total_cost
            FROM cost_records WHERE task_id = ? GROUP BY subtask_id
        """, taskId)
        
        byTool = db.query("""
            SELECT tool_type, COUNT(*) as call_count, SUM(cost_amount) as total_cost
            FROM cost_records WHERE task_id = ? GROUP BY tool_type
        """, taskId)
        
        byModel = db.query("""
            SELECT model, SUM(input_tokens) as total_input, SUM(output_tokens) as total_output,
                   SUM(cost_amount) as total_cost
            FROM cost_records WHERE task_id = ? GROUP BY model
        """, taskId)
        
        total = db.query(
            "SELECT SUM(cost_amount) as total_cost FROM cost_records WHERE task_id = ?", taskId
        ).first()
        
        return {
            total_cost: total.total_cost,
            by_agent: byAgent,
            by_subtask: bySubtask,
            by_tool: byTool,
            by_model: byModel
        }
    
    function checkBudgetAlert(taskId):
        task = db.get("multi_agent_tasks", taskId)
        
        if not task.budget or task.budget == 0:
            return  // 未设置预算，跳过
        
        usageRate = task.actual_cost / task.budget
        
        if usageRate >= 1.0:
            // 超过预算，触发熔断
            eventBus.publish("budget.exceeded", {
                task_id: taskId,
                actual_cost: task.actual_cost,
                budget: task.budget
            })
            
            // 通知领导Agent终止任务
            leaderAgent.terminateTask(taskId, "超过预算上限")
        
        else if usageRate >= 0.8:
            // 80%预警
            notificationService.send(task.client_id, {
                title: "预算预警",
                body: "任务已使用预算的" + (usageRate * 100).toFixed(0) + "%",
                task_id: taskId
            })
    
    function estimateTaskCost(description, taskType):
        // 1. 查询历史相似任务的实际成本
        similarTasks = db.query("""
            SELECT actual_cost FROM multi_agent_tasks 
            WHERE task_type = ? AND status = 'COMPLETED'
            ORDER BY created_at DESC LIMIT 10
        """, taskType)
        
        if similarTasks.length > 0:
            historyAvg = similarTasks.avg(t => t.actual_cost)
        else:
            historyAvg = 0
        
        // 2. 大模型辅助预估
        llmEstimate = llm.invoke(buildPrompt([
            "预估以下任务的Token消耗成本（单位：人民币元）：",
            "任务：" + description,
            "任务类型：" + taskType,
            "只返回数字，不要解释。"
        ]))
        
        llmCost = parseFloat(llmEstimate.content)
        
        // 3. 综合计算
        if historyAvg > 0 and llmCost > 0:
            estimatedTotal = historyAvg * 0.6 + llmCost * 0.4
        elif historyAvg > 0:
            estimatedTotal = historyAvg
        else:
            estimatedTotal = llmCost * 1.3  // 新任务类型增加30%缓冲
        
        // 4. 估算执行时间（基于历史数据）
        estimatedDuration = db.query("""
            SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_seconds
            FROM multi_agent_tasks 
            WHERE task_type = ? AND status = 'COMPLETED'
        """, taskType).first().avg_seconds || 300  // 默认5分钟
        
        return {
            total: estimatedTotal,
            duration: estimatedDuration,
            breakdown: {
                model_cost: estimatedTotal * 0.7,
                tool_cost: estimatedTotal * 0.2,
                resource_cost: estimatedTotal * 0.1
            }
        }
```

### 5.2 智能降本建议引擎

**业务逻辑**：分析历史成本数据，自动识别高成本环节，生成具体的降本建议。

**核心流程**：
1. 定期分析已完成任务的成本数据
2. 识别重复查询模式（建议开启语义缓存）
3. 识别高频调用的小任务（建议请求合并）
4. 识别简单任务使用昂贵模型（建议模型降级）
5. 生成优化建议并推送给用户

**伪代码**：

```
class CostOptimizer:
    
    function generateOptimizationSuggestions(userId):
        suggestions = []
        
        // 1. 检查是否有重复查询模式
        duplicateQueries = db.query("""
            SELECT SUBSTRING(description, 1, 100) as query_prefix, COUNT(*) as cnt
            FROM multi_agent_tasks 
            WHERE client_id = ? AND status = 'COMPLETED' AND created_at > ?
            GROUP BY query_prefix HAVING COUNT(*) > 3
        """, userId, now() - 7 * 86400)  // 最近7天
        
        if duplicateQueries.length > 0:
            estimatedSaving = duplicateQueries.sum(q => q.cnt) * 0.3 * 0.001
            suggestions.push({
                type: "semantic_cache",
                title: "开启语义缓存",
                description: "检测到" + duplicateQueries.length + "类重复查询",
                estimated_saving: estimatedSaving,
                action: "enable_semantic_cache"
            })
        
        // 2. 检查是否有简单任务使用昂贵模型
        simpleExpensiveTasks = db.query("""
            SELECT t.id, t.description, c.model, SUM(c.cost_amount) as total_cost
            FROM multi_agent_tasks t
            JOIN cost_records c ON c.task_id = t.id
            WHERE t.client_id = ? AND c.model IN ('gpt-4o', 'claude-3.5-sonnet')
            AND t.actual_cost < 0.01  -- 非常简单的小任务
            GROUP BY t.id, c.model
            HAVING COUNT(*) > 5
        """, userId)
        
        if simpleExpensiveTasks.length > 0:
            suggestions.push({
                type: "model_downgrade",
                title: "模型降级建议",
                description: "有" + simpleExpensiveTasks.length + "个简单任务使用了昂贵模型",
                estimated_saving: simpleExpensiveTasks.sum(t => t.total_cost) * 0.5,
                action: "enable_auto_model_routing"
            })
        
        // 3. 检查是否有高频小请求
        frequentSmallCalls = db.query("""
            SELECT tool_type, COUNT(*) as call_count, AVG(cost_amount) as avg_cost
            FROM cost_records
            WHERE task_id IN (SELECT id FROM multi_agent_tasks WHERE client_id = ?)
            AND cost_amount < 0.001
            GROUP BY tool_type HAVING COUNT(*) > 100
        """, userId)
        
        if frequentSmallCalls.length > 0:
            suggestions.push({
                type: "request_merging",
                title: "请求合并优化",
                description: "检测到高频小请求，合并可降低成本",
                estimated_saving: frequentSmallCalls.sum(c => c.call_count * c.avg_cost) * 0.2,
                action: "enable_request_merging"
            })
        
        // 4. 保存建议并推送给用户
        for each suggestion in suggestions:
            db.insert("optimization_suggestions", {
                user_id: userId,
                type: suggestion.type,
                title: suggestion.title,
                description: suggestion.description,
                estimated_saving: suggestion.estimated_saving,
                action: suggestion.action,
                status: "pending",
                created_at: now()
            })
        
        return suggestions
```

### 5.3 预算熔断器实现

**业务逻辑**：在成本超过预算上限时，自动触发任务终止或暂停。

**核心流程**：
1. 每次记录成本后，检查当前任务的预算使用率
2. 达到80%：发出预警通知
3. 达到100%：触发熔断，通知领导Agent终止任务
4. 熔断后可设置冷却期（如5分钟），期间所有新请求被拒绝
5. 用户可手动调整预算上限解除熔断

**伪代码**：

```
class BudgetCircuitBreaker:
    
    // 熔断状态
    states = {
        "CLOSED": "正常状态，请求正常通过",
        "HALF_OPEN": "半开状态，允许少量请求测试",
        "OPEN": "熔断状态，所有请求被拒绝"
    }
    
    function __init__():
        self.breakerState = "CLOSED"
        self.failureCount = 0
        self.lastFailureTime = null
        self.cooldownPeriod = 300  // 冷却期5分钟
    
    function checkBudget(taskId):
        task = db.get("multi_agent_tasks", taskId)
        
        if not task.budget or task.budget == 0:
            return {allowed: true}  // 未设置预算，放行
        
        usageRate = task.actual_cost / task.budget
        
        // 1. 检查熔断器状态
        if self.breakerState == "OPEN":
            if now() - self.lastFailureTime > self.cooldownPeriod:
                // 进入半开状态，允许少量请求
                self.breakerState = "HALF_OPEN"
                return {allowed: true, warning: "预算已超限，请尽快调整"}
            else:
                return {allowed: false, reason: "预算熔断中，请等待冷却期结束"}
        
        if self.breakerState == "HALF_OPEN":
            // 半开状态，只允许10%的请求通过
            if random() > 0.1:
                return {allowed: false, reason: "预算熔断中，部分请求被限制"}
        
        // 2. 根据使用率决策
        if usageRate >= 1.2:
            // 严重超支，立即打开熔断器
            self.breakerState = "OPEN"
            self.lastFailureTime = now()
            
            eventBus.publish("budget.critical", {
                task_id: taskId,
                usage_rate: usageRate,
                action: "circuit_breaker_opened"
            })
            
            return {allowed: false, reason: "预算严重超支，任务已自动熔断"}
        
        else if usageRate >= 1.0:
            // 达到预算上限
            eventBus.publish("budget.exceeded", {
                task_id: taskId,
                usage_rate: usageRate,
                action: "task_termination_requested"
            })
            
            return {allowed: false, reason: "已达到预算上限，请调整预算后继续"}
        
        else if usageRate >= 0.8:
            // 预警
            return {allowed: true, warning: "预算使用率" + (usageRate * 100).toFixed(0) + "%"}
        
        // 正常放行
        return {allowed: true}
    
    function resetBreaker():
        self.breakerState = "CLOSED"
        self.failureCount = 0
        self.lastFailureTime = null
    
    function adjustBudget(taskId, newBudget):
        task = db.get("multi_agent_tasks", taskId)
        
        db.update("multi_agent_tasks", taskId, {budget: newBudget})
        
        // 如果熔断器打开且新预算充足，重置熔断器
        if self.breakerState != "CLOSED" and task.actual_cost < newBudget:
            self.resetBreaker()
            return {success: true, message: "预算已调整，熔断器已重置"}
        
        return {success: true, message: "预算已调整"}
```

---
