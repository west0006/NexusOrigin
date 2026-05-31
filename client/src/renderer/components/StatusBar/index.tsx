import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client.api';
import { userAPI } from '../../api/user.api';

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
                const bal = await userAPI.getCredits();
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
                 <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="6"/>
                        <circle cx="12" cy="12" r="2" fill="currentColor"/>
                        <path d="M12 2v4"/>
                        <path d="M12 18v4"/>
                        <path d="M2 12h4"/>
                        <path d="M18 12h4"/>
                    </svg>
                    代理在线: {agentCount}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="6" width="18" height="12" rx="2"/>
                        <path d="M7 6V4a1 1 0 011-1h8a1 1 0 011 1v2"/>
                        <line x1="12" y1="10" x2="12" y2="16"/>
                        <line x1="9" y1="13" x2="15" y2="13"/>
                    </svg>
                    信用点 {credits.toFixed(0)}
                </span>
            </div>
            <div>
        <span style={{ cursor: 'pointer' }} onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}>
           <svg width="12" height="12" viewBox="0 0 20 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
           </svg>
            Ctrl+K 命令面板
        </span>
            </div>
        </div>
    );
};