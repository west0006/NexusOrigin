import { Module } from '@nestjs/common';
import { CapabilityController } from './capability.controller';
import { CapabilityService } from './capability.service';
import { CapabilityAuditService } from './capability-audit.service';

@Module({
    controllers: [CapabilityController],
    providers: [CapabilityService, CapabilityAuditService],
})
export class CapabilityModule {}