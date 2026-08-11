// client/src/renderer/pages/Profile.tsx
// 个人中心 - 信息管理、信用点充值、密码修改
// 极简扁平风格

import React, { useEffect, useState, useCallback } from 'react';
import { userAPI } from '../../api/user.api';
import { UserProfile } from '@shared/types';
import { useUserStore } from '../../store/user.store';
import { showToast } from '../../components/Toast';
import { useUserLevelStore } from '../../store/userLevel.store';
import { UserLevelBadge } from '../../components/UserLevelBadge';
import { BadgeList } from '../../components/BadgeList';
import { C } from '@renderer/styles/theme';
import { Icon } from '../../components/icons';

export const Profile: React.FC = () => {
    const user = useUserStore(s => s.user);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ username: '', bio: '' });
    const [changingPwd, setChangingPwd] = useState(false);
    const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '' });
    const [rechargeAmount, setRechargeAmount] = useState(10);
    const [credits, setCredits] = useState<number>(0);
    const [message, setMessage] = useState('');

    const fetchProfile = useCallback(async () => {
        try {
            const data = await userAPI.getProfile();
            setProfile(data);
            setForm({ username: data.username, bio: data.bio || '' });
            setCredits(data.credits);
        } catch (e: any) {
            showToast(e.message || '加载个人资料失败', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchProfile();
    }, [fetchProfile]);

    const handleSave = async () => {
        if (!form.username.trim()) {
            showToast('用户名不能为空', 'warning');
            return;
        }
        try {
            const updated = await userAPI.updateProfile(form);
            setProfile(updated);
            setEditing(false);
            setMessage('个人资料已更新');
            showToast('更新成功', 'success');
            useUserStore.setState(state => ({
                user: state.user ? { ...state.user, username: updated.username } : null,
            }));
        } catch (e: any) {
            showToast(e.message || '更新失败', 'error');
        }
    };

    const handleChangePassword = async () => {
        if (!pwdForm.oldPassword || !pwdForm.newPassword) {
            showToast('请填写完整', 'warning');
            return;
        }
        if (pwdForm.newPassword.length < 6) {
            showToast('新密码至少6位', 'warning');
            return;
        }
        try {
            await userAPI.changePassword(pwdForm);
            setChangingPwd(false);
            setPwdForm({ oldPassword: '', newPassword: '' });
            setMessage('密码已修改');
            showToast('密码修改成功', 'success');
        } catch (e: any) {
            showToast(e.message || '修改失败', 'error');
        }
    };

    const handleRecharge = async () => {
        if (rechargeAmount <= 0) {
            showToast('请输入有效金额', 'warning');
            return;
        }
        try {
            const res = await userAPI.recharge({ amount: rechargeAmount, method: 'alipay' });
            setCredits(res.credits);
            setMessage(`充值成功，当前余额 ${res.credits} 信用点`);
            showToast('充值成功', 'success');
        } catch (e: any) {
            showToast(e.message || '充值失败', 'error');
        }
    };

    // === 用户成长信息 ===
    const UserGrowthSection = () => {
        const level = useUserLevelStore((s) => s.level);
        const exp = useUserLevelStore((s) => s.exp);
        const expToNext = useUserLevelStore((s) => s.expToNext);
        const title = useUserLevelStore((s) => s.title);
        const totalExpEarned = useUserLevelStore((s) => s.totalExpEarned);
        const badges = useUserLevelStore((s) => s.badges);
        const getActiveQuests = useUserLevelStore((s) => s.getActiveQuests);
        const getCompletedQuests = useUserLevelStore((s) => s.getCompletedQuests);

        const activeQuests = getActiveQuests();
        const completedQuests = getCompletedQuests();
        const progressPercent = expToNext > 0 ? Math.round((exp / expToNext) * 100) : 100;

        return (
            <div style={{
                background: C.cardBg, borderRadius: C.radiusMd,
                border: `1px solid ${C.border}`, padding: 20, marginBottom: 16,
            }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="star" size={16} /> 用户成长
                </div>
                {/* 等级信息 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <UserLevelBadge  size="lg" />
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>
                            Lv.{level} {title}
                        </div>
                        <div style={{ fontSize: 12, color: C.textLight }}>累计经验 {totalExpEarned}</div>
                    </div>
                </div>
                {/* 经验条 */}
                <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textLight, marginBottom: 4 }}>
                        <span>EXP {exp} / {expToNext}</span>
                        <span>{progressPercent}%</span>
                    </div>
                    <div style={{ width: '100%', height: 6, borderRadius: 3, background: C.bg, overflow: 'hidden' }}>
                        <div style={{ width: `${progressPercent}%`, height: '100%', borderRadius: 3, background: C.primary, transition: 'width 0.3s' }} />
                    </div>
                </div>
                {/* 徽章 */}
                {badges && badges.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, color: C.textLight, marginBottom: 6 }}>已获得徽章</div>
                        <BadgeList/>
                    </div>
                )}
                {/* 任务 */}
                {activeQuests && activeQuests.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 12, color: C.textLight, marginBottom: 6 }}>进行中的任务</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {activeQuests.map((q: any) => (
                                <span key={q.id} style={{
                                    padding: '3px 8px', borderRadius: 12,
                                    background: C.warning + '15', color: C.warning, fontSize: 11,
                                }}>
                                    {q.title || q.name} ({q.progress}/{q.total})
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {completedQuests && completedQuests.length > 0 && (
                    <div>
                        <div style={{ fontSize: 12, color: C.textLight, marginBottom: 6 }}>已完成任务</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {completedQuests.slice(0, 5).map((q: any) => (
                                <span key={q.id} style={{
                                    padding: '3px 8px', borderRadius: 12,
                                    background: C.success + '15', color: C.success, fontSize: 11,
                                }}>
                                    ✅ {q.title || q.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // === 通用样式 ===
    const inputBase: React.CSSProperties = {
        width: '100%', padding: '8px 12px', borderRadius: C.radiusSm,
        border: `1px solid ${C.border}`, background: C.bg,
        color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box',
    };
    const cardStyle: React.CSSProperties = {
        background: C.cardBg, borderRadius: C.radiusMd,
        border: `1px solid ${C.border}`, padding: 20, marginBottom: 16,
    };
    const sectionTitle: React.CSSProperties = {
        fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 8,
    };

    if (loading) return <div style={{ padding: 24, textAlign: 'center', color: C.textLight }}>加载中...</div>;
    if (!profile) return <div style={{ padding: 24, textAlign: 'center', color: C.textLight }}>无法加载用户信息</div>;

    return (
        <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
            {/* 标题 */}
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="settings" size={22} /> 个人中心
                </h1>
                <p style={{ margin: '4px 0 0', color: C.textSecondary, fontSize: 13 }}>
                    管理个人信息、信用点和账户设置
                </p>
            </div>

            {/* 1. 个人信息 */}
            <div style={cardStyle}>
                <div style={sectionTitle}>
                    <Icon name="user" size={16} /> 个人信息
                </div>
                {!editing ? (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                            <UserLevelBadge size="sm" />
                            <span style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{profile.username}</span>
                            <span style={{ fontSize: 12, color: C.textLight }}>{profile.email}</span>
                            <button onClick={() => setEditing(true)} style={{
                                marginLeft: 'auto', padding: '4px 10px', borderRadius: C.radiusSm,
                                border: `1px solid ${C.border}`, background: 'transparent',
                                color: C.textSecondary, cursor: 'pointer', fontSize: 12,
                            }}>
                                编辑
                            </button>
                        </div>
                        <p style={{ color: C.textSecondary, fontSize: 13, whiteSpace: 'pre-wrap', margin: 0 }}>
                            {profile.bio || '暂无个人简介'}
                        </p>
                    </div>
                ) : (
                    <div>
                        <input
                            style={{ ...inputBase, marginBottom: 10 }}
                            placeholder="用户名"
                            value={form.username}
                            onChange={e => setForm({ ...form, username: e.target.value })}
                        />
                        <textarea
                            style={{ ...inputBase, minHeight: 80, marginBottom: 12, resize: 'vertical' }}
                            placeholder="个人简介"
                            value={form.bio}
                            onChange={e => setForm({ ...form, bio: e.target.value })}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={handleSave} style={{
                                padding: '6px 16px', borderRadius: C.radiusSm, border: 'none',
                                background: C.primary, color: C.textInverse, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                            }}>
                                保存
                            </button>
                            <button onClick={() => setEditing(false)} style={{
                                padding: '6px 16px', borderRadius: C.radiusSm,
                                border: `1px solid ${C.border}`, background: 'transparent',
                                color: C.textSecondary, cursor: 'pointer', fontSize: 13,
                            }}>
                                取消
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. 信用点余额与充值 */}
            <div style={cardStyle}>
                <div style={sectionTitle}>
                    <Icon name="billing" size={16} /> 信用点余额
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: C.primary, marginBottom: 16 }}>
                    {credits.toFixed(0)} <span style={{ fontSize: 16, color: C.textSecondary }}>点</span>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="number"
                        min="1"
                        step="1"
                        value={rechargeAmount}
                        onChange={e => setRechargeAmount(Number(e.target.value))}
                        style={{ ...inputBase, width: 100 }}
                    />
                    <span style={{ color: C.textSecondary, fontSize: 13 }}>美元</span>
                    <button onClick={handleRecharge} style={{
                        padding: '6px 16px', borderRadius: C.radiusSm, border: 'none',
                        background: C.primary, color: C.textInverse, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    }}>
                        充值（获 {rechargeAmount * 10} 点）
                    </button>
                </div>
                <div style={{ fontSize: 12, color: C.textLight, marginTop: 8 }}>
                    模拟充值，1 美元 = 10 信用点
                </div>
            </div>

            {/* 3. 用户成长 */}
            <UserGrowthSection />

            {/* 4. 修改密码 */}
            <div style={cardStyle}>
                <div style={sectionTitle}>
                    <Icon name="lock" size={16} /> 修改密码
                </div>
                {!changingPwd ? (
                    <button onClick={() => setChangingPwd(true)} style={{
                        padding: '6px 16px', borderRadius: C.radiusSm,
                        border: `1px solid ${C.border}`, background: 'transparent',
                        color: C.textSecondary, cursor: 'pointer', fontSize: 13,
                    }}>
                        修改密码
                    </button>
                ) : (
                    <div>
                        <input
                            type="password"
                            style={{ ...inputBase, marginBottom: 10 }}
                            placeholder="原密码"
                            value={pwdForm.oldPassword}
                            onChange={e => setPwdForm({ ...pwdForm, oldPassword: e.target.value })}
                        />
                        <input
                            type="password"
                            style={{ ...inputBase, marginBottom: 12 }}
                            placeholder="新密码（至少6位）"
                            value={pwdForm.newPassword}
                            onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={handleChangePassword} style={{
                                padding: '6px 16px', borderRadius: C.radiusSm, border: 'none',
                                background: C.primary, color: C.textInverse, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                            }}>
                                确认修改
                            </button>
                            <button onClick={() => setChangingPwd(false)} style={{
                                padding: '6px 16px', borderRadius: C.radiusSm,
                                border: `1px solid ${C.border}`, background: 'transparent',
                                color: C.textSecondary, cursor: 'pointer', fontSize: 13,
                            }}>
                                取消
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 消息提示 */}
            {message && (
                <div style={{
                    padding: 10, borderRadius: C.radiusSm,
                    background: C.success + '15', color: C.success, fontSize: 13,
                }}>
                    {message}
                </div>
            )}
        </div>
    );
};