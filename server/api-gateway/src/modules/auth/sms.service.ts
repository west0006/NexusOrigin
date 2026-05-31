import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsSendResult {
    success: boolean;
    provider: string;
    raw?: unknown;
}

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name);
    private readonly provider: string;

    constructor(private readonly configService: ConfigService) {
        this.provider = this.configService.get('SMS_PROVIDER') ?? 'test';
    }

    async send(phone: string, code: string): Promise<SmsSendResult> {
        switch (this.provider) {
            case 'aliyun':
                return this.sendViaAliyun(phone, code);
            case 'tencent':
                return this.sendViaTencent(phone, code);
            case 'test':
            default:
                this.logger.log(`[TEST SMS] → ${phone}: ${code}`);
                return { success: true, provider: 'test' };
        }
    }

    private async sendViaAliyun(phone: string, code: string): Promise<SmsSendResult> {
        const accessKeyId = this.configService.get('SMS_ACCESS_KEY_ID');
        const accessKeySecret = this.configService.get('SMS_ACCESS_KEY_SECRET');
        const signName = this.configService.get('SMS_SIGN_NAME');
        const templateCode = this.configService.get('SMS_TEMPLATE_CODE');

        if (!accessKeyId || !accessKeySecret) {
            this.logger.warn('[SMS] 阿里云 AK 未配置，降级为 test 模式');
            this.logger.log(`[TEST SMS] → ${phone}: ${code}`);
            return { success: true, provider: 'test(fallback)' };
        }

        try {
            const Core = await import('@alicloud/openapi-client');
            const Dysmsapi = await import('@alicloud/dysmsapi20170525');

            const client = new Dysmsapi.default(
                new Core.Config({
                    accessKeyId,
                    accessKeySecret,
                    endpoint: 'dysmsapi.aliyuncs.com',
                }),
            );

            const res = await (client.sendSms as any)({
                phoneNumbers: phone,
                signName,
                templateCode,
                templateParam: JSON.stringify({ code }),
            });

            this.logger.log(
                `[SMS] 阿里云发送成功 → ${phone} | RequestId: ${res.body?.requestId}`,
            );
            return { success: true, provider: 'aliyun', raw: res.body };
        } catch (err: any) {
            this.logger.error(`[SMS] 阿里云发送失败 → ${phone}`, err?.message);
            throw err;
        }
    }

    private async sendViaTencent(phone: string, code: string): Promise<SmsSendResult> {
        const appId = this.configService.get('SMS_ACCESS_KEY_ID');
        const appKey = this.configService.get('SMS_ACCESS_KEY_SECRET');
        const signName = this.configService.get('SMS_SIGN_NAME');
        const templateId = this.configService.get('SMS_TEMPLATE_CODE');

        if (!appId || !appKey) {
            this.logger.warn('[SMS] 腾讯云 AK 未配置，降级为 test 模式');
            this.logger.log(`[TEST SMS] → ${phone}: ${code}`);
            return { success: true, provider: 'test(fallback)' };
        }

        try {
            const tencentcloud = await import('tencentcloud-sdk-nodejs-sms');
            const SmsClient = tencentcloud.sms.v20210111.Client;

            const client = new SmsClient({
                credential: { secretId: appId, secretKey: appKey },
                region: 'ap-guangzhou',
            });

            const res = await client.SendSms({
                PhoneNumberSet: [`+86${phone}`],
                SmsSdkAppId: appId,
                SignName: signName,
                TemplateId: templateId,
                TemplateParamSet: [code],
            });

            this.logger.log(
                `[SMS] 腾讯云发送成功 → ${phone} | RequestId: ${res.RequestId}`,
            );
            return { success: true, provider: 'tencent', raw: res };
        } catch (err: any) {
            this.logger.error(`[SMS] 腾讯云发送失败 → ${phone}`, err?.message);
            throw err;
        }
    }
}