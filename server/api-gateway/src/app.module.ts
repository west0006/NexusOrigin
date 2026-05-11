// ─── server/api-gateway/src/app.module.ts ─────────────────
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { CommunityModule } from './modules/community/community.module';
import { SkillModule } from './modules/skill/skill.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
    imports: [ ConfigModule.forRoot({ isGlobal: true }),PrismaModule, AuthModule, UserModule, CommunityModule, SkillModule],
})
export class AppModule {}

