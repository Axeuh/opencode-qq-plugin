/**
 * 自定义工具 - qq_get_friends
 * 获取 QQ 好友列表
 */
import { tool } from '@opencode-ai/plugin';
import { getNapCatClient } from '../napcat/client';
export const qqGetFriendsTool = tool({
    description: '获取机器人的 QQ 好友列表',
    args: {},
    async execute(args, context) {
        const napcat = getNapCatClient();
        try {
            const friends = await napcat.getFriendList();
            const result = friends.map(f => ({
                userId: f.user_id,
                nickname: f.nickname,
                remark: f.remark || '',
            }));
            return JSON.stringify({
                success: true,
                count: result.length,
                friends: result,
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
//# sourceMappingURL=get_friends.js.map