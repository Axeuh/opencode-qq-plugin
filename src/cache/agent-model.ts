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

// OpenCode client reference
let opencodeClient: any = null;

class AgentModelCache {
  private agents: AgentInfo[] = [];
  private models: ModelInfo[] = [];
  private initialized: boolean = false;

  /**
   * 设置 OpenCode 客户端
   */
  setClient(client: any): void {
    opencodeClient = client;
  }

  /**
   * 初始化缓存（使用 SDK 获取）
   */
  async initialize(fallbackAgents: string[], fallbackModels: string[]): Promise<void> {
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
  private async fetchAgents(fallback: string[]): Promise<void> {
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
      this.agents = data.map((a: any) => ({
        name: a.name,
        description: a.description || '',
      }));
    } catch (error: any) {
      this.agents = fallback.map(name => ({ name }));
    }
  }

  /**
   * 使用 SDK 获取模型列表
   */
  private async fetchModels(fallback: string[]): Promise<void> {
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
          const info = modelInfo as any;
          this.models.push({
            id: `${providerId}/${modelId}`,
            name: info.name || modelId,
            provider: providerId,
          });
        }
      }
    } catch (error: any) {
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
  getAgents(): AgentInfo[] {
    return this.agents;
  }

  /**
   * 获取智能体名称列表
   */
  getAgentNames(): string[] {
    return this.agents.map(a => a.name);
  }

  /**
   * 获取模型列表
   */
  getModels(): ModelInfo[] {
    return this.models;
  }

  /**
   * 获取模型ID列表
   */
  getModelIds(): string[] {
    return this.models.map(m => m.id);
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 重新加载缓存
   */
  async reload(fallbackAgents: string[], fallbackModels: string[]): Promise<void> {
    await this.fetchAgents(fallbackAgents);
    await this.fetchModels(fallbackModels);
  }
}

// 单例实例
let cacheInstance: AgentModelCache | null = null;

/**
 * 获取缓存实例
 */
export function getAgentModelCache(): AgentModelCache {
  if (!cacheInstance) {
    cacheInstance = new AgentModelCache();
  }
  return cacheInstance;
}