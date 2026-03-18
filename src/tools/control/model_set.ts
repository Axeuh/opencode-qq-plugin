/**
 * 模型管理工具 - model_set
 * 设置用户模型
 */

import { tool, ToolDefinition } from '@opencode-ai/plugin';
import { getSessionManager } from '../../session/manager';
import { getAgentModelCache } from '../../cache/agent-model';
import { getOpenCodeConfig } from '../../config/loader';

export const modelSetTool: ToolDefinition = tool({
  description: '设置用户的默认模型',
  args: {
    userId: tool.schema.number().describe('用户QQ号'),
    model: tool.schema.string().describe('模型ID（格式：provider/model）'),
  },
  async execute(args) {
    const sessionManager = getSessionManager();
    const cache = getAgentModelCache();
    const config = getOpenCodeConfig();

    // 验证模型是否存在
    const validModels = cache.isInitialized() 
      ? cache.getModelIds() 
      : config.supportedModels;

    if (!validModels.includes(args.model)) {
      return JSON.stringify({
        success: false,
        error: `Invalid model: ${args.model}. Available: ${validModels.slice(0, 5).join(', ')}...`,
      }, null, 2);
    }

    // 更新用户配置
    sessionManager.updateUserConfig(args.userId, { model: args.model });

    return JSON.stringify({
      success: true,
      userId: args.userId,
      model: args.model,
      message: 'Model updated successfully',
    }, null, 2);
  },
});