/**
 * 自定义工具 - qq_send_poke
 * 发送戳一戳
 */
import { tool } from '@opencode-ai/plugin';
import { getNapCatClient } from '../napcat/client';
export const qqSendPokeTool = tool({
    description: '向 QQ 用户发送戳一戳（私聊或群聊）。',
    args: {
        userId: tool.schema.string().describe('目标用户的 QQ 号'),
        groupId: tool.schema.string().optional().describe('群号（可选，不填则为私聊戳一戳）'),
    },
    async execute(args, context) {
        const napcat = getNapCatClient();
        try {
            const groupId = args.groupId ? parseInt(args.groupId) : undefined;
            const result = await napcat.sendPoke(parseInt(args.userId), groupId);
            return JSON.stringify({
                success: true,
                userId: args.userId,
                groupId: args.groupId || null,
                type: args.groupId ? 'group' : 'private',
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
//# sourceMappingURL=send_poke.js.map