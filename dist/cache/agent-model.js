/**
 * Agent & Model Cache Service
 * 使用 OpenCode SDK 获取智能体和模型列表并缓存
 * 不依赖 HTTP API 服务器
 */
// OpenCode client reference
let opencodeClient = null;
class AgentModelCache {
    constructor() {
        this.agents = [];
        this.models = [];
        this.initialized = false;
    }
    /**
     * 设置 OpenCode 客户端
     */
    setClient(client) {
        opencodeClient = client;
    }
    /**
     * 初始化缓存（使用 SDK 获取）
     */
    async initialize(fallbackAgents, fallbackModels) {
        // 并行获取智能体和模型列表
        await Promise.all([
            this.fetchAgents(fallbackAgents),
            this.fetchModels(fallbackModels),
        ]);
        this.initialized = true;
    }
    /**
     * 使用 SDK 获取智能体列表
     */
    async fetchAgents(fallback) {
        if (!opencodeClient) {
            this.agents = fallback.map(name => ({ name }));
            return;
        }
        try {
            const result = await opencodeClient.app.agents();
            if (result.error) {
                throw new Error(JSON.stringify(result.error));
            }
            const data = result.data || [];
            this.agents = data.map((a) => ({
                name: a.name,
                description: a.description || '',
            }));
        }
        catch (error) {
            this.agents = fallback.map(name => ({ name }));
        }
    }
    /**
     * 使用 SDK 获取模型列表
     */
    async fetchModels(fallback) {
        if (!opencodeClient) {
            this.models = fallback.map(id => {
                const parts = id.split('/');
                return {
                    id,
                    name: parts[1] || id,
                    provider: parts[0] || 'unknown',
                };
            });
            return;
        }
        try {
            const result = await opencodeClient.config.providers();
            if (result.error) {
                throw new Error(JSON.stringify(result.error));
            }
            const data = result.data || { providers: [] };
            this.models = [];
            // 解析 providers 结构
            const providers = data.providers || [];
            for (const provider of providers) {
                const providerId = provider.id;
                const providerModels = provider.models || {};
                for (const [modelId, modelInfo] of Object.entries(providerModels)) {
                    const info = modelInfo;
                    this.models.push({
                        id: `${providerId}/${modelId}`,
                        name: info.name || modelId,
                        provider: providerId,
                    });
                }
            }
        }
        catch (error) {
            this.models = fallback.map(id => {
                const parts = id.split('/');
                return {
                    id,
                    name: parts[1] || id,
                    provider: parts[0] || 'unknown',
                };
            });
        }
    }
    /**
     * 获取智能体列表
     */
    getAgents() {
        return this.agents;
    }
    /**
     * 获取智能体名称列表
     */
    getAgentNames() {
        return this.agents.map(a => a.name);
    }
    /**
     * 获取模型列表
     */
    getModels() {
        return this.models;
    }
    /**
     * 获取模型ID列表
     */
    getModelIds() {
        return this.models.map(m => m.id);
    }
    /**
     * 检查是否已初始化
     */
    isInitialized() {
        return this.initialized;
    }
    /**
     * 重新加载缓存
     */
    async reload(fallbackAgents, fallbackModels) {
        await this.fetchAgents(fallbackAgents);
        await this.fetchModels(fallbackModels);
    }
}
// 单例实例
let cacheInstance = null;
/**
 * 获取缓存实例
 */
export function getAgentModelCache() {
    if (!cacheInstance) {
        cacheInstance = new AgentModelCache();
    }
    return cacheInstance;
}
//# sourceMappingURL=agent-model.js.map