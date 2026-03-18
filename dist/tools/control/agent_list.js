/**
 * 智能体管理工具 - agent_list
 * 获取可用智能体列表
 */
import { tool } from '@opencode-ai/plugin';
import { getAgentModelCache } from '../../cache/agent-model';
import { getOpenCodeConfig } from '../../config/loader';
export const agentListTool = tool({
    description: '获取 OpenCode 可用的智能体列表',
    args: {},
    async execute(args) {
        const cache = getAgentModelCache();
        const config = getOpenCodeConfig();
        const agents = cache.isInitialized()
            ? cache.getAgents()
            : config.supportedAgents.map(name => ({ name }));
        return JSON.stringify({
            success: true,
            count: agents.length,
            agents: agents.map((a) => ({
                name: a.name,
                description: a.description || '',
            })),
        }, null, 2);
    },
});
//# sourceMappingURL=agent_list.js.map