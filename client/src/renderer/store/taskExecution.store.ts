// client/src/renderer/store/taskExecution.store.ts
import { create } from 'zustand';

interface TaskStep {
    stepId: string;
    capabilityId: string;
    agentId: string | null;
    input: string;
    output: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    cost: number;
    tokenCount: { input: number; output: number };
    startedAt: number | null;
    completedAt: number | null;
    error?: string;
}

interface OrchestrationTask {
    taskId: string;
    originalInput: string;
    steps: TaskStep[];
    status: 'pending' | 'running' | 'completed' | 'failed' | 'breached';
    totalCost: number;
    totalTokens: { input: number; output: number };
    createdAt: number;
    completedAt: number | null;
}

interface TaskExecutionState {
    currentTask: OrchestrationTask | null;
    taskHistory: OrchestrationTask[];
    showFlow: boolean;
    budget: number;
    setBudget: (budget: number) => void;
    resetBudget: () => void;

    setCurrentTask: (task: OrchestrationTask | null) => void;
    updateStep: (stepId: string, update: Partial<TaskStep>) => void;
    addToHistory: (task: OrchestrationTask) => void;
    setShowFlow: (show: boolean) => void;
    clearCurrent: () => void;
}

const DEFAULT_BUDGET = 0.05;

export const useTaskExecutionStore = create<TaskExecutionState>((set, get) => ({
    currentTask: null,
    taskHistory: [],
    showFlow: false,
    budget: DEFAULT_BUDGET,

    setBudget: (budget) => set({ budget }),
    resetBudget: () => set({ budget: DEFAULT_BUDGET }),

    setCurrentTask: (task) => set({ currentTask: task }),

    updateStep: (stepId, update) => {
        const task = get().currentTask;
        if (!task) return;

        const steps = task.steps.map(s =>
            s.stepId === stepId ? { ...s, ...update } : s
        );

        const totalCost = steps.reduce((sum, s) => sum + s.cost, 0);
        const totalTokens = steps.reduce(
            (acc, s) => ({ input: acc.input + s.tokenCount.input, output: acc.output + s.tokenCount.output }),
            { input: 0, output: 0 },
        );

        // 熔断检查
        const budget = get().budget;
        const breached = totalCost >= budget;

        const allDone = steps.every(s => s.status === 'completed' || s.status === 'failed');
        const newStatus = breached
            ? 'breached'
            : allDone
                ? (steps.some(s => s.status === 'failed') ? 'failed' : 'completed')
                : (task.status === 'pending' && steps.some(s => s.status === 'running') ? 'running' : task.status);

        const updatedTask: OrchestrationTask = {
            ...task,
            steps,
            totalCost,
            totalTokens,
            status: newStatus,
            completedAt: (allDone || breached) ? Date.now() : task.completedAt,
        };

        set({ currentTask: updatedTask });

        // 完成后自动加入历史
        if (newStatus === 'completed' || newStatus === 'failed' || newStatus === 'breached') {
            const history = get().taskHistory;
            const exists = history.some(h => h.taskId === updatedTask.taskId);
            if (!exists) {
                set(s => ({ taskHistory: [updatedTask, ...s.taskHistory].slice(0, 50) }));
            }
        }
    },

    addToHistory: (task) => set(s => ({ taskHistory: [task, ...s.taskHistory].slice(0, 50) })),

    setShowFlow: (show) => set({ showFlow: show }),

    clearCurrent: () => set({ currentTask: null }),
}));