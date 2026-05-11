// ─── client/src/renderer/components/TokenChart/index.tsx ──
import React from 'react';

interface Props {
    data: { label: string; value: number }[];
    height?: number;
}

export const TokenChart: React.FC<Props> = ({ data, height = 200 }) => {
    const max = Math.max(...data.map((d) => d.value), 1);
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }}>
            {data.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: 10 }}>{d.value}</div>
                    <div
                        style={{
                            width: '100%',
                            height: `${(d.value / max) * 100}%`,
                            backgroundColor: '#3b82f6',
                            borderRadius: '2px 2px 0 0',
                        }}
                    />
                    <div style={{ fontSize: 10 }}>{d.label}</div>
                </div>
            ))}
        </div>
    );
};