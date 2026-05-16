// client/src/renderer/pages/Profile.tsx
// 个人中心 - 信息管理、信用点充值、密码修改

import React, { useEffect, useState, useCallback } from 'react';
import { userAPI, UserProfile } from '../api/user';
import { useUserStore } from '../store/user.store';
import { showToast } from '../components/Toast';

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
        fetchProfile();
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
            // 同步更新全局 user store 中的用户名
            useUserStore.setState(state => ({
                user: state.user ? { ...state.user, username: updated.username } : null
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

    if (loading) return <div style={{ padding: 24, textAlign: 'center' }}>加载中...</div>;
    if (!profile) return <div style={{ padding: 24, textAlign: 'center' }}>无法加载用户信息</div>;

    return (
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 24 }}>个人中心</h2>

            {/* 基本信息卡片 */}
            <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                {!editing ? (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 600 }}>{profile.username}</div>
                                <div style={{ color: 'var(--color-ink-muted)', fontSize: 14 }}>{profile.email}</div>
                            </div>
                            <button className="button" onClick={() => setEditing(true)}>编辑</button>
                        </div>
                        <p style={{ color: 'var(--color-ink-muted)', fontSize: 14, whiteSpace: 'pre-wrap' }}>
                            {profile.bio || '暂无个人简介'}
                        </p>
                    </div>
                ) : (
                    <div>
                        <input
                            className="input"
                            style={{ width: '100%', marginBottom: 12 }}
                            placeholder="用户名"
                            value={form.username}
                            onChange={e => setForm({ ...form, username: e.target.value })}
                        />
                        <textarea
                            className="input"
                            style={{ width: '100%', minHeight: 80, marginBottom: 12 }}
                            placeholder="个人简介"
                            value={form.bio}
                            onChange={e => setForm({ ...form, bio: e.target.value })}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="button button-primary" onClick={handleSave}>保存</button>
                            <button className="button" onClick={() => setEditing(false)}>取消</button>
                        </div>
                    </div>
                )}
            </div>

            {/* 信用点余额与充值 */}
            <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                <h3 style={{ fontWeight: 600, marginBottom: 16 }}>信用点余额</h3>
                <div style={{ fontSize: 32, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 16 }}>
                    {credits.toFixed(0)} <span style={{ fontSize: 16 }}>点</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        className="input"
                        type="number"
                        min="1"
                        step="1"
                        value={rechargeAmount}
                        onChange={e => setRechargeAmount(Number(e.target.value))}
                        style={{ width: 100 }}
                    />
                    <span style={{ color: 'var(--color-ink-muted)' }}>美元</span>
                    <button className="button button-primary" onClick={handleRecharge}>
                        充值 (得 {rechargeAmount * 10} 点)
                    </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-ink-subtle)', marginTop: 8 }}>
                    模拟充值，1美元 = 10信用点
                </div>
            </div>

            {/* 修改密码 */}
            <div className="card" style={{ padding: 24 }}>
                <h3 style={{ fontWeight: 600, marginBottom: 16 }}>修改密码</h3>
                {!changingPwd ? (
                    <button className="button" onClick={() => setChangingPwd(true)}>修改密码</button>
                ) : (
                    <div>
                        <input
                            className="input"
                            type="password"
                            style={{ width: '100%', marginBottom: 12 }}
                            placeholder="原密码"
                            value={pwdForm.oldPassword}
                            onChange={e => setPwdForm({ ...pwdForm, oldPassword: e.target.value })}
                        />
                        <input
                            className="input"
                            type="password"
                            style={{ width: '100%', marginBottom: 12 }}
                            placeholder="新密码（至少6位）"
                            value={pwdForm.newPassword}
                            onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="button button-primary" onClick={handleChangePassword}>确认修改</button>
                            <button className="button" onClick={() => setChangingPwd(false)}>取消</button>
                        </div>
                    </div>
                )}
            </div>

            {message && (
                <div style={{ marginTop: 16, padding: 12, background: 'var(--color-success-bg)', borderRadius: 'var(--radius-md)', fontSize: 14 }}>
                    {message}
                </div>
            )}
        </div>
    );
};