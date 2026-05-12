import { Injectable } from '@nestjs/common';

@Injectable()
export class CapabilityAuditService {
    async audit(packageUrl?: string, sourceCode?: string): Promise<{ approved: boolean; reason?: string }> {
        // 1. 模拟静态扫描
        if (sourceCode) {
            if (sourceCode.includes('eval(') || sourceCode.includes('child_process')) {
                return { approved: false, reason: '代码包含高危API调用' };
            }
        }
        // 2. 模拟许可证检查
        // 3. 目前默认通过
        return { approved: true };
    }
}