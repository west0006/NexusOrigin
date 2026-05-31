import { Module } from '@nestjs/common';
import { AgentRegistryController } from './agent-registry.controller';
import { AgentRegistryService } from './agent-registry.service';
import {PrismaModule} from "../../prisma/prisma.module";

@Module({
    imports: [PrismaModule],
    controllers: [AgentRegistryController],
    providers: [AgentRegistryService],
})
export class AgentRegistryModule {}