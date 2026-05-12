// ── client/src/renderer/pages/SkillStore.tsx (完整版)
import React, { useEffect, useState } from 'react';
import { skillAPI, Skill } from '../api/skill.api';
import { useUserStore } from '../store/user.store';

export const SkillStore: React.FC = () => {
    const user = useUserStore(s => s.user);
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'FREE' | 'PAID'>('ALL');

    const fetchSkills = async () => {
        setLoading(true);
        try {
            const data = await skillAPI.list(1, 100);
            setSkills(data.items);
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchSkills(); }, []);

    const filtered = skills.filter(s => {
        if (search && !s.name.includes(search) && !s.description.includes(search)) return false;
        if (filter === 'FREE' && s.priceType !== 'FREE') return false;
        if (filter === 'PAID' && s.priceType === 'FREE') return false;
        return true;
    });

    const handleInstall = async (skillId: string) => {
        if (!user) return alert('请先登录');
        try {
            await skillAPI.install(skillId);
            alert('安装成功');
        } catch(e) { alert('安装失败'); }
    };

    return (
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 24 }}>技能商店</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input className="input" style={{ width: 300 }} placeholder="搜索技能..." value={search} onChange={e => setSearch(e.target.value)} />
                <select className="input" value={filter} onChange={e => setFilter(e.target.value as any)}>
                    <option value="ALL">全部</option>
                    <option value="FREE">免费</option>
                    <option value="PAID">付费</option>
                </select>
            </div>
            {loading ? <div>加载中...</div> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {filtered.map(skill => (
                        <div key={skill.id} className="card" style={{ padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{skill.name}</h3>
                                <span style={{ fontSize: 12, background: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                  {skill.priceType === 'FREE' ? '免费' : `$${skill.price}`}
                </span>
                            </div>
                            <p style={{ fontSize: 14, color: 'var(--color-ink-muted)', marginBottom: 12, minHeight: 40 }}>{skill.description}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: 'var(--color-ink-subtle)' }}>⭐ {skill.rating.toFixed(1)} · {skill.downloads}次</span>
                                <button className="button button-primary" onClick={() => handleInstall(skill.id)}>安装</button>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--color-ink-muted)' }}>无匹配技能</div>}
                </div>
            )}
        </div>
    );
};