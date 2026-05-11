// ─── client/src/renderer/pages/SkillStore.tsx ─────────────
import React, { useState, useEffect } from 'react';
import type { SkillItem } from '../../shared/types';

export const SkillStore: React.FC = () => {
    const [skills, setSkills] = useState<SkillItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.skillStore.list({ page: 1, pageSize: 20 })
                .then((data) => setSkills((data as { items: SkillItem[] }).items))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    return (
        <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>技能商店</h1>
            {loading && <div>加载中...</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
                {skills.map((skill) => (
                    <div key={skill.id} style={{ backgroundColor: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ fontWeight: 600 }}>{skill.name}</h3>
                        <p style={{ color: '#6b7280', fontSize: 14 }}>{skill.description}</p>
                        <div style={{ marginTop: 8, fontSize: 13, color: '#9ca3af' }}>
                            {skill.priceType === 'FREE' ? '免费' : `$${skill.price}`} · {skill.downloads} 次下载 · ⭐{skill.rating.toFixed(1)}
                        </div>
                    </div>
                ))}
            </div>
            {!loading && skills.length === 0 && <div style={{ color: '#9ca3af' }}>暂无可用的技能</div>}
        </div>
    );
};