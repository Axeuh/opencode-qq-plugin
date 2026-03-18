/**
 * 用户会话管理工具 - user_session_list
 * 获取用户的会话映射列表
 */

import { tool, ToolDefinition } from '@opencode-ai/plugin';
import { getSessionManager } from '../../session/manager';

export const userSessionListTool: ToolDefinition = tool({
  description: '获取用户的 OpenCode 会话映射列表（QQ用户到OpenCode会话的映射）',
  args: {
    userId: tool.schema.number().describe('用户QQ号'),
  },
  async execute(args) {
    const sessionManager = getSessionManager();
    const history = sessionManager.getUserSessionHistory(args.userId);
    const currentSession = sessionManager.getUserSession(args.userId);

    const sessions = history.map((h, i) => ({
      index: i + 1,
      sessionId: h.sessionId,
      title: h.title,
      createdAt: new Date(h.createdAt).toISOString(),
      isCurrent: currentSession?.sessionId === h.sessionId,
    }));

    return JSON.stringify({
      success: true,
      userId: args.userId,
      count: sessions.length,
      currentSessionId: currentSession?.sessionId || null,
      sessions,
    }, null, 2);
  },
});