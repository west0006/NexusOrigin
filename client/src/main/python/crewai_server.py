"""
CrewAI 多智能体协作服务
Flask 后端，支持动态 Agent 注册（Ollama 验证）+ 3 个内置 Agent 协作流水线
"""

import json
import time
import uuid
import logging
from flask import Flask, request, jsonify, Response
from flask_cors import CORS

from ollama_client import OllamaClient, estimate_tokens, DEFAULT_MODEL

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ─── 动态 Agent 注册表 ───
# 内置 3 个流水线 Agent（始终存在）
BUILTIN_AGENT_ID = "crewai-local"
agent_registry: dict[str, dict] = {}

ollama = OllamaClient()

last_heartbeat = time.time()

INSTRUCTIONS = {
    "planner": "你是一个项目计划员。请分析用户的需求，将其分解为 2-4 个具体的子任务。每个子任务用 • 开头。只需输出任务列表，不要额外解释。",
    "researcher": "你是一个研究员。基于用户的问题和已有上下文，提供详细、准确的分析和见解。引用具体的信息点。",
    "writer": "你是一个撰稿人。请将前面的分析结果整合成一份结构清晰、语言流畅的最终回答。使用标题和段落组织内容。",
}

AGENT_ORDER = ["planner", "researcher", "writer"]


def build_builtin_agent() -> dict:
    return {
        "agentId": BUILTIN_AGENT_ID,
        "name": "CrewAI 流水线",
        "framework": "crewai",
        "endpoint": "http://localhost:8001",
        "model": DEFAULT_MODEL,
        "status": "idle",
        "lastHeartbeat": int(last_heartbeat * 1000),
        "builtin": True,
        "capabilities": [
            {
                "id": "crewai-plan",
                "name": "计划员",
                "description": "分析需求，分解子任务",
                "estimatedCostPerCall": 0.001,
                "estimatedDurationMs": 15000,
            },
            {
                "id": "crewai-research",
                "name": "研究员",
                "description": "调研分析技术方案",
                "estimatedCostPerCall": 0.002,
                "estimatedDurationMs": 20000,
            },
            {
                "id": "crewai-write",
                "name": "撰稿人",
                "description": "撰写方案报告",
                "estimatedCostPerCall": 0.002,
                "estimatedDurationMs": 20000,
            },
        ],
    }


def get_all_agents() -> list[dict]:
    """返回内置 + 动态注册的所有 Agent"""
    agents = [build_builtin_agent()]
    for aid, info in agent_registry.items():
        agents.append({
            "agentId": aid,
            "name": info.get("name", aid),
            "framework": "crewai",
            "endpoint": info.get("endpoint", ""),
            "model": info.get("model", DEFAULT_MODEL),
            "status": info.get("status", "idle"),
            "lastHeartbeat": info.get("lastHeartbeat", 0),
            "builtin": False,
            "capabilities": info.get("capabilities", []),
        })
    return agents


# ─── 路由 ───

@app.route("/api/crewai/health", methods=["GET", "OPTIONS"])
def health():
    global last_heartbeat
    last_heartbeat = time.time()
    return jsonify({"status": "ok", "service": "crewai", "agents": get_all_agents()})


@app.route("/api/crewai/agents", methods=["GET"])
def list_agents():
    """列出所有已注册 Agent（含内置）"""
    return jsonify({"agents": get_all_agents()})


@app.route("/api/crewai/agents", methods=["POST", "OPTIONS"])
def register_agent():
    """
    注册一个新 Agent
    Body:
      name: str - Agent 显示名称
      model: str - Ollama 模型名（如 qwen2.5-coder:1.5b）
      endpoint: str - Ollama 服务地址（默认 http://localhost:11434）
      capabilities: list[dict] - 可选自定义能力
    """
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    model = data.get("model", DEFAULT_MODEL).strip()
    endpoint = data.get("endpoint", "http://localhost:11434").strip()
    capabilities = data.get("capabilities", [])

    if not name:
        return jsonify({"success": False, "error": "名称不能为空"}), 400

    # 验证 Ollama 模型是否存在
    logger.info(f"验证模型: {model}")
    if not OllamaClient.validate_model(model):
        return jsonify({
            "success": False,
            "error": f"模型 '{model}' 未在 Ollama 中找到。可用模型: ollama list"
        }), 400

    agent_id = f"agent_{uuid.uuid4().hex[:8]}"
    now = int(time.time() * 1000)

    agent_info = {
        "name": name,
        "model": model,
        "endpoint": endpoint,
        "status": "idle",
        "lastHeartbeat": now,
        "capabilities": capabilities or [
            {
                "id": f"custom-{agent_id[:6]}",
                "name": f"{name} 能力",
                "description": f"基于 {model} 的通用 Agent",
                "estimatedCostPerCall": 0.001,
                "estimatedDurationMs": 10000,
            }
        ],
    }

    agent_registry[agent_id] = agent_info
    logger.info(f"Agent 注册成功: {agent_id} ({name}) - 模型: {model}")

    return jsonify({
        "success": True,
        "agent": {
            "agentId": agent_id,
            **agent_info,
            "framework": "crewai",
            "builtin": False,
        }
    })


@app.route("/api/crewai/agents/<agent_id>", methods=["DELETE"])
def remove_agent(agent_id):
    if agent_id == BUILTIN_AGENT_ID:
        return jsonify({"success": False, "error": "内置 Agent 不可删除"}), 400
    if agent_id not in agent_registry:
        return jsonify({"success": False, "error": "Agent 不存在"}), 404
    info = agent_registry.pop(agent_id)
    logger.info(f"Agent 已移除: {agent_id} ({info.get('name', '')})")
    return jsonify({"success": True})


@app.route("/api/crewai/register", methods=["POST"])
def register_legacy():
    """向后兼容的旧注册端点"""
    data = request.get_json() or {}
    logger.info(f"旧注册请求: {data.get('agentId', 'unknown')}")
    return jsonify({"success": True, "message": "注册成功"})

def run_pipeline_sync(user_input: str) -> dict:
    full_outputs = {}
    for agent_name in AGENT_ORDER:
        instruction = INSTRUCTIONS[agent_name]
        messages = [{"role": "system", "content": instruction}]
        if full_outputs:
            context = "\n\n".join(f"## {k} 输出\n{v}" for k, v in full_outputs.items())
            messages.append({"role": "user", "content": f"用户需求: {user_input}\n\n已有上下文:\n{context}"})
        else:
            messages.append({"role": "user", "content": user_input})
        result = ollama.chat(messages)
        full_outputs[agent_name] = result["message"]["content"]

    final = full_outputs.get("writer", full_outputs.get("researcher", ""))
    return {
        "output": final,
        "steps": full_outputs,
        "totalCost": round(sum(estimate_tokens(v) / 1000 * 0.001 for v in full_outputs.values()), 6),
    }


@app.route("/api/crewai/pipeline", methods=["POST"])
def pipeline():
    data = request.get_json() or {}
    user_input = data.get("input", "")
    stream = data.get("stream", True)

    logger.info(f"收到请求: input={user_input[:60]}... stream={stream}")

    if not user_input:
        return jsonify({"error": "input 不能为空"}), 400

    if stream:
        return Response(
            stream_pipeline(user_input),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    else:
        return jsonify(run_pipeline_sync(user_input))


def stream_pipeline(user_input: str):
    """流式执行 pipeline 并发送 SSE 事件"""
    full_outputs = {}
    accumulated_tokens = {"input": estimate_tokens(user_input), "output": 0}

    for agent_name in AGENT_ORDER:
        instruction = INSTRUCTIONS[agent_name]
        messages = [{"role": "system", "content": instruction}]
        if full_outputs:
            context = "\n\n".join(f"## {k} 输出\n{v}" for k, v in full_outputs.items())
            messages.append({"role": "user", "content": f"用户需求: {user_input}\n\n已有上下文:\n{context}"})
        else:
            messages.append({"role": "user", "content": user_input})

        yield f"event: step_started\ndata: {json.dumps({'agent': agent_name, 'name': INSTRUCTIONS[agent_name]}, ensure_ascii=False)}\n\n"

        collected = []
        for chunk in ollama.chat_stream(messages):
            collected.append(chunk)
            yield f"event: chunk\ndata: {json.dumps({'agent': agent_name, 'content': chunk}, ensure_ascii=False)}\n\n"

        full_text = "".join(collected)
        full_outputs[agent_name] = full_text
        output_tokens = estimate_tokens(full_text)
        accumulated_tokens["output"] += output_tokens
        cost = (estimate_tokens(full_text) / 1000) * 0.001

        yield f"event: step_completed\ndata: {json.dumps({'agent': agent_name, 'content': full_text, 'cost': round(cost, 6), 'tokenCount': {'input': estimate_tokens(full_text), 'output': output_tokens}}, ensure_ascii=False)}\n\n"

    final_output = full_outputs.get("writer", full_outputs.get("researcher", ""))
    yield f"event: done\ndata: {json.dumps({'output': final_output, 'totalCost': round(sum(estimate_tokens(v) / 1000 * 0.001 for v in full_outputs.values()), 6), 'tokenCount': accumulated_tokens}, ensure_ascii=False)}\n\n"




if __name__ == "__main__":
    logger.info("CrewAI 服务启动在 http://localhost:8001")
    logger.info("支持动态 Agent 注册，注册时自动验证 Ollama 模型")
    app.run(host="0.0.0.0", port=8001, threaded=True)