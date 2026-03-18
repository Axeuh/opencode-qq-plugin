/**
 * Agent & Model Cache Service
 * 使用 OpenCode SDK 获取智能体和模型列表并缓存
 * 不依赖 HTTP API 服务器
 */
export interface AgentInfo {
    name: string;
    description?: string;
}
export interface ModelInfo {
    id: string;
    name: string;
    provider: string;
}
declare class AgentModelCache {
    private agents;
    private models;
    private initialized;
    /**
     * 设置 OpenCode 客户端
     */
    setClient(client: any): void;
    /**
     * 初始化缓存（使用 SDK 获取）
     */
    initialize(fallbackAgents: string[], fallbackModels: string[]): Promise<void>;
    /**
     * 使用 SDK 获取智能体列表
     */
    private fetchAgents;
    /**
     * 使用 SDK 获取模型列表
     */
    private fetchModels;
    /**
     * 获取智能体列表
     */
    getAgents(): AgentInfo[];
    /**
     * 获取智能体名称列表
     */
    getAgentNames(): string[];
    /**
     * 获取模型列表
     */
    getModels(): ModelInfo[];
    /**
     * 获取模型ID列表
     */
    getModelIds(): string[];
    /**
     * 检查是否已初始化
     */
    isInitialized(): boolean;
    /**
     * 重新加载缓存
     */
    reload(fallbackAgents: string[], fallbackModels: string[]): Promise<void>;
}
/**
 * 获取缓存实例
 */
export declare function getAgentModelCache(): AgentModelCache;
export {};
//# sourceMappingURL=agent-model.d.ts.map