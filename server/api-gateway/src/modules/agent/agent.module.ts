// ─── server/api-gateway/src/modules/agent/agent.module.ts ──
import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { A2AAdapterService } from './a2a-adapter.service';
import { AgentCardService } from './agent-card.service';

@Module({
    controllers: [AgentController],
    providers: [AgentService, A2AAdapterService, AgentCardService],
})
export class AgentModule {}