import { Module } from '@nestjs/common';
import { CapabilityController } from './capability.controller';
import { CapabilityService } from './capability.service';
import { CapabilityAuditService } from './capability-audit.service';
import {PrismaModule} from "../../prisma/prisma.module";
import {BillingModule} from "../billing/billing.module";

@Module({
    imports: [PrismaModule, BillingModule],
    controllers: [CapabilityController],
    providers: [CapabilityService, CapabilityAuditService],
})
export class CapabilityModule {}