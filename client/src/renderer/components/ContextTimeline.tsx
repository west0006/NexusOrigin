import React from 'react';

interface ContextItem {
    id: string;
    content: React.ReactNode;
    isFocused?: boolean;
    isParent?: boolean;
    isChild?: boolean;
}

interface Props {
    items: ContextItem[];
}

export const ContextTimeline: React.FC<Props> = ({ items }) => (
    <div style={{ position: 'relative', paddingLeft: 20 }}>
        {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            return (
                <div
                    key={item.id}
                    style={{
                        position: 'relative',
                        paddingLeft: 16,
                        marginBottom: isLast ? 0 : 8,
                        borderLeft: `2px solid ${item.isFocused ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        ...(item.isFocused && {
                            backgroundColor: '#F3F0FF',
                            boxShadow: '0 0 0 4px rgba(108,92,231,0.1)',
                        }),
                    }}
                >
                    {item.content}
                </div>
            );
        })}
    </div>
);