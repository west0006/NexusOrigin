// Toast/index.tsx - 修改后的完整代码
import React, { useEffect, useState, useCallback, useRef } from 'react';

let globalToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;

export const showToast = (msg: string, type?: 'success' | 'error' | 'warning') => {
    if (globalToast) globalToast(msg, type);
};

export const ToastContainer: React.FC = () => {
    const [toasts, setToasts] = useState<{ id: number; msg: string; type: string }[]>([]);
    const counterRef = useRef(0);

    globalToast = useCallback((msg: string, type = 'info') => {
        counterRef.current += 1;
        const id = counterRef.current;
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const colors: Record<string, string> = {
        success: 'var(--color-success)',
        error: 'var(--color-error)',
        warning: 'var(--color-warning)',
        info: 'var(--color-primary)',
    };

    return (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    style={{
                        background: '#fff',
                        borderLeft: `4px solid ${colors[toast.type] || 'var(--color-primary)'}`,
                        padding: '12px 20px',
                        borderRadius: 6,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        minWidth: 260,
                        fontSize: 14,
                        animation: 'slideIn 0.3s',
                    }}
                >
                    {toast.msg}
                </div>
            ))}
        </div>
    );
};