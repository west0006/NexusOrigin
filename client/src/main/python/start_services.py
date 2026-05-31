"""
一键启动所有 Python 服务
用法: python start_services.py
"""

import subprocess
import sys
import os
import time
import signal
import atexit
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(name)s] %(message)s')
logger = logging.getLogger("launcher")

SERVICES = [
    {
        "name": "CrewAI",
        "file": "crewai_server.py",
        "port": 8001,
    },
    {
        "name": "LangGraph",
        "file": "langgraph_server.py",
        "port": 8002,
    },
]

processes = []


def check_ollama():
    """检查 Ollama 是否在运行"""
    import urllib.request
    try:
        req = urllib.request.Request("http://localhost:11434/api/tags", method="GET")
        resp = urllib.request.urlopen(req, timeout=3)
        if resp.status == 200:
            logger.info("✅ Ollama 服务运行正常")
            return True
    except Exception:
        pass
    logger.warning("⚠️  Ollama 未运行！请先启动 Ollama: ollama serve")
    return False


def start_service(service: dict):
    """启动一个 Python 服务"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    script_path = os.path.join(script_dir, service["file"])

    if not os.path.exists(script_path):
        logger.error(f"❌ 找不到脚本: {script_path}")
        return

    proc = subprocess.Popen(
        [sys.executable, script_path],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True,
        bufsize=1,
    )
    processes.append(proc)
    logger.info(f"🚀 启动 {service['name']} (PID: {proc.pid}, 端口: {service['port']})")
    return proc


def cleanup():
    """清理所有子进程"""
    logger.info("🛑 正在停止所有服务...")
    for proc in processes:
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
    logger.info("✅ 所有服务已停止")


atexit.register(cleanup)
signal.signal(signal.SIGINT, lambda sig, frame: sys.exit(0))
signal.signal(signal.SIGTERM, lambda sig, frame: sys.exit(0))


def main():
    print("=" * 50)
    print("  枢元平台 - Python 服务启动器")
    print("=" * 50)
    print()

    check_ollama()

    for service in SERVICES:
        start_service(service)
        time.sleep(1)

    print()
    logger.info("✅ 所有服务已启动")
    logger.info("   CrewAI:  http://localhost:8001")
    logger.info("   LangGraph: http://localhost:8002")
    print()
    logger.info("按 Ctrl+C 停止所有服务")

    try:
        # 保持运行
        while True:
            time.sleep(1)
            # 检查进程状态
            for i, proc in enumerate(processes):
                if proc.poll() is not None:
                    logger.error(f"❌ {SERVICES[i]['name']} 异常退出 (code: {proc.returncode})")
                    # 重新启动
                    logger.info(f"🔄 重启 {SERVICES[i]['name']}...")
                    processes[i] = start_service(SERVICES[i])
    except KeyboardInterrupt:
        print()
        logger.info("收到退出信号")
    finally:
        cleanup()


if __name__ == "__main__":
    main()