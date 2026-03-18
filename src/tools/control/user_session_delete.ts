/**
 * 用户会话管理工具 - user_session_delete
 * 删除用户的会话映射
 */

import { tool, ToolDefinition } from '@opencode-ai/plugin';
import { getSessionManager } from '../../session/manager';

export const userSessionDeleteTool: ToolDefinition = tool({
  description: '删除用户的 OpenCode 会话映射（仅删除本地映射，不删除 OpenCode 会话）',
  args: {
    userId: tool.schema.number().describe('用户QQ号'),
    sessionId: tool.schema.string().describe('要删除的 OpenCode 会话ID'),
  },
  async execute(args) {
    const sessionManager = getSessionManager();

    const deleted = sessionManager.deleteSession(args.userId, args.sessionId);

    if (!deleted) {
      return JSON.stringify({
        success: false,
        error: `Session ${args.sessionId} not found for user ${args.userId}`,
      }, null, 2);
    }

    return JSON.stringify({
      success: true,
      userId: args.userId,
      sessionId: args.sessionId,
      message: 'Session mapping deleted',
    }, null, 2);
  },
});