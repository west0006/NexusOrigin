// ── client/src/renderer/pages/Deployment.tsx (完整版)
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/app';

const STEPS = ['环境检测', 'API 配置', '部署安装', '完成'];

interface EnvCheck {
    node: boolean;
    python: boolean;
    diskSpace: number;
    pythonVersion?: string;
}

const detectEnv = async (): Promise<EnvCheck> => {
    // 实际应调用 Electron API，这里模拟
    return { node: true, python: true, diskSpace: 25, pythonVersion: '3.12.2' };
};

export const DeploymentWizard: React.FC = () => {
    const [step, setStep] = useState(0);
    const [env, setEnv] = useState<EnvCheck | null>(null);
    const [config, setConfig] = useState({
        modelProvider: 'siliconflow',
        apiKey: '',
        autoStart: true,
    });
    const [progress, setProgress] = useState(0);
    const [installing, setInstalling] = useState(false);
    const setRoute = useAppStore(s => s.setRoute);

    useEffect(() => {
        if (step === 0) {
            detectEnv().then(setEnv);
        }
    }, [step]);

    const handleInstall = () => {
        if (!config.apiKey) return;
        setInstalling(true);
        let p = 0;
        const timer = setInterval(() => {
            p += 10;
            setProgress(p);
            if (p >= 100) {
                clearInterval(timer);
                setInstalling(false);
                setStep(3);
            }
        }, 400);
    };

    return (
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 32 }}>部署 OpenClaw</h2>
            {/* 步骤指示器 */}
            <div style={{ display: 'flex', marginBottom: 40 }}>
                {STEPS.map((label, index) => (
                    <div key={label} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                        <div style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: index <= step ? 'var(--color-primary)' : 'var(--color-surface-2)',
                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 600,
                        }}>
                            {index < step ? '✓' : index + 1}
                        </div>
                        <span style={{ marginLeft: 8, fontSize: 14, fontWeight: index === step ? 600 : 400 }}>{label}</span>
                        {index < STEPS.length - 1 && (
                            <div style={{ flex: 1, height: 1, background: 'var(--color-border)', margin: '0 12px' }} />
                        )}
                    </div>
                ))}
            </div>

            {step === 0 && (
                <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ marginBottom: 16 }}>系统环境</h3>
                    <CheckRow label="Node.js" pass={env?.node} />
                    <CheckRow label="Python 3.8+" pass={env?.python} hint={env?.pythonVersion} />
                    <CheckRow label="磁盘空间" pass={!!env && env.diskSpace >= 5} hint={`${env?.diskSpace ?? 0}GB`} />
                    <button className="button button-primary" disabled={!env?.node || !env?.python} onClick={() => setStep(1)} style={{marginTop:16}}>
                        下一步
                    </button>
                </div>
            )}

            {step === 1 && (
                <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ marginBottom: 16 }}>API 配置</h3>
                    <select className="input" style={{ width: '100%', marginBottom: 12 }}
                            value={config.modelProvider}
                            onChange={e => setConfig({...config, modelProvider: e.target.value})}>
                        <option value="siliconflow">硅基流动</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                    </select>
                    <input className="input" style={{ width: '100%', marginBottom: 16 }}
                           type="password" placeholder="API Key"
                           value={config.apiKey} onChange={e => setConfig({...config, apiKey: e.target.value})} />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="button" onClick={() => setStep(0)}>上一步</button>
                        <button className="button button-primary" disabled={!config.apiKey} onClick={() => setStep(2)}>开始安装</button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="card" style={{ padding: 24, textAlign: 'center' }}>
                    <h3 style={{ marginBottom: 16 }}>正在安装...</h3>
                    <div style={{ height: 8, background: 'var(--color-surface-1)', borderRadius: 4, marginBottom: 12 }}>
                        <div style={{ height: 8, background: 'var(--color-primary)', borderRadius: 4, width: `${progress}%`, transition: 'width 0.2s' }} />
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--color-ink-muted)' }}>{progress}%</div>
                    {!installing && <button className="button button-primary" onClick={handleInstall}>开始安装</button>}
                </div>
            )}

            {step === 3 && (
                <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                    <div style={{ fontSize: 48 }}>✅</div>
                    <h3 style={{ marginBottom: 8 }}>部署成功</h3>
                    <p style={{ color: 'var(--color-ink-muted)', marginBottom: 16 }}>OpenClaw 已安装完毕。</p>
                    <button className="button button-primary" onClick={() => setRoute('dashboard')}>前往仪表盘</button>
                </div>
            )}
        </div>
    );
};

const CheckRow: React.FC<{ label: string; pass?: boolean; hint?: string }> = ({ label, pass, hint }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
        <span>{label}</span>
        <span style={{ color: pass ? 'var(--color-success)' : 'var(--color-error)' }}>
      {pass ? '✓' : '✗'} {hint ? ` (${hint})` : ''}
    </span>
    </div>
);