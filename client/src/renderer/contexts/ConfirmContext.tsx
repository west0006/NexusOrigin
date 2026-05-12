import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';

interface ConfirmOptions {
    title?: string;
    message?: string;
}

type ConfirmFn = (options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export const useConfirm = (): ConfirmFn => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
};

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('确认操作');
    const [message, setMessage] = useState('');
    const [resolver, setResolver] = useState<(value: boolean) => void>(() => {});

    const confirm: ConfirmFn = useCallback((options) => {
        setTitle(options?.title || '确认操作');
        setMessage(options?.message || '确定要执行此操作吗？');
        setOpen(true);
        return new Promise<boolean>((resolve) => {
            setResolver(() => resolve);
        });
    }, []);

    const handleConfirm = () => {
        resolver(true);
        setOpen(false);
    };

    const handleCancel = () => {
        resolver(false);
        setOpen(false);
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <ConfirmModal
                open={open}
                title={title}
                message={message}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </ConfirmContext.Provider>
    );
};