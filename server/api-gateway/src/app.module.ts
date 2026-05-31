import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './modules/auth/auth.module';
import { AgentModule } from './modules/agent/agent.module';
import { AgentRegistryModule } from './modules/agent-registry/agent-registry.module';
import { TaskModule } from './modules/task/task.module';
import { BillingModule } from './modules/billing/billing.module';
import { CapabilityModule } from './modules/capability/capability.module';
import { CommunityModule } from './modules/community/community.module';
import { ModelGatewayModule } from './modules/model-gateway/model-gateway.module';
import { A2AGatewayModule } from './modules/a2a-gateway/a2a-gateway.module';
import { HealthModule } from './modules/health/health.module';
import { SkillModule } from './modules/skill/skill.module';
import { UserModule } from './modules/user/user.module';
import {SearchModule} from "./modules/search/search.module";

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ThrottlerModule.forRoot([
            {
                ttl: 60000,
                limit: 100,
            },
        ]),
        AuthModule,
        AgentModule,
        AgentRegistryModule,
        TaskModule,
        BillingModule,
        CapabilityModule,
        CommunityModule,
        ModelGatewayModule,
        A2AGatewayModule,
        HealthModule,
        SkillModule,
        UserModule,
        SearchModule,
    ],
    providers: [
        PrismaService,
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule {}