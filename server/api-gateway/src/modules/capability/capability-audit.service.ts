// ─── server/api-gateway/src/modules/capability/capability-audit.service.ts
import { Injectable } from '@nestjs/common';

// 高危 API 调用模式列表
const DANGEROUS_PATTERNS: RegExp[] = [
    /\beval\s*\(/,
    /\bFunction\s*\(/,
    /\bchild_process\b/,
    /\bexec\s*\(/,
    /\bspawn\s*\(/,
    /\bfs\.(read|write|append)File( Sync)?\s*\(/,
    /\bprocess\.(env|exit|kill)\b/,
    /\brequire\s*\(\s*['"](child_process|fs|net|dgram|cluster|vm)['"]\s*\)/,
    /\/proc\/self\/env/,
    /\/etc\/(passwd|shadow)/,
    /process\.binding/,
    /--inspect/,
    /NODE_OPTIONS/,
    /\bReflect\..*construct/,
    /\bProxy\s*\(/,
    /\bWebSocket\s*\(/,
    /\bnew\s+Function\s*\(/,
    /import\s*\(\s*['"](child_process|fs|net)['"]\s*\)/,
    /atob\s*\(.*\)|btoa\s*\(.*\)/, // 排除 base64 编码
];

// 可疑网络请求
const NETWORK_PATTERNS: RegExp[] = [
    /fetch\s*\(/,
    /\baxios\b/,
    /\bhttps?\.(get|post|request)\s*\(/,
    /\bsocket\.io\b/,
];

@Injectable()
export class CapabilityAuditService {
    async audit(
        packageUrl?: string,
        sourceCode?: string,
    ): Promise<{ approved: boolean; reason?: string; warnings?: string[] }> {
        const warnings: string[] = [];

        // 1. 静态源码扫描
        if (sourceCode) {
            // 检查高危模式
            for (const pattern of DANGEROUS_PATTERNS) {
                if (pattern.test(sourceCode)) {
                    return {
                        approved: false,
                        reason: `代码包含高危 API 调用: ${pattern.source}`,
                    };
                }
            }

            // 检查网络请求（给出警告但不拒绝）
            for (const pattern of NETWORK_PATTERNS) {
                if (pattern.test(sourceCode)) {
                    warnings.push(`代码包含网络请求: ${pattern.source}，请确保仅在沙箱环境中使用`);
                }
            }

            // 检查最小代码大小（空包防护）
            if (sourceCode.trim().length < 10) {
                return {
                    approved: false,
                    reason: '代码内容过短，疑似空包',
                };
            }

            // 检查 Base64/Hex 混淆（过大编码块）
            const base64Blocks = sourceCode.match(/[A-Za-z0-9+/=]{100,}/g);
            if (base64Blocks && base64Blocks.length > 2) {
                warnings.push('包含大段 Base64 编码内容，请人工审核');
            }
        }

        // 2. 检查 packageUrl（如果是 npm 包）
        if (packageUrl) {
            try {
                const url = new URL(packageUrl);
                const allowedHosts = ['npmjs.com', 'npmjs.org', 'github.com', 'gitlab.com', 'bitbucket.org'];
                const isAllowed = allowedHosts.some(host => url.hostname.endsWith(host));
                if (!isAllowed) {
                    return {
                        approved: false,
                        reason: `不允许的包来源: ${url.hostname}`,
                    };
                }
            } catch {
                return {
                    approved: false,
                    reason: '无效的 packageUrl 格式',
                };
            }
        }

        return {
            approved: true,
            ...(warnings.length > 0 ? { warnings } : {}),
        };
    }
}