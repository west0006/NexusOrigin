// client/src/renderer/store/userLevel.store.ts (完整替换)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── 类型 ──
export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    unlockedAt?: number;
}

export interface Quest {
    id: string;
    title: string;
    description: string;
    icon: string;
    exp: number;                  // 完成奖励经验
    progress: number;             // 当前进度
    maxProgress: number;          // 目标进度
    completed: boolean;
    completedAt?: number;
    category: 'onboarding' | 'deploy' | 'community' | 'agent' | 'market' | 'credit';
}

export interface LevelInfo {
    level: number;
    exp: number;
    expToNext: number;
    title: string;
}

// ── 等级配置 ──
const LEVEL_CONFIG = [
    { level: 1, expRequired: 0, title: '萌新' },
    { level: 2, expRequired: 100, title: '潜水员' },
    { level: 3, expRequired: 300, title: '老哥' },
    { level: 4, expRequired: 600, title: '冲浪手' },
    { level: 5, expRequired: 1000, title: '大佬' },
    { level: 6, expRequired: 1600, title: '卷王' },
    { level: 7, expRequired: 2400, title: '赛博菩萨' },
    { level: 8, expRequired: 3400, title: '人脉王' },
    { level: 9, expRequired: 4600, title: '天花板' },
    { level: 10, expRequired: 6000, title: '神' },
];

// ── 预设成就徽章 ──
export const PRESET_BADGES: Badge[] = [
    { id: 'badge-first-deploy', name: '初露锋芒', description: '完成首次框架部署', icon: '🚀' },
    { id: 'badge-first-post', name: '初次发声', description: '在社区发布第一个帖子', icon: '📢' },
    { id: 'badge-first-agent', name: '创造者', description: '注册第一个 Agent', icon: '🤖' },
    { id: 'badge-api-key', name: '连接者', description: '绑定第一个 API Key', icon: '🔑' },
    { id: 'badge-three-agents', name: '集结号', description: '注册 3 个 Agent', icon: '👥' },
    { id: 'badge-ten-posts', name: '活跃分子', description: '发布 10 个帖子', icon: '💬' },
    { id: 'badge-community-fav', name: '人气之星', description: '帖子获得 10 个收藏', icon: '⭐' },
    { id: 'badge-market-publish', name: '上架者', description: '在能力市场发布一条能力', icon: '🏪' },
    { id: 'badge-cost-analyst', name: '精算师', description: '查看成本仪表盘 3 天', icon: '📊' },
    { id: 'badge-deployment-pro', name: '部署大师', description: '完成 5 次部署', icon: '🔧' },
    { id: 'badge-streak-7', name: '连续打卡', description: '连续登录 7 天', icon: '🔥' },
    { id: 'badge-onboarding-done', name: '毕业了', description: '完成所有新手引导', icon: '🎓' },
];

