import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

interface Provider {
    id: string;
    name: string;
    baseURL: string;
}

export const settings: React.FC = () => {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [customForm, setCustomForm] = useState({ name: '', baseURL: '', apiKey: '' });

    useEffect(() => {
        apiClient<Provider[]>('/model-gateway/providers').then(setProviders).catch(console.error);
    }, []);

    const addCustom = async () => {
        try {
            const newProvider = await apiClient<Provider>('/model-gateway/custom', {
                method: 'POST',
                body: JSON.stringify(customForm),
            });
            setProviders([...providers, newProvider]);
            setCustomForm({ name: '', baseURL: '', apiKey: '' });
        } catch (e) {
            alert('添加失败');
        }
    };

    return (
        <div style={{ padding: 24 }}>
            <h2>模型供应商</h2>
            <ul>
                {providers.map(p => (
                    <li key={p.id}>{p.name} - {p.baseURL}</li>
                ))}
            </ul>
            <div style={{ marginTop: 24 }}>
                <h3>添加自定义供应商</h3>
                <input placeholder="名称" value={customForm.name} onChange={e => setCustomForm({...customForm, name: e.target.value})} />
                <input placeholder="Base URL" value={customForm.baseURL} onChange={e => setCustomForm({...customForm, baseURL: e.target.value})} />
                <input placeholder="API Key" type="password" value={customForm.apiKey} onChange={e => setCustomForm({...customForm, apiKey: e.target.value})} />
                <button onClick={addCustom}>添加</button>
            </div>
        </div>
    );
};