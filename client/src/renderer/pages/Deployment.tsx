// ─── client/src/renderer/pages/Deployment.tsx ─────────────
import React, { useState, useEffect } from 'react';
import type { DeploymentConfig } from '../../shared/types';

const STEPS = ['环境检测', 'API 配置', '安装部署', '完成'];

export const DeploymentWizard: React.FC = () => {
    const [step, setStep] = useState(0);
    const [envCheck, setEnvCheck] = useState<{ node: boolean; python: boolean; diskSpace: number } | null>(null);
    const [config, setConfig] = useState<DeploymentConfig>({
        installPath: '',
        modelProvider: 'siliconflow',
        apiKey: '',
        autoStart: true,
    });
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (step === 0) {
            window.electronAPI?.deployment.checkEnv().then(setEnvCheck);
        }
    }, [step]);

    const handleInstall = async () => {
        if (!config.apiKey) return;
        setLoading(true);
        window.electronAPI?.deployment.onProgress((p) => setProgress(p));
        try {
            await window.electronAPI.deployment.install(config);
            setStep(3);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>一键部署 OpenClaw</h1>
            <div style={{ display: 'flex', marginBottom: 32 }}>
                {STEPS.map((label, i) => (
                    <div key={label} style={{ flex: 1, textAlign: 'center', color: i <= step ? '#2563eb' : '#d1d5db', fontWeight: i === step ? 600 : 400 }}>
                        {label}
                    </div>
                ))}
            </div>

            {step === 0 && (
                <div>
                    <div style={{ padding: 8 }}>Node.js: {envCheck?.node ? '✅' : '❌'}</div>
                    <div style={{ padding: 8 }}>Python: {envCheck?.python ? '✅' : '❌'}</div>
                    <div style={{ padding: 8 }}>磁盘空间: {envCheck?.diskSpace ?? '—'} GB</div>
                    <button
                        disabled={!envCheck?.node || !envCheck?.python}
                        onClick={() => setStep(1)}
                        style={{
                            marginTop: 16, padding: '8px 24px', backgroundColor: '#2563eb', color: '#fff',
                            border: 'none', borderRadius: 4, cursor: 'pointer', opacity: envCheck?.node && envCheck?.python ? 1 : 0.5,
                        }}
                    >
                        下一步
                    </button>
                </div>
            )}

            {step === 1 && (
                <div>
                    <select
                        value={config.modelProvider}
                        onChange={(e) => setConfig({ ...config, modelProvider: e.target.value as DeploymentConfig['modelProvider'] })}
                        style={{ display: 'block', width: '100%', padding: 8, marginBottom: 12, border: '1px solid #d1d5db', borderRadius: 4 }}
                    >
                        <option value="siliconflow">硅基流动</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                    </select>
                    <input
                        type="password"
                        placeholder="API 密钥 (sk-...)"
                        value={config.apiKey}
                        onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                        style={{ display: 'block', width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
                    />
                    <div style={{ marginTop: 16 }}>
                        <button onClick={() => setStep(0)} style={{ marginRight: 8, padding: '8px 16px' }}>上一步</button>
                        <button disabled={!config.apiKey} onClick={() => setStep(2)} style={{ padding: '8px 24px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, opacity: config.apiKey ? 1 : 0.5 }}>下一步</button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div>
                    <div style={{ height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 12 }}>
                        <div style={{ height: 8, backgroundColor: '#2563eb', borderRadius: 4, width: `${progress}%` }} />
                    </div>
                    {!loading && (
                        <button onClick={handleInstall} style={{ padding: '8px 24px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 4 }}>
                            开始安装
                        </button>
                    )}
                </div>
            )}

            {step === 3 && (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 48 }}>✅</div>
                    <h2>安装完成！</h2>
                    <p>OpenClaw 已成功部署，现在可以开始使用了。</p>
                </div>
            )}
        </div>
    );
};