// ── 预设成就任务 ──
export const PRESET_QUESTS: Quest[] = [
    { id: 'quest-deploy-first', title: '首次部署', description: '完成任意框架的一键部署', icon: '🚀', exp: 50, progress: 0, maxProgress: 1, completed: false, category: 'deploy' },
    { id: 'quest-post-first', title: '首次发帖', description: '在社区发布一个帖子', icon: '📢', exp: 30, progress: 0, maxProgress: 1, completed: false, category: 'community' },
    { id: 'quest-api-key', title: '连接模型', description: '绑定一个 API Key 到网关', icon: '🔑', exp: 40, progress: 0, maxProgress: 1, completed: false, category: 'agent' },
    { id: 'quest-agent-first', title: '创造 Agent', description: '注册你的第一个 Agent', icon: '🤖', exp: 60, progress: 0, maxProgress: 1, completed: false, category: 'agent' },
    { id: 'quest-community-3', title: '社交达人', description: '在社区发布 3 个帖子', icon: '💬', exp: 50, progress: 0, maxProgress: 3, completed: false, category: 'community' },
    { id: 'quest-market-list', title: '能力上架', description: '在能力市场上架一条能力', icon: '🏪', exp: 80, progress: 0, maxProgress: 1, completed: false, category: 'market' },
    { id: 'quest-cost-check', title: '成本初探', description: '查看成本仪表盘', icon: '📊', exp: 20, progress: 0, maxProgress: 1, completed: false, category: 'credit' },
    { id: 'quest-deploy-3', title: '三连部署', description: '完成 3 次框架部署', icon: '🔧', exp: 100, progress: 0, maxProgress: 3, completed: false, category: 'deploy' },
    { id: 'quest-agent-3', title: 'Agent 集结', description: '注册 3 个不同 Agent', icon: '👥', exp: 120, progress: 0, maxProgress: 3, completed: false, category: 'agent' },
    { id: 'quest-login-7', title: '七日坚持', description: '连续登录 7 天', icon: '🔥', exp: 150, progress: 0, maxProgress: 7, completed: false, category: 'credit' },
    { id: 'quest-install-marketplace', title: '安装工具', description: '从能力市场安装一个工具', icon: '🧰', exp: 50, progress: 0, maxProgress: 1, completed: false, category: 'market' },
    { id: 'quest-multi-agent', title: '多Agent协作', description: '让两个Agent协同完成一个任务', icon: '🤝', exp: 80, progress: 0, maxProgress: 1, completed: false, category: 'agent' },
    { id: 'quest-file-analysis', title: '文件分析', description: '上传文件并生成图表', icon: '📊', exp: 60, progress: 0, maxProgress: 1, completed: false, category: 'agent' },
    { id: 'quest-schedule-task', title: '定时任务', description: '创建一个定时任务', icon: '⏰', exp: 70, progress: 0, maxProgress: 1, completed: false, category: 'agent' },
    { id: 'quest-a2a-task', title: '委托代理', description: '委托一个翻译代理执行任务', icon: '🔄', exp: 75, progress: 0, maxProgress: 1, completed: false, category: 'agent' },
    { id: 'quest-cache', title: '语义缓存', description: '开启语义缓存功能', icon: '💾', exp: 40, progress: 0, maxProgress: 1, completed: false, category: 'agent' },
    { id: 'quest-community-post', title: '发帖达', description: '在社区发布一篇帖子', icon: '📝', exp: 30, progress: 0, maxProgress: 1, completed: false, category: 'community' },
];

function calcLevelInfo(exp: number): { level: number; expToNext: number; title: string } {
    let level = 1;
    let title = LEVEL_CONFIG[0].title;
    for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
        if (exp >= LEVEL_CONFIG[i].expRequired) {
            level = LEVEL_CONFIG[i].level;
            title = LEVEL_CONFIG[i].title;
            break;
        }
    }
    const next = LEVEL_CONFIG.find((l) => l.level === level + 1);
    const expToNext = next ? next.expRequired - exp : 0;
    return { level, expToNext, title };
}

interface UserLevelState {
    level: number;
    exp: number;
    expToNext: number;
    title: string;
    totalExpEarned: number;
    badges: Badge[];
    quests: Quest[];
    loginStreak: number;
    lastLoginDate: string | null;

    // 经验
    addExp: (amount: number) => void;
    getLevelInfo: () => LevelInfo;

    // 徽章
    unlockBadge: (badge: Badge) => void;
    hasBadge: (badgeId: string) => boolean;

    // 成就任务
    getQuest: (questId: string) => Quest | undefined;
    updateQuestProgress: (questId: string, increment?: number) => void;
    completeQuest: (questId: string) => void;
    getActiveQuests: () => Quest[];
    getCompletedQuests: () => Quest[];
    resetQuests: () => void;

    // 签到
    checkLoginStreak: () => void;
}

