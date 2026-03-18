/**
 * 自定义工具 - qq_send_message
 * 发送 QQ 私聊或群聊消息
 */
import { tool } from '@opencode-ai/plugin';
import { getNapCatClient } from '../napcat/client';
export const qqSendMessageTool = tool({
    description: '发送 QQ 私聊或群聊消息。使用此工具向 QQ 用户发送文本消息。',
    args: {
        messageType: tool.schema.enum(['private', 'group']).describe('消息类型：private 为私聊，group 为群聊'),
        targetId: tool.schema.string().describe('目标 ID：私聊时为 QQ 号，群聊时为群号'),
        message: tool.schema.string().min(1).describe('要发送的消息内容'),
    },
    async execute(args, context) {
        const napcat = getNapCatClient();
        try {
            if (args.messageType === 'private') {
                const result = await napcat.sendPrivateMessage(parseInt(args.targetId), args.message);
                return JSON.stringify({
                    success: true,
                    type: 'private',
                    targetId: args.targetId,
                    messageId: result.message_id,
                }, null, 2);
            }
            else {
                const result = await napcat.sendGroupMessage(parseInt(args.targetId), args.message);
                return JSON.stringify({
                    success: true,
                    type: 'group',
                    targetId: args.targetId,
                    messageId: result.message_id,
                }, null, 2);
            }
        }
        catch (error) {
            return JSON.stringify({
                success: false,
                error: error.message || 'Unknown error',
            }, null, 2);
        }
    },
});
//# sourceMappingURL=send_message.js.map