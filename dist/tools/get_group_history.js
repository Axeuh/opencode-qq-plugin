/**
 * 自定义工具 - qq_get_group_history
 * 获取群历史消息
 */
import { tool } from '@opencode-ai/plugin';
import { getNapCatClient } from '../napcat/client';
export const qqGetGroupHistoryTool = tool({
    description: '获取 QQ 群的历史消息记录',
    args: {
        groupId: tool.schema.string().describe('群号'),
        count: tool.schema.number().int().min(1).max(100).default(20).describe('获取的消息数量，默认 20'),
    },
    async execute(args, context) {
        const napcat = getNapCatClient();
        try {
            const result = await napcat.getGroupMsgHistory(parseInt(args.groupId), args.count);
            // NapCat API 可能返回 { messages: [...] } 或直接返回数组
            let messages = [];
            if (Array.isArray(result)) {
                messages = result;
            }
            else if (result && Array.isArray(result.messages)) {
                messages = result.messages;
            }
            const formattedMessages = messages.map((m) => ({
                time: m.time,
                userId: m.user_id,
                nickname: m.sender?.nickname || '',
                message: m.raw_message || '',
                messageId: m.message_id,
            }));
            return JSON.stringify({
                success: true,
                groupId: args.groupId,
                count: formattedMessages.length,
                messages: formattedMessages,
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
//# sourceMappingURL=get_group_history.js.map