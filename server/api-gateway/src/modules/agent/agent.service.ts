// ─── server/api-gateway/src/modules/agent/agent.service.ts ─
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AgentService {
    constructor(private prisma: PrismaService) {}

    async getServices() {
        return this.prisma.agentService.findMany();
    }

    async createTask(clientId: string, description: string) {
        return this.prisma.agentTask.create({
            data: { clientId, description },
        });
    }

    async getTasks(userId: string) {
        return this.prisma.agentTask.findMany({
            where: { OR: [{ clientId: userId }, { providerId: userId }] },
        });
    }
}