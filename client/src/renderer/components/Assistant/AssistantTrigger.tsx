// ── AssistantTrigger：页面右下角固定悬浮助手图标
// 极简扁平风格

import React, { useState } from 'react';
import { C } from '../../styles/theme';
import { useAppStore } from '../../store/app';
import {Icon} from "@renderer/components/icons";

const TRIGGER_SIZE = 44;

const AssistantTrigger: React.FC = () => {
    const [hover, setHover] = useState(false);
    const setRoute = useAppStore((s) => s.setRoute);

    return (
        <div
            style={{
                position: 'fixed', bottom: 24, right: 24, zIndex: 9998,
                cursor: 'pointer', userSelect: 'none',
            }}
            onClick={() => setRoute('assistant')}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            {hover && (
                <div style={{
                    position: 'absolute', bottom: TRIGGER_SIZE + 8, right: 0,
                    background: C.cardBg, color: C.textSecondary, padding: '4px 12px',
                    borderRadius: C.radiusSm, fontSize: C.textCaption, whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    pointerEvents: 'none',
                }}>
                    打开平台助理
                </div>
            )}
            <div style={{
                width: TRIGGER_SIZE, height: TRIGGER_SIZE, borderRadius: '50%',
                background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: hover ? '0 4px 16px rgba(108,92,231,0.35)' : '0 2px 8px rgba(0,0,0,0.12)',
                transform: hover ? 'scale(1.08)' : 'scale(1)',
                transition: 'all 0.2s ease',
                color: C.textInverse, fontSize: 18, fontWeight: 700,
            }}>
                <Icon name="bot" size={22} color="#fff" />
            </div>
        </div>
    );
};

export default AssistantTrigger;