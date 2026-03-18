/**
 * API 服务器 - 提供测试接口模拟 QQ 消息
 */
import * as http from 'http';
/**
 * 模拟消息结构
 */
export interface SimulatedMessage {
    user_id: number;
    group_id?: number;
    message: string;
    sender_name?: string;
    message_type?: 'private' | 'group';
}
/**
 * 设置 OpenCode 客户端和消息处理器
 */
export declare function setClient(client: any, handler: (msg: SimulatedMessage) => Promise<void>): void;
/**
 * 创建 API 服务器
 */
export declare function createApiServer(port?: number): http.Server;
//# sourceMappingURL=api-server.d.ts.map