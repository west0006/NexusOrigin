// ─── server/api-gateway/src/app.module.ts ─────────────────
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { CommunityModule } from './modules/community/community.module';
import { PrismaModule } from './prisma/prisma.module';
import {CapabilityModule} from "./modules/capability/capability.module";
import { AgentRegistryModule } from './modules/agent-registry/agent-registry.module';
import {A2AGatewayModule} from "./modules/a2a-gateway/a2a-gateway.module";

@Module({
    imports: [ ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        UserModule,
        CommunityModule,
        CapabilityModule,
        AgentRegistryModule,
        A2AGatewayModule,
    ],
})
export class AppModule {}

