/**
 * 用户会话管理工具 - session_title_set
 * 设置会话标题
 */

import { tool, ToolDefinition } from '@opencode-ai/plugin';
import { getSessionManager } from '../../session/manager';

// OpenCode 客户端引用
let opencodeClient: any = null;

export function setOpenCodeClient(client: any): void {
  opencodeClient = client;
}

export const sessionTitleSetTool: ToolDefinition = tool({
  description: '设置 OpenCode 会话标题',
  args: {
    userId: tool.schema.number().describe('用户QQ号'),
    sessionId: tool.schema.string().describe('OpenCode 会话ID'),
    title: tool.schema.string().describe('新标题'),
  },
  async execute(args) {
    const sessionManager = getSessionManager();

    // 更新本地标题
    const updated = sessionManager.updateSessionTitle(args.userId, args.sessionId, args.title);

    // 尝试更新 OpenCode 会话标题
    if (opencodeClient) {
      try {
        await opencodeClient.session.update({
          path: { id: args.sessionId },
          body: { title: args.title },
        });
      } catch (error: any) {}
    }

    return JSON.stringify({
      success: true,
      userId: args.userId,
      sessionId: args.sessionId,
      title: args.title,
      message: 'Session title updated',
    }, null, 2);
  },
});