// ─── server/api-gateway/src/modules/agent/agent-card.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class AgentCardService {
    /**
     * 生成平台的 Agent Card，用于 A2A 发现
     */
    generateAgentCard(userId: string, agentName: string, skills: string[]) {
        return {
            name: agentName,
            description: 'OpenClaw 用户代理',
            url: `https://shrimp-platform.com/agents/${userId}`,
            capabilities: skills,
            authentication: {
                type: 'bearer',
            },
            version: '1.0.0',
        };
    }
}