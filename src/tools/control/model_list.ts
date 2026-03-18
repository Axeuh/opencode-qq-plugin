/**
 * 模型管理工具 - model_list
 * 获取可用模型列表
 */

import { tool, ToolDefinition } from '@opencode-ai/plugin';
import { getAgentModelCache } from '../../cache/agent-model';
import { getOpenCodeConfig } from '../../config/loader';

export const modelListTool: ToolDefinition = tool({
  description: '获取 OpenCode 可用的模型列表',
  args: {},
  async execute(args) {
    const cache = getAgentModelCache();
    const config = getOpenCodeConfig();

    const models = cache.isInitialized() 
      ? cache.getModels() 
      : config.supportedModels.map(id => {
          const parts = id.split('/');
          return { id, name: parts[1] || id, provider: parts[0] || 'unknown' };
        });

    return JSON.stringify({
      success: true,
      count: models.length,
      models: models.map((m: any) => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
      })),
    }, null, 2);
  },
});