/**
 * 模型管理工具 - model_get
 * 获取用户当前模型
 */

import { tool, ToolDefinition } from '@opencode-ai/plugin';
import { getSessionManager } from '../../session/manager';
import { getOpenCodeConfig } from '../../config/loader';

export const modelGetTool: ToolDefinition = tool({
  description: '获取用户当前设置的模型',
  args: {
    userId: tool.schema.number().describe('用户QQ号'),
  },
  async execute(args) {
    const sessionManager = getSessionManager();
    const config = getOpenCodeConfig();

    const userSession = sessionManager.getUserSession(args.userId);
    const userConfig = sessionManager.getUserConfig(args.userId);

    const currentModel = userSession?.model || userConfig?.model || config.defaultModel;

    return JSON.stringify({
      success: true,
      userId: args.userId,
      model: currentModel,
    }, null, 2);
  },
});