/**
 * 自定义工具 - qq_get_group_history
 * 获取群历史消息
 */

import { tool, ToolDefinition } from '@opencode-ai/plugin';
import { getNapCatClient } from '../napcat/client';

export const qqGetGroupHistoryTool: ToolDefinition = tool({
  description: '获取 QQ 群的历史消息记录',
  args: {
    groupId: tool.schema.string().describe('群号'),
    count: tool.schema.number().int().min(1).max(100).default(20).describe('获取的消息数量，默认 20'),
  },
  async execute(args, context) {
    const napcat = getNapCatClient();
    
    try {
      const messages = await napcat.getGroupMsgHistory(
        parseInt(args.groupId),
        args.count
      );
      
      const result = messages.map(m => ({
        time: m.time,
        userId: m.user_id,
        nickname: m.sender?.nickname || '',
        message: m.raw_message || '',
        messageId: m.message_id,
      }));
      
      return JSON.stringify({
        success: true,
        groupId: args.groupId,
        count: result.length,
        messages: result,
      }, null, 2);
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
      }, null, 2);
    }
  },
});