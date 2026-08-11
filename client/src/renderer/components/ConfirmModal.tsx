import React, {useState} from 'react';

interface Props {
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}
export const ConfirmModal: React.FC<Props> = ({ open, title, message, onConfirm, onCancel }) => {
    if (!open) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
        }} onClick={onCancel}>
            <div className="card" style={{ width: 400, padding: 24 }} onClick={e => e.stopPropagation()}>
                <h3 style={{ marginBottom: 12 }}>{title}</h3>
                <p style={{ marginBottom: 24, color: 'var(--color-ink-muted)' }}>{message}</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="button" onClick={onCancel}>取消</button>
                    <button className="button button-primary" onClick={onConfirm}>确认</button>
                </div>
            </div>
        </div>
    );
};