// client/src/renderer/pages/Auth.tsx
import React, { useState } from 'react';
import { authAPI } from '../../api/auth.api';
import { useUserStore } from '../../store/user.store';
import { useAppStore } from '../../store/app';
import { showToast } from '../../components/Toast';
import { useOnboardingStore } from '../../store/onboarding.store';
import {C} from "@renderer/styles/theme";

export const AuthPage: React.FC = () => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [loginType, setLoginType] = useState<'email' | 'phone'>('email');
    const [registerType, setRegisterType] = useState<'email' | 'phone'>('email');

    const selectIdentity = useOnboardingStore((s) => s.selectIdentity);

    // 邮箱登录/注册
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');

    // 手机号登录/注册
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [registerToken, setRegisterToken] = useState('');

    // 身份选择（新用户完成注册后需要选择身份）
    const [needIdentity, setNeedIdentity] = useState(false);
    const [tempUser, setTempUser] = useState<{ id: string; accessToken: string; refreshToken: string } | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const setAuth = useUserStore(s => s.setAuth);
    const setRoute = useAppStore(s => s.setRoute);

    // 登录成功后处理（可能还需要身份选择）
    const handleLoginSuccess = (user: any, accessToken: string, refreshToken: string, onboardingStep?: string) => {
        const finalUser = { ...user, onboardingStep };
        setAuth(finalUser, accessToken, refreshToken);
        if (onboardingStep !== 'COMPLETED') {
            // 需要身份选择
            setTempUser({ id: user.id, accessToken, refreshToken });
            setNeedIdentity(true);
        } else {
            setRoute('dashboard');
        }
    };

    // 选择身份后完成引导
    const handleSelectIdentity = async (identityType: 'USER' | 'DEVELOPER') => {
        if (!tempUser) {
            showToast('登录状态异常，请重新登录', 'error');
            return;
        }
        setLoading(true);
        try {
            // 调用后端保存身份
            await authAPI.selectIdentity({
                identityType,
            });

            // 更新本地 onboarding store
            const mappedType = identityType === 'USER' ? 'user' : 'developer';
            selectIdentity(mappedType);

            // 更新全局 user 中的 onboardingStep
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const u = JSON.parse(userStr);
                    u.onboardingStep = mappedType; // 标记身份已选
                    u.identityType = identityType;
                    localStorage.setItem('user', JSON.stringify(u));
                    useUserStore.setState({ user: u });
                } catch { /* ignore */ }
            }

            setNeedIdentity(false);
            setTempUser(null);
            showToast(`欢迎${identityType === 'DEVELOPER' ? '开发者' : '新用户'}！正在为你加载引导`, 'success');

            // 跳转到引导页
            setRoute('onboarding');
        } catch (e: any) {
            showToast(e.message || '身份选择失败', 'error');
        } finally {
            setLoading(false);
        }
    };

    // 邮箱登录
    const handleEmailLogin = async () => {
        if (!email || !password) {
            setError('请输入邮箱和密码');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await authAPI.login({ email, password });
            handleLoginSuccess(res.user, res.accessToken, res.refreshToken, res.user.onboardingStep);
        } catch (err: any) {
            setError(err.message || '登录失败');
        } finally {
            setLoading(false);
        }
    };

    // 邮箱注册
    const handleEmailRegister = async () => {
        if (!email || !username || !password) {
            setError('请填写完整信息');
            return;
        }
        if (password.length < 8) {
            setError('密码至少8位，需包含大小写、数字和特殊字符');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await authAPI.register({ email, username, password });
            handleLoginSuccess(res.user, res.accessToken, res.refreshToken, res.user.onboardingStep);
        } catch (err: any) {
            setError(err.message || '注册失败');
        } finally {
            setLoading(false);
        }
    };

    // 发送短信验证码
    const handleSendCode = async () => {
        if (!phone) {
            setError('请输入手机号');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await authAPI.sendSms({ phone });
            showToast('验证码已发送', 'success');
        } catch (err: any) {
            setError(err.message || '发送失败');
        } finally {
            setLoading(false);
        }
    };

    // 手机号登录（验证码登录）
    const handlePhoneLogin = async () => {
        if (!phone || !code) {
            setError('请输入手机号和验证码');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await authAPI.phoneLogin({ phone, code });
            if (res.isNewUser) {
                // 新用户需要设置用户名
                setRegisterToken(res.registerToken!);
                setMode('register');
                setRegisterType('phone');
                setError('');
            } else {
                handleLoginSuccess(res.user!, res.accessToken!, res.refreshToken!, res.onboardingStep);
            }
        } catch (err: any) {
            setError(err.message || '登录失败');
        } finally {
            setLoading(false);
        }
    };

    // 手机号注册完成（设置用户名）
    const handlePhoneRegisterFinish = async () => {
        if (!username) {
            setError('请设置用户名');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await authAPI.registerFinish({ token: registerToken, username });
            handleLoginSuccess(res.user, res.accessToken, res.refreshToken, res.onboardingStep);
        } catch (err: any) {
            setError(err.message || '注册失败');
        } finally {
            setLoading(false);
        }
    };

    // 微信登录（打开授权窗口）
    const handleWechatLogin = () => {
        // 实际需要获取微信授权code，此处简化
        showToast('微信登录功能开发中', );
        // 开发时可使用: window.location.href = 'https://open.weixin.qq.com/...'
    };

    // GitHub登录占位
    const handleGithubLogin = () => {
        showToast('GitHub登录即将开放', );
    };

    // 身份选择界面
    if (needIdentity) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #F8F9FA 0%, #EDE9FE 100%)',
                padding: 24,
            }}>
                <div style={{ maxWidth: 720, width: '100%' }}>
                    <div style={{ textAlign: 'center', marginBottom: 48 }}>
                        <div style={{
                            fontSize: 14, fontWeight: 600, color: C.primary,
                            letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase',
                        }}>
                            NexusOrigin
                        </div>
                        <h1 style={{ fontSize: 28, fontWeight: 700, color: C.text, marginBottom: 12 }}>
                            欢迎来到枢元
                        </h1>
                        <p style={{ fontSize: 14, color: C.textSecondary }}>
                            请选择你的身份，我们将为你定制专属引导体验
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        {/* 普通用户卡片 */}
                        <button
                            onClick={() => handleSelectIdentity('USER')}
                            disabled={loading}
                            style={{
                                padding: 32, borderRadius: 16, border: `2px solid ${C.border}`,
                                background: C.cardBg, cursor: loading ? 'not-allowed' : 'pointer',
                                textAlign: 'left', opacity: loading ? 0.7 : 1,
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                if (!loading) {
                                    e.currentTarget.style.borderColor = C.primary;
                                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,92,231,0.15)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = C.border;
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            <div style={{ marginTop: 16 }}>
                                <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>普通用户</div>
                                <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>
                                    我想使用 AI 完成日常工作、学习和生活任务，无需编写代码
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                            <span style={{ padding: '2px 8px', borderRadius: 12, background: `${C.primaryLight}20`, color: C.primary, fontSize: 12, fontWeight: 500 }}>
                                🤖 使用 Agent
                            </span>
                                <span style={{ padding: '2px 8px', borderRadius: 12, background: `${C.success}20`, color: C.success, fontSize: 12, fontWeight: 500 }}>
                                📊 监控成本
                            </span>
                                <span style={{ padding: '2px 8px', borderRadius: 12, background: `${C.info}20`, color: C.info, fontSize: 12, fontWeight: 500 }}>
                                💬 参与社区
                            </span>
                            </div>
                        </button>

                        {/* 开发者卡片 */}
                        <button
                            onClick={() => handleSelectIdentity('DEVELOPER')}
                            disabled={loading}
                            style={{
                                padding: 32, borderRadius: 16, border: `2px solid ${C.border}`,
                                background: C.cardBg, cursor: loading ? 'not-allowed' : 'pointer',
                                textAlign: 'left', opacity: loading ? 0.7 : 1,
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                if (!loading) {
                                    e.currentTarget.style.borderColor = C.primary;
                                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,92,231,0.15)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = C.border;
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="16 18 22 12 16 6" />
                                <polyline points="8 6 2 12 8 18" />
                                <line x1="12" y1="2" x2="12" y2="22" stroke={C.textLight} strokeWidth="1" opacity={0.3} />
                            </svg>
                            <div style={{ marginTop: 16 }}>
                                <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>开发者</div>
                                <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>
                                    我想开发和部署自己的 AI Agent 和 MCP 工具
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                            <span style={{ padding: '2px 8px', borderRadius: 12, background: `${C.primaryLight}20`, color: C.primary, fontSize: 12, fontWeight: 500 }}>
                                🔧 开发 Agent
                            </span>
                                <span style={{ padding: '2px 8px', borderRadius: 12, background: `${C.warning}30`, color: '#B7950B', fontSize: 12, fontWeight: 500 }}>
                                🏪 能力市场
                            </span>
                                <span style={{ padding: '2px 8px', borderRadius: 12, background: `${C.success}20`, color: C.success, fontSize: 12, fontWeight: 500 }}>
                                🔗 跨框架协作
                            </span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 手机号注册的第二步：设置用户名
    if (mode === 'register' && registerType === 'phone' && registerToken) {
        return (
            <div style={{ maxWidth: 400, margin: '60px auto' }}>
                <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ marginBottom: 16 }}>设置用户名</h3>
                    <input
                        className="input"
                        style={{ width: '100%', marginBottom: 12 }}
                        placeholder="用户名"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                    />
                    <button className="button button-primary" style={{ width: '100%' }} onClick={handlePhoneRegisterFinish} disabled={loading}>
                        {loading ? '注册中...' : '完成注册'}
                    </button>
                    {error && <div style={{ color: 'var(--color-error)', fontSize: 14, marginTop: 12 }}>{error}</div>}
                </div>
            </div>
        );
    }

    // 邮箱注册表单
    const renderEmailRegister = () => (
        <>
            <input
                className="input"
                style={{ width: '100%', marginBottom: 12 }}
                placeholder="用户名"
                value={username}
                onChange={e => setUsername(e.target.value)}
            />
            <input
                className="input"
                style={{ width: '100%', marginBottom: 12 }}
                placeholder="邮箱"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
            />
            <input
                className="input"
                style={{ width: '100%', marginBottom: 12 }}
                placeholder="密码（至少8位，含大小写、数字、特殊字符）"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
            />
            <button className="button button-primary" style={{ width: '100%' }} onClick={handleEmailRegister} disabled={loading}>
                {loading ? '注册中...' : '注册'}
            </button>
        </>
    );

    // 手机号注册表单（第一步）
    const renderPhoneRegister = () => (
        <>
            <input
                className="input"
                style={{ width: '100%', marginBottom: 12 }}
                placeholder="手机号"
                value={phone}
                onChange={e => setPhone(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                    className="input"
                    style={{ flex: 1 }}
                    placeholder="验证码"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                />
                <button className="button" onClick={handleSendCode} disabled={loading}>
                    获取验证码
                </button>
            </div>
            <button className="button button-primary" style={{ width: '100%' }} onClick={handlePhoneLogin} disabled={loading}>
                {loading ? '验证并继续' : '下一步'}
            </button>
        </>
    );

    // 邮箱登录表单
    const renderEmailLogin = () => (
        <>
            <input
                className="input"
                style={{ width: '100%', marginBottom: 12 }}
                placeholder="邮箱"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
            />
            <input
                className="input"
                style={{ width: '100%', marginBottom: 12 }}
                placeholder="密码"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
            />
            <button className="button button-primary" style={{ width: '100%' }} onClick={handleEmailLogin} disabled={loading}>
                {loading ? '登录中...' : '登录'}
            </button>
        </>
    );

    // 手机号登录表单
    const renderPhoneLogin = () => (
        <>
            <input
                className="input"
                style={{ width: '100%', marginBottom: 12 }}
                placeholder="手机号"
                value={phone}
                onChange={e => setPhone(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                    className="input"
                    style={{ flex: 1 }}
                    placeholder="验证码"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                />
                <button className="button" onClick={handleSendCode} disabled={loading}>
                    获取验证码
                </button>
            </div>
            <button className="button button-primary" style={{ width: '100%' }} onClick={handlePhoneLogin} disabled={loading}>
                {loading ? '登录中...' : '登录'}
            </button>
        </>
    );

    return (
        <div style={{ maxWidth: 400, margin: '60px auto' }}>
            <div style={{ display: 'flex', marginBottom: 24 }}>
                <button
                    onClick={() => {
                        setMode('login');
                        setError('');
                    }}
                    style={{
                        flex: 1,
                        padding: 12,
                        border: 'none',
                        background: mode === 'login' ? 'var(--color-canvas)' : 'var(--color-surface-1)',
                        fontWeight: mode === 'login' ? 600 : 400,
                        borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                        cursor: 'pointer',
                    }}
                >
                    登录
                </button>
                <button
                    onClick={() => {
                        setMode('register');
                        setError('');
                    }}
                    style={{
                        flex: 1,
                        padding: 12,
                        border: 'none',
                        background: mode === 'register' ? 'var(--color-canvas)' : 'var(--color-surface-1)',
                        fontWeight: mode === 'register' ? 600 : 400,
                        borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                        cursor: 'pointer',
                    }}
                >
                    注册
                </button>
            </div>

            <div className="card" style={{ padding: 24 }}>
                {mode === 'login' && (
                    <>
                        <div style={{ display: 'flex', marginBottom: 16 }}>
                            <button
                                onClick={() => setLoginType('email')}
                                style={{
                                    flex: 1,
                                    padding: '8px 0',
                                    border: 'none',
                                    background: 'transparent',
                                    borderBottom: loginType === 'email' ? `2px solid var(--color-primary)` : 'none',
                                    fontWeight: loginType === 'email' ? 600 : 400,
                                    cursor: 'pointer',
                                }}
                            >
                                邮箱登录
                            </button>
                            <button
                                onClick={() => setLoginType('phone')}
                                style={{
                                    flex: 1,
                                    padding: '8px 0',
                                    border: 'none',
                                    background: 'transparent',
                                    borderBottom: loginType === 'phone' ? `2px solid var(--color-primary)` : 'none',
                                    fontWeight: loginType === 'phone' ? 600 : 400,
                                    cursor: 'pointer',
                                }}
                            >
                                手机号登录
                            </button>
                        </div>
                        {loginType === 'email' && renderEmailLogin()}
                        {loginType === 'phone' && renderPhoneLogin()}
                        {/* 第三方登录放在底部 */}
                        <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="button" style={{ flex: 1 }} onClick={handleWechatLogin}>
                                微信
                            </button>
                            <button className="button" style={{ flex: 1 }} onClick={handleGithubLogin}>
                                GitHub
                            </button>
                        </div>
                    </>
                )}

                {mode === 'register' && (
                    <>
                        <div style={{ display: 'flex', marginBottom: 16 }}>
                            <button
                                onClick={() => setRegisterType('email')}
                                style={{
                                    flex: 1,
                                    padding: '8px 0',
                                    border: 'none',
                                    background: 'transparent',
                                    borderBottom: registerType === 'email' ? `2px solid var(--color-primary)` : 'none',
                                    fontWeight: registerType === 'email' ? 600 : 400,
                                    cursor: 'pointer',
                                }}
                            >
                                邮箱注册
                            </button>
                            <button
                                onClick={() => setRegisterType('phone')}
                                style={{
                                    flex: 1,
                                    padding: '8px 0',
                                    border: 'none',
                                    background: 'transparent',
                                    borderBottom: registerType === 'phone' ? `2px solid var(--color-primary)` : 'none',
                                    fontWeight: registerType === 'phone' ? 600 : 400,
                                    cursor: 'pointer',
                                }}
                            >
                                手机号注册
                            </button>
                        </div>
                        {registerType === 'email' && renderEmailRegister()}
                        {registerType === 'phone' && renderPhoneRegister()}
                    </>
                )}

                {error && <div style={{ color: 'var(--color-error)', fontSize: 14, marginTop: 12, textAlign: 'center' }}>{error}</div>}
            </div>
        </div>
    );
};