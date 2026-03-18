/**
 * Web Server - Complete Web Interface for QQ Plugin
 *
 * Features:
 * 1. Static file serving (index.html)
 * 2. Authentication (QQ + password)
 * 3. Session management API (unified with QQ command)
 * 4. SSE event streaming (via plugin hook, no HTTP API needed)
 * 5. OpenCode SDK integration
 */
import * as http from 'http';
import * as https from 'https';
import { WebServerConfig } from './types';
type EventCallback = (event: any) => void;
/**
 * 订阅 OpenCode 事件
 */
export declare function subscribeToEvents(callback: EventCallback): () => void;
/**
 * 广播 OpenCode 事件给所有监听器
 */
export declare function broadcastOpenCodeEvent(event: any): void;
interface UserSession {
    userId: number;
    token: string;
    createdAt: number;
    expiresAt: number;
}
interface UserData {
    qqId: number;
    passwordHash: string;
    agent?: string;
    model?: string;
    provider?: string;
}
declare const userDataStore: Map<number, UserData>;
/**
 * Set configuration
 */
export declare function setConfig(config: {
    whitelistUsers: number[];
    dataPath?: string;
}): void;
/**
 * Set OpenCode client
 */
export declare function setOpenCodeClient(client: any, handler: (msg: any) => Promise<void>): void;
/**
 * Broadcast SSE event to user
 */
export declare function broadcastToUser(userId: number, event: string, data: any): void;
/**
 * Create Web Server
 */
export declare function createWebServer(config: WebServerConfig): http.Server | https.Server;
export { userDataStore, UserSession, UserData };
//# sourceMappingURL=web-server.d.ts.map