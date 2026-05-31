import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '服务健康检查', description: 'Kubernetes 就绪探针' })
    async check() {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return {
                status: 'ok',
                timestamp: new Date().toISOString(),
                database: 'connected',
            };
        } catch {
            return {
                status: 'error',
                timestamp: new Date().toISOString(),
                database: 'disconnected',
            };
        }
    }

    @Get('live')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '存活检查', description: 'Kubernetes 存活探针' })
    live() {
        return { status: 'alive' };
    }
}