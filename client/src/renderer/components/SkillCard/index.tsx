// ─── client/src/renderer/components/SkillCard/index.tsx ───
import React from 'react';
import type { SkillItem } from '../../../shared/types';

interface Props {
    skill: SkillItem;
    onInstall?: (id: string) => void;
}

export const SkillCard: React.FC<Props> = ({ skill, onInstall }) => {
    return (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, backgroundColor: '#fff' }}>
            <h3 style={{ margin: '0 0 8px' }}>{skill.name}</h3>
            <p style={{ color: '#6b7280', fontSize: 14 }}>{skill.description}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <span style={{ fontSize: 13, color: '#9ca3af' }}>
          ⭐ {skill.rating.toFixed(1)} | {skill.downloads} 次下载
        </span>
                {onInstall && (
                    <button
                        onClick={() => onInstall(skill.id)}
                        style={{
                            padding: '4px 12px',
                            backgroundColor: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                        }}
                    >
                        {skill.priceType === 'FREE' ? '安装' : `$${skill.price}`}
                    </button>
                )}
            </div>
        </div>
    );
};