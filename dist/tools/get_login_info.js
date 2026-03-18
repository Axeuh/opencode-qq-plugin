/**
 * 自定义工具 - qq_get_login_info
 * 获取当前登录账号信息
 */
import { tool } from '@opencode-ai/plugin';
import { getNapCatClient } from '../napcat/client';
export const qqGetLoginInfoTool = tool({
    description: '获取当前机器人的 QQ 登录账号信息，包括 QQ 号和昵称。',
    args: {},
    async execute(args, context) {
        const napcat = getNapCatClient();
        try {
            const info = await napcat.getLoginInfo();
            return JSON.stringify({
                success: true,
                userId: info.user_id,
                nickname: info.nickname,
            }, null, 2);
        }
        catch (error) {
            return JSON.stringify({
                success: false,
                error: error.message || 'Unknown error',
            }, null, 2);
        }
    },
});
//# sourceMappingURL=get_login_info.js.map