export const useUserLevelStore = create<UserLevelState>()(
    persist(
        (set, get) => ({
            level: 1,
            exp: 0,
            expToNext: 100,
            title: '萌新',
            totalExpEarned: 0,
            badges: [],
            quests: PRESET_QUESTS,
            loginStreak: 0,
            lastLoginDate: null,

            // ── 经验 ──
            addExp: (amount) => {
                const { exp, totalExpEarned } = get();
                const newExp = exp + amount;
                const info = calcLevelInfo(newExp);
                set({
                    exp: newExp,
                    totalExpEarned: totalExpEarned + amount,
                    ...info,
                });
            },

            getLevelInfo: () => {
                const { level, exp, expToNext, title } = get();
                return { level, exp, expToNext, title };
            },

            // ── 徽章 ──
            unlockBadge: (badge) => {
                const { badges } = get();
                if (badges.some((b) => b.id === badge.id)) return; // 已拥有
                const newBadge = { ...badge, unlockedAt: Date.now() };
                set({ badges: [...badges, newBadge] });
            },

            hasBadge: (badgeId) => {
                return get().badges.some((b) => b.id === badgeId);
            },

            // ── 成就任务 ──
            getQuest: (questId) => {
                return get().quests.find((q) => q.id === questId);
            },

            updateQuestProgress: (questId, increment = 1) => {
                const { quests } = get();
                const updated = quests.map((q) => {
                    if (q.id !== questId || q.completed) return q;
                    const newProgress = Math.min(q.progress + increment, q.maxProgress);
                    const newlyCompleted = newProgress >= q.maxProgress && !q.completed;
                    if (newlyCompleted) {
                        return { ...q, progress: newProgress, completed: true, completedAt: Date.now() };
                    }
                    return { ...q, progress: newProgress };
                });
                set({ quests: updated });

                // 如果有刚完成的任务，发奖励并解锁对应徽章
                const oldQuest = quests.find((q) => q.id === questId);
                const newQuest = updated.find((q) => q.id === questId);
                if (oldQuest && newQuest && !oldQuest.completed && newQuest.completed) {
                    get().addExp(newQuest.exp);
                    // 根据任务类别解锁对应徽章
                    const badgeMap: Record<string, string> = {
                        'quest-deploy-first': 'badge-first-deploy',
                        'quest-post-first': 'badge-first-post',
                        'quest-api-key': 'badge-api-key',
                        'quest-agent-first': 'badge-first-agent',
                        'quest-market-list': 'badge-market-publish',
                        'quest-cost-check': 'badge-cost-analyst',
                        'quest-agent-3': 'badge-three-agents',
                    };
                    const badgeId = badgeMap[questId];
                    if (badgeId) {
                        const badge = PRESET_BADGES.find((b) => b.id === badgeId);
                        if (badge) get().unlockBadge(badge);
                    }
                }
            },

            completeQuest: (questId) => {
                const { quests } = get();
                const quest = quests.find((q) => q.id === questId);
                if (!quest || quest.completed) return;
                const updated = quests.map((q) =>
                    q.id === questId ? { ...q, completed: true, completedAt: Date.now(), progress: q.maxProgress } : q,
                );
                set({ quests: updated });
                get().addExp(quest.exp);
            },

            getActiveQuests: () => {
                return get().quests.filter((q) => !q.completed);
            },

            getCompletedQuests: () => {
                return get().quests.filter((q) => q.completed);
            },

            resetQuests: () => {
                set({ quests: PRESET_QUESTS.map((q) => ({ ...q })) });
            },

            // ── 签到 ──
            checkLoginStreak: () => {
                const { lastLoginDate, loginStreak } = get();
                const today = new Date().toISOString().slice(0, 10);
                if (lastLoginDate === today) return; // 今天已签到

                const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
                const newStreak = lastLoginDate === yesterday ? loginStreak + 1 : 1;

                set({ loginStreak: newStreak, lastLoginDate: today });

                // 连续签到奖励
                if (newStreak > 1) {
                    get().addExp(newStreak * 5); // 每天递增 5exp
                }

                // 连续 7 天解锁徽章和任务
                if (newStreak >= 7) {
                    const streakBadge = PRESET_BADGES.find((b) => b.id === 'badge-streak-7');
                    if (streakBadge) get().unlockBadge(streakBadge);
                    get().updateQuestProgress('quest-login-7', 0); // 强制完成
                }
            },
        }),
        {
            name: 'nexus-user-level-storage',
            partialize: (state) => ({
                level: state.level,
                exp: state.exp,
                expToNext: state.expToNext,
                title: state.title,
                totalExpEarned: state.totalExpEarned,
                badges: state.badges,
                quests: state.quests,
                loginStreak: state.loginStreak,
                lastLoginDate: state.lastLoginDate,
            }),
        },
    ),
);