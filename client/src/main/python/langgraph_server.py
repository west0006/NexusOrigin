"""
LangGraph 多智能体协作服务
基于状态图的 Agent 编排
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

ollama = OllamaClient()

NODE_PROMPTS = {
    "analyze": "你是一个需求分析师。分析用户的输入，提取关键需求、约束条件和技术要点。以列表形式输出。",
    "research": "你是一个研究员。基于分析结果，提供详细的技术调研和建议。",
    "decide": "你是一个决策者。基于分析和研究结果，给出最佳方案和建议。输出决策理由。",
    "respond": "你是一个报告撰写者。将前面的所有分析、研究和决策整合为一份完整的最终回答。",
}

NODE_ORDER = ["analyze", "research", "decide", "respond"]

last_heartbeat = time.time()


def build_agent_response() -> dict:
    return {
        "agentId": "langgraph-local",
        "name": "LangGraph 本地服务",
        "framework": "langgraph",
        "endpoint": "http://localhost:8002",
        "status": "idle",
        "lastHeartbeat": int(last_heartbeat * 1000),
        "capabilities": [
            {"id": "langgraph-analyze", "name": "分析节点", "description": "用户输入深度分析", "estimatedCostPerCall": 0.002, "estimatedDurationMs": 15000},
            {"id": "langgraph-research", "name": "研究节点", "description": "技术调研", "estimatedCostPerCall": 0.002, "estimatedDurationMs": 20000},
            {"id": "langgraph-decide", "name": "决策节点", "description": "方案决策", "estimatedCostPerCall": 0.002, "estimatedDurationMs": 15000},
            {"id": "langgraph-respond", "name": "输出节点", "description": "整合输出最终回答", "estimatedCostPerCall": 0.002, "estimatedDurationMs": 15000},
        ],
    }


@app.route("/api/langgraph/health", methods=["GET"])
def health():
    global last_heartbeat
    last_heartbeat = time.time()
    return jsonify({"status": "ok", "service": "langgraph", "agents": [build_agent_response()]})


@app.route("/api/langgraph/execute", methods=["POST"])
def execute():
    data = request.get_json() or {}
    user_input = data.get("input", "")
    stream = data.get("stream", True)

    logger.info(f"收到请求: input={user_input[:60]}... stream={stream}")

    if not user_input:
        return jsonify({"error": "input 不能为空"}), 400

    if stream:
        return Response(
            stream_graph(user_input),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    else:
        return jsonify(run_graph_sync(user_input))


def stream_graph(user_input: str):
    """流式执行图并发送 SSE 事件"""
    full_outputs = {}
    accumulated_tokens = {"input": estimate_tokens(user_input), "output": 0}

    for node_name in NODE_ORDER:
        prompt = NODE_PROMPTS[node_name]
        messages = [{"role": "system", "content": prompt}]
        if full_outputs:
            context = "\n\n".join(f"## {k} 输出\n{v}" for k, v in full_outputs.items())
            messages.append({"role": "user", "content": f"用户需求: {user_input}\n\n已有上下文:\n{context}"})
        else:
            messages.append({"role": "user", "content": user_input})

        yield f"event: step_started\ndata: {json.dumps({'node': node_name, 'name': NODE_PROMPTS[node_name]}, ensure_ascii=False)}\n\n"

        collected = []
        for chunk in ollama.chat_stream(messages):
            collected.append(chunk)
            yield f"event: chunk\ndata: {json.dumps({'node': node_name, 'content': chunk}, ensure_ascii=False)}\n\n"

        full_text = "".join(collected)
        full_outputs[node_name] = full_text
        output_tokens = estimate_tokens(full_text)
        accumulated_tokens["output"] += output_tokens
        cost = (output_tokens / 1000) * 0.001

        yield f"event: step_completed\ndata: {json.dumps({'node': node_name, 'content': full_text, 'cost': round(cost, 6), 'tokenCount': {'input': estimate_tokens(full_text), 'output': output_tokens}}, ensure_ascii=False)}\n\n"

    final = full_outputs.get("respond", full_outputs.get("decide", ""))
    yield f"event: done\ndata: {json.dumps({'output': final, 'totalCost': round(sum(estimate_tokens(v) / 1000 * 0.001 for v in full_outputs.values()), 6), 'tokenCount': accumulated_tokens}, ensure_ascii=False)}\n\n"


def run_graph_sync(user_input: str) -> dict:
    full_outputs = {}
    for node_name in NODE_ORDER:
        prompt = NODE_PROMPTS[node_name]
        messages = [{"role": "system", "content": prompt}]
        if full_outputs:
            context = "\n\n".join(f"## {k} 输出\n{v}" for k, v in full_outputs.items())
            messages.append({"role": "user", "content": f"用户需求: {user_input}\n\n已有上下文:\n{context}"})
        else:
            messages.append({"role": "user", "content": user_input})
        result = ollama.chat(messages)
        full_outputs[node_name] = result["message"]["content"]

    final = full_outputs.get("respond", full_outputs.get("decide", ""))
    return {
        "output": final,
        "steps": full_outputs,
        "totalCost": round(sum(estimate_tokens(v) / 1000 * 0.001 for v in full_outputs.values()), 6),
    }

# ─── 动态 Agent 注册（与 CrewAI 风格统一） ───
LGRAPH_AGENT_ID = "langgraph-local"
lgraph_registry: dict[str, dict] = {}

@app.route("/api/langgraph/agents", methods=["GET"])
def lgraph_list_agents():
    """列出所有已注册 Agent（含内置）"""
    builtin = build_agent_response()
    external = []
    for aid, info in lgraph_registry.items():
        external.append({
            "agentId": aid,
            "name": info.get("name", aid),
            "framework": "langgraph",
            "endpoint": info.get("endpoint", ""),
            "model": info.get("model", DEFAULT_MODEL),
            "status": info.get("status", "idle"),
            "lastHeartbeat": info.get("lastHeartbeat", 0),
            "builtin": False,
            "capabilities": info.get("capabilities", []),
        })
    return jsonify({"agents": [builtin] + external})

@app.route("/api/langgraph/agents", methods=["POST"])
def lgraph_register_agent():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    model = data.get("model", DEFAULT_MODEL).strip()
    endpoint = data.get("endpoint", "http://localhost:11434").strip()
    capabilities = data.get("capabilities", [])

    if not name:
        return jsonify({"success": False, "error": "名称不能为空"}), 400

    if not OllamaClient.validate_model(model):
        return jsonify({"success": False, "error": f"模型 '{model}' 未在 Ollama 中找到"}), 400

    agent_id = f"lgraph_{uuid.uuid4().hex[:8]}"
    now = int(time.time() * 1000)
    lgraph_registry[agent_id] = {
        "name": name,
        "model": model,
        "endpoint": endpoint,
        "status": "idle",
        "lastHeartbeat": now,
        "capabilities": capabilities or [
            {"id": f"lg-{agent_id[:6]}", "name": f"{name} 能力", "description": f"基于 {model} 的 LangGraph Agent"}
        ],
    }
    logger.info(f"LangGraph Agent 注册成功: {agent_id} ({name}) - 模型: {model}")
    return jsonify({"success": True, "agent": {"agentId": agent_id, "name": name, "model": model, "framework": "langgraph", "builtin": False}})

@app.route("/api/langgraph/agents/<agent_id>", methods=["DELETE"])
def lgraph_remove_agent(agent_id):
    if agent_id == LGRAPH_AGENT_ID:
        return jsonify({"success": False, "error": "内置 Agent 不可删除"}), 400
    if agent_id not in lgraph_registry:
        return jsonify({"success": False, "error": "Agent 不存在"}), 404
    info = lgraph_registry.pop(agent_id)
    return jsonify({"success": True})

if __name__ == "__main__":
    logger.info("LangGraph 服务启动在 http://localhost:8002")
    app.run(host="0.0.0.0", port=8002, threaded=True)