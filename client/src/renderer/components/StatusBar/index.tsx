import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { userAPI } from '../../api/user';

export const StatusBar: React.FC = () => {
    const [agentCount, setAgentCount] = useState<number>(0);
    const [credits, setCredits] = useState<number>(0);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const agents = await apiClient<{ agents: any[]; total: number }>('/agents');
                setAgentCount(agents.agents?.length || 0);
            } catch {}
            try {
                const bal = await userAPI.getBalance();
                setCredits(bal.credits);
            } catch {}
        };
        fetchStatus();
        const timer = setInterval(fetchStatus, 30000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div style={{
            height: 24, backgroundColor: 'var(--color-canvas)', borderTop: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px',
            fontSize: 11, color: 'var(--color-ink-muted)',
        }}>
            <div style={{ display: 'flex', gap: 16 }}>
                <span>🟢 代理在线: {agentCount}</span>
                <span>⚡ 信用点: {credits.toFixed(0)}</span>
            </div>
            <div>
        <span style={{ cursor: 'pointer' }} onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}>
          Ctrl+K 命令面板
        </span>
            </div>
        </div>
    );
};