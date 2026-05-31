"""Ollama HTTP 客户端
供 crewai_server.py 和 langgraph_server.py 共用
"""

import json
import urllib.request
from typing import Optional, Callable, Generator

OLLAMA_BASE = "http://localhost:11434"
OLLAMA_CHAT_URL = f"{OLLAMA_BASE}/api/chat"
OLLAMA_TAGS_URL = f"{OLLAMA_BASE}/api/tags"
DEFAULT_MODEL = "qwen2.5-coder:1.5b"


def estimate_tokens(text: str) -> int:
    """粗略估算 Token 数（中英文混合按字符数/2.5）"""
    return max(1, int(len(text) / 2.5))


class OllamaClient:
    def __init__(self, base_url: str = OLLAMA_CHAT_URL, model: str = DEFAULT_MODEL):
        self.base_url = base_url
        self.model = model

    def chat(self, messages: list, stream: bool = False) -> dict:
        """调用 Ollama 非流式接口"""
        body = json.dumps({
            "model": self.model,
            "messages": messages,
            "stream": False,
        }).encode("utf-8")

        req = urllib.request.Request(
            self.base_url,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        resp = urllib.request.urlopen(req, timeout=120)
        return json.loads(resp.read().decode("utf-8"))

    def chat_stream(self, messages: list) -> Generator[str, None, None]:
        """流式调用，逐块 yield content"""
        body = json.dumps({
            "model": self.model,
            "messages": messages,
            "stream": True,
        }).encode("utf-8")

        req = urllib.request.Request(
            self.base_url,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        resp = urllib.request.urlopen(req, timeout=120)
        buffer = ""
        while True:
            chunk = resp.read(1)
            if not chunk:
                break
            buffer += chunk.decode("utf-8")
            if buffer.endswith("\n"):
                line = buffer.strip()
                buffer = ""
                if line:
                    try:
                        data = json.loads(line)
                        content = data.get("message", {}).get("content", "")
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        pass

    def chat_with_cost(self, messages: list) -> dict:
        """调用并返回包含费用估算的结果"""
        result = self.chat(messages)
        content = result.get("message", {}).get("content", "")

        input_text = json.dumps(messages, ensure_ascii=False)
        input_tokens = estimate_tokens(input_text)
        output_tokens = estimate_tokens(content)
        cost = (input_tokens + output_tokens) / 1000 * 0.001

        return {
            "content": content,
            "tokenCount": {"input": input_tokens, "output": output_tokens},
            "cost": round(cost, 6),
        }

    @staticmethod
    def list_models() -> list[dict]:
        """查询 Ollama 已安装的模型列表"""
        try:
            req = urllib.request.Request(OLLAMA_TAGS_URL, method="GET")
            resp = urllib.request.urlopen(req, timeout=10)
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("models", [])
        except Exception as e:
            print(f"[OllamaClient] 获取模型列表失败: {e}")
            return []

    @staticmethod
    def validate_model(model_name: str) -> bool:
        """验证指定模型是否已安装"""
        models = OllamaClient.list_models()
        return any(m.get("name") == model_name for m in models)