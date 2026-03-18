/**
 * 自定义工具 - qq_search_friend
 * 通过昵称或备注搜索好友
 */
import { tool } from '@opencode-ai/plugin';
import { getNapCatClient } from '../napcat/client';
export const qqSearchFriendTool = tool({
    description: '通过昵称或备注搜索 QQ 好友。支持模糊匹配和精确匹配。',
    args: {
        name: tool.schema.string().min(1).max(50).describe('要搜索的名称（昵称或备注）'),
        exactMatch: tool.schema.boolean().optional().default(false).describe('是否精确匹配，默认为模糊匹配'),
    },
    async execute(args, context) {
        const napcat = getNapCatClient();
        try {
            const friends = await napcat.searchFriend(args.name, args.exactMatch);
            if (friends.length === 0) {
                return JSON.stringify({
                    success: true,
                    count: 0,
                    message: `未找到匹配 "${args.name}" 的好友`,
                    friends: [],
                }, null, 2);
            }
            const result = friends.map(f => ({
                userId: f.user_id,
                nickname: f.nickname,
                remark: f.remark || '',
            }));
            return JSON.stringify({
                success: true,
                count: result.length,
                matchType: args.exactMatch ? 'exact' : 'fuzzy',
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
//# sourceMappingURL=search_friend.js.map