// client/src/renderer/pages/Deployment.tsx
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/app';
import { FocusPanel } from '../components/FocusPanel';
import { showToast } from '../components/Toast';
import {C} from "@renderer/styles/theme";
import { Icon } from '../components/icons';
import { DEPLOY_SERVICE_URL } from '../config/env';

const STEPS = ['环境检测', '框架选择', 'API 配置', '部署安装', '完成'];

interface EnvCheck {
    node: boolean;
    python: boolean;
    diskSpace: number;
    pythonVersion?: string;
}

// 真实环境检测（调用 deploy-service）
const detectEnv = async (): Promise<EnvCheck> => {
    try {
        const res = await fetch(`${DEPLOY_SERVICE_URL}/api/v1/deploy/env`);
        if (!res.ok) throw new Error('环境检测失败');
        const data = await res.json();
        return {
            node: !!data.nodeVersion,
            python: !!data.pythonVersion,
            diskSpace: data.diskSpace || 0,
            pythonVersion: data.pythonVersion,
        };
    } catch (e) {
        console.error(e);
        return { node: false, python: false, diskSpace: 0 };
    }
};

export const DeploymentWizard: React.FC = () => {
    const [step, setStep] = useState(0);
    const [framework, setFramework] = useState<'openclaw' | 'langgraph' | 'crewai'>('openclaw');
    const [env, setEnv] = useState<EnvCheck | null>(null);
    const [config, setConfig] = useState({
        modelProvider: 'siliconflow',
        apiKey: '',
        autoStart: true,
    });
    const [progress, setProgress] = useState(0);
    const [installing, setInstalling] = useState(false);
    const setRoute = useAppStore(s => s.setRoute);

    // 聚焦状态
    const [errorFocus, setErrorFocus] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (step === 0) {
            detectEnv().then(setEnv);
        }
    }, [step]);

    // 真实安装调用
    const handleInstall = async () => {
        if (!config.apiKey) return;
        setInstalling(true);
        setErrorFocus(false);
        setProgress(0);

        const timer = setInterval(() => {
            setProgress(prev => Math.min(prev + 10, 90));
        }, 600);

        try {
            const res = await fetch(`${DEPLOY_SERVICE_URL}/api/v1/deploy/${framework}/install`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    installPath: '',
                    modelProvider: config.modelProvider,
                    apiKey: config.apiKey,
                    autoStart: config.autoStart,
                }),
            });
            clearInterval(timer);
            setProgress(100);
            const result = await res.json();
            if (!res.ok || !result.success) {
                setErrorMsg(result.error || '安装失败');
                setErrorFocus(true);
            } else {
                setStep(4);
            }
        } catch (e: any) {
            clearInterval(timer);
            setErrorMsg(e.message || '网络错误');
            setErrorFocus(true);
        } finally {
            setInstalling(false);
        }
    };

    const handleRetry = () => {
        setErrorFocus(false);
        setProgress(0);
        handleInstall();
    };

    return (
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 32 }}>
                部署 Agent 框架
            </h2>

            {/* 步骤指示器 */}
            <div style={{ display: 'flex', marginBottom: 40 }}>
                {STEPS.map((label, index) => (
                    <div key={label} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                        <div
                            style={{
                                width: 24, height: 24, borderRadius: '50%',
                                background: index <= step ? 'var(--color-primary)' : 'var(--color-surface-2)',
                                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12, fontWeight: 600,
                            }}
                        >
                            {index < step ? <span style={{ display: 'inline-flex' }}>{status === 'completed' ? (
                                <Icon name="check" size={16} color={C.success} />
                            ) : (
                                <Icon name="x" size={16} color={C.error} />
                            )}</span> : <span>{index + 1}</span>}
                        </div>
                        <span style={{ marginLeft: 8, fontSize: 14, fontWeight: index === step ? 600 : 400 }}>
              {label}
            </span>
                        {index < STEPS.length - 1 && (
                            <div style={{ flex: 1, height: 1, background: 'var(--color-border)', margin: '0 12px' }} />
                        )}
                    </div>
                ))}
            </div>

            {/* 步骤0: 环境检测 */}
            {step === 0 && (
                <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ marginBottom: 16 }}>系统环境</h3>
                    <CheckRow label="Node.js (系统级)" pass={env?.node} />
                    <CheckRow label="Python 3.8+ (依赖级)" pass={env?.python} hint={env?.pythonVersion} />
                    <CheckRow label="磁盘空间 (系统级)" pass={!!env && env.diskSpace >= 5} hint={`${env?.diskSpace ?? 0}GB`} />
                    <button
                        className="button button-primary"
                        disabled={!env?.node || !env?.python}
                        onClick={() => setStep(1)}
                        style={{
                            padding: '6px 14px', borderRadius: C.radiusSm, border: 'none',
                            background: C.primary, color: C.textInverse, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        }}
                    >
                        下一步
                    </button>
                </div>
            )}

            {/* 步骤1: 框架选择 */}
            {step === 1 && (
                <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ marginBottom: 16 }}>选择 Agent 框架</h3>
                    <select
                        className="input"
                        style={{ width: '100%', marginBottom: 16 }}
                        value={framework}
                        onChange={e => setFramework(e.target.value as any)}
                    >
                        <option value="openclaw">OpenClaw</option>
                        <option value="langgraph">LangGraph</option>
                        <option value="crewai">CrewAI</option>
                    </select>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="button" onClick={() => setStep(0)}>上一步</button>
                        <button style={{
                            padding: '6px 14px', borderRadius: C.radiusSm, border: 'none',
                            background: C.primary, color: C.textInverse, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        }} onClick={() => setStep(2)}>下一步</button>
                    </div>
                </div>
            )}

            {/* 步骤2: API 配置 */}
            {step === 2 && (
                <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ marginBottom: 16 }}>API 配置</h3>
                    <select
                        className="input"
                        style={{ width: '100%', marginBottom: 12 }}
                        value={config.modelProvider}
                        onChange={e => setConfig({ ...config, modelProvider: e.target.value })}
                    >
                        <option value="siliconflow">硅基流动</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                    </select>
                    <input
                        className="input"
                        style={{ width: '100%', marginBottom: 16 }}
                        type="password"
                        placeholder="API Key"
                        value={config.apiKey}
                        onChange={e => setConfig({ ...config, apiKey: e.target.value })}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="button" onClick={() => setStep(1)}>上一步</button>
                        <button className="button button-primary" disabled={!config.apiKey} onClick={() => setStep(3)}>
                            开始安装
                        </button>
                    </div>
                </div>
            )}

            {/* 步骤3: 安装中 */}
            {step === 3 && (
                <div className="card" style={{ padding: 24, textAlign: 'center' }}>
                    <h3 style={{ marginBottom: 16 }}>正在安装 {framework} ...</h3>
                    <div style={{ height: 8, background: 'var(--color-surface-1)', borderRadius: 4, marginBottom: 12 }}>
                        <div
                            style={{
                                height: 8, background: 'var(--color-primary)', borderRadius: 4,
                                width: `${progress}%`, transition: 'width 0.2s',
                            }}
                        />
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--color-ink-muted)' }}>{progress}%</div>
                    {!installing && progress < 100 && (
                        <button className="button button-primary" onClick={handleInstall} style={{ marginTop: 12 }}>
                            开始安装
                        </button>
                    )}
                    {errorFocus && (
                        <button className="button" style={{ marginTop: 12 }} onClick={() => setErrorFocus(true)}>
                            查看错误详情
                        </button>
                    )}
                </div>
            )}

            {/* 步骤4: 完成 */}
            {step === 4 && (
                <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                    <Icon name="target" size={48} color={C.primary} />
                    <h3 style={{ marginBottom: 8 }}>部署成功</h3>
                    <p style={{ color: 'var(--color-ink-muted)', marginBottom: 16 }}>
                        {framework} 已安装完毕。
                    </p>
                    <button className="button button-primary" onClick={() => setRoute('dashboard')}>
                        前往仪表盘
                    </button>
                </div>
            )}

            {/* 聚焦面板：问题透视 */}
            <FocusPanel
                visible={errorFocus}
                title="问题透视"
                subtitle="安装失败"
                onClose={() => setErrorFocus(false)}
            >
                <div>
                    <h4 style={{ marginBottom: 12 }}>根因分析</h4>
                    <p style={{ color: 'var(--color-ink-muted)' }}>
                        安装过程遇到错误，请查看下方日志并尝试社区解决方案。
                    </p>

                    <h4 style={{ marginTop: 20, marginBottom: 12 }}>上下文日志</h4>
                    <div style={{
                        background: '#1e1e1e', color: '#0f0', padding: 12, borderRadius: 6,
                        fontFamily: 'var(--font-family-mono)', fontSize: 12, maxHeight: 180,
                        overflow: 'auto', whiteSpace: 'pre-wrap',
                    }}>
                        {errorMsg}
                    </div>

                    <h4 style={{ marginTop: 20, marginBottom: 12 }}>社区解决方案</h4>
                    <div style={{ padding: 12, background: 'var(--color-surface-1)', borderRadius: 6 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>[讨论] 类似安装错误的解决方式</div>
                        <div style={{ fontSize: 13 }}>建议检查网络连接、Python 版本，或切换到国内镜像源。</div>
                        <button className="button" style={{ marginTop: 8 }}>一键应用修复</button>
                    </div>

                    <div style={{ marginTop: 24 }}>
                        <h4 style={{ marginBottom: 12 }}>手动修复</h4>
                        <input className="input" style={{ width: '100%', marginBottom: 8 }} placeholder="输入命令..." />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="button button-primary" onClick={handleRetry}>重试当前步骤</button>
                            <button className="button" onClick={() => setErrorFocus(false)}>返回</button>
                        </div>
                    </div>
                </div>
            </FocusPanel>
        </div>
    );
};

const CheckRow: React.FC<{ label: string; pass?: boolean; hint?: string }> = ({ label, pass, hint }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
        <span>{label}</span>
        <span style={{ color: pass ? 'var(--color-success)' : 'var(--color-error)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {status === 'completed' ? (
                <Icon name="check" size={16} color={C.success} />
            ) : (
                <Icon name="x" size={16} color={C.error} />
            )} {hint ? `(${hint})` : ''}
        </span>
    </div>
);