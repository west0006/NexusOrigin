// server/api-gateway/src/modules/capability/capability-audit.spec.ts
import { CapabilityAuditService } from './capability-audit.service';

describe('CapabilityAuditService', () => {
    let audit: CapabilityAuditService;

    beforeEach(() => {
        audit = new CapabilityAuditService();
    });

    describe('approve safe code', () => {
        it('should approve normal Python code', async () => {
            const result = await audit.audit(undefined, 'def hello(): return "world"');
            expect(result.approved).toBe(true);
        });

        it('should approve normal TypeScript code', async () => {
            const result = await audit.audit(undefined, 'const x: number = 42; export { x };');
            expect(result.approved).toBe(true);
        });

        it('should approve without sourceCode (packageUrl only)', async () => {
            const result = await audit.audit('https://npmjs.com/package/test', undefined);
            expect(result.approved).toBe(true);
        });
    });

    describe('reject dangerous patterns', () => {
        it('should reject eval() usage', async () => {
            const result = await audit.audit(undefined, 'eval("console.log(1)")');
            expect(result.approved).toBe(false);
            expect(result.reason).toContain('eval');
        });

        it('should reject child_process import', async () => {
            const result = await audit.audit(undefined, 'require("child_process")');
            expect(result.approved).toBe(false);
            expect(result.reason).toContain('child_process');
        });

        it('should reject fs.writeFileSync', async () => {
            const result = await audit.audit(undefined, 'fs.writeFileSync("/tmp/x", "data")');
            expect(result.approved).toBe(false);
        });

        it('should reject process.exit', async () => {
            const result = await audit.audit(undefined, 'process.exit(1)');
            expect(result.approved).toBe(false);
        });

        it('should reject /etc/passwd access', async () => {
            const result = await audit.audit(undefined, 'readFile("/etc/passwd")');
            expect(result.approved).toBe(false);
        });

        it('should reject spawn calls', async () => {
            const result = await audit.audit(undefined, 'spawn("rm", ["-rf", "/"])');
            expect(result.approved).toBe(false);
        });

        it('should reject new Function', async () => {
            const result = await audit.audit(undefined, 'new Function("return 1")');
            expect(result.approved).toBe(false);
        });
    });

    describe('reject empty/short code', () => {
        it('should reject empty code', async () => {
            const result = await audit.audit(undefined, '');
            expect(result.approved).toBe(false);
            expect(result.reason).toContain('过短');
        });

        it('should reject very short code (< 10 chars)', async () => {
            const result = await audit.audit(undefined, '123456789');
            expect(result.approved).toBe(false);
        });
    });

    describe('package URL validation', () => {
        it('should approve allowed hosts', async () => {
            const hosts = [
                'https://npmjs.com/package/foo',
                'https://www.npmjs.org/package/bar',
                'https://github.com/user/repo',
                'https://gitlab.com/group/proj',
                'https://bitbucket.org/team/repo',
            ];
            for (const url of hosts) {
                const result = await audit.audit(url);
                expect(result.approved).withContext(url).toBe(true);
            }
        });

        it('should reject unknown hosts', async () => {
            const result = await audit.audit('https://evil.com/malware');
            expect(result.approved).toBe(false);
            expect(result.reason).toContain('evil.com');
        });

        it('should reject malformed URLs', async () => {
            const result = await audit.audit('not-a-url');
            expect(result.approved).toBe(false);
            expect(result.reason).toContain('Invalid');
        });
    });

    describe('warnings for network calls', () => {
        it('should warn about fetch() but still approve', async () => {
            const result = await audit.audit(undefined, 'const data = await fetch("/api");');
            expect(result.approved).toBe(true);
            expect(result.warnings).toBeDefined();
            expect(result.warnings!.some(w => w.includes('网络请求'))).toBe(true);
        });

        it('should warn about axios usage', async () => {
            const result = await audit.audit(undefined, 'import axios from "axios"; await axios.get("/x");');
            expect(result.approved).toBe(true);
            expect(result.warnings).toBeDefined();
        });
    });
});
