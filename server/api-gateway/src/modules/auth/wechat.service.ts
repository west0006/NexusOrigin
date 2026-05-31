import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WechatUserInfo {
    unionId: string;
    openId: string;
    nickname: string;
    headImgUrl: string;
}

@Injectable()
export class WechatService {
    private readonly logger = new Logger(WechatService.name);

    constructor(private readonly configService: ConfigService) {}

    async getUserInfo(code: string): Promise<WechatUserInfo> {
        const appId = this.configService.get('WECHAT_OPEN_APP_ID');
        const appSecret = this.configService.get('WECHAT_OPEN_APP_SECRET');

        if (!appId || !appSecret) {
            this.logger.warn('[微信] AppId/Secret 未配置，使用 mock 数据');
            return this.mockUser(code);
        }

        // 第1步：用 code 换 access_token + openid
        const tokenUrl =
            `https://api.weixin.qq.com/sns/oauth2/access_token` +
            `?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`;

        let tokenRes: any;
        try {
            const fetch = (await import('node-fetch')).default;
            tokenRes = await fetch(tokenUrl).then((r: { json: () => any; }) => r.json());
        } catch (err: any) {
            this.logger.error('[微信] 获取 access_token 网络错误', err?.message);
            throw new BadRequestException('微信授权失败，请稍后重试');
        }

        if (tokenRes.errcode) {
            this.logger.error(`[微信] 获取 access_token 失败: ${tokenRes.errmsg}`);
            throw new BadRequestException('微信授权已过期，请重新授权');
        }

        // 第2步：用 access_token + openid 获取用户信息
        const userInfoUrl =
            `https://api.weixin.qq.com/sns/userinfo` +
            `?access_token=${tokenRes.access_token}&openid=${tokenRes.openid}&lang=zh_CN`;

        let userInfoRes: any;
        try {
            const fetch = (await import('node-fetch')).default;
            userInfoRes = await fetch(userInfoUrl).then((r: { json: () => any; }) => r.json());
        } catch (err: any) {
            this.logger.error('[微信] 获取用户信息网络错误', err?.message);
            throw new BadRequestException('微信授权失败，请稍后重试');
        }

        if (userInfoRes.errcode) {
            this.logger.error(`[微信] 获取用户信息失败: ${userInfoRes.errmsg}`);
            throw new BadRequestException('微信授权失败');
        }

        return {
            unionId: userInfoRes.unionid || userInfoRes.openid,
            openId: userInfoRes.openid,
            nickname: userInfoRes.nickname,
            headImgUrl: userInfoRes.headimgurl,
        };
    }

    private mockUser(code: string): WechatUserInfo {
        return {
            unionId: `mock_wx_${code.slice(0, 8)}`,
            openId: `mock_open_${code.slice(0, 12)}`,
            nickname: '微信用户',
            headImgUrl: '',
        };
    }
}