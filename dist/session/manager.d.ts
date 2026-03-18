/**
 * 会话管理器 - 管理 QQ 用户到 OpenCode 会话的映射
 */
import { UserSession, UserConfig, SessionConfig } from '../types';
export declare class SessionManager {
    private userSessions;
    private userConfigs;
    private userSessionHistory;
    private config;
    private dataPath;
    constructor();
    /**
     * 获取配置
     */
    getConfig(): SessionConfig;
    /**
     * 获取用户当前会话
     */
    getUserSession(userId: number): UserSession | undefined;
    /**
     * 创建用户会话
     */
    createUserSession(userId: number, sessionId: string, title?: string, groupId?: number): UserSession;
    /**
     * 更新用户配置
     */
    updateUserConfig(userId: number, options: {
        agent?: string;
        model?: string;
        provider?: string;
    }): UserConfig;
    /**
     * 切换到指定会话
     */
    switchToSession(userId: number, sessionId: string): UserSession;
    /**
     * 获取用户配置
     */
    getUserConfig(userId: number): UserConfig | undefined;
    /**
     * 获取用户会话历史
     */
    getUserSessionHistory(userId: number): Array<{
        sessionId: string;
        title: string;
        createdAt: number;
        lastAccessed: number;
    }>;
    /**
     * 更新会话标题
     */
    updateSessionTitle(userId: number, sessionId: string, newTitle: string): boolean;
    /**
     * 删除会话
     */
    deleteSession(userId: number, sessionId: string): boolean;
    /**
     * 保存数据到文件
     */
    private saveData;
    /**
     * 从文件加载数据
     */
    private loadData;
}
export declare function getSessionManager(): SessionManager;
//# sourceMappingURL=manager.d.ts.map