/**
 * 会话管理器 - 管理 QQ 用户到 OpenCode 会话的映射
 */
import * as fs from 'fs';
import * as path from 'path';
import { getSessionConfig, getOpenCodeConfig } from '../config/loader';
export class SessionManager {
    constructor() {
        this.userSessions = new Map();
        this.userConfigs = new Map();
        this.userSessionHistory = new Map();
        this.config = getSessionConfig();
        this.dataPath = this.config.filePath;
        this.loadData();
    }
    /**
     * 获取配置
     */
    getConfig() {
        return this.config;
    }
    /**
     * 获取用户当前会话
     */
    getUserSession(userId) {
        const session = this.userSessions.get(userId);
        if (session) {
            session.lastAccessed = Date.now();
            session.messageCount++;
        }
        return session;
    }
    /**
     * 创建用户会话
     */
    createUserSession(userId, sessionId, title, groupId) {
        const opencodeConfig = getOpenCodeConfig();
        const userConfig = this.userConfigs.get(userId);
        const now = Date.now();
        const sessionTitle = title || `QQ_${userId} | ${new Date().toLocaleString()}`;
        const session = {
            userId,
            sessionId,
            createdAt: now,
            lastAccessed: now,
            title: sessionTitle,
            agent: userConfig?.agent || opencodeConfig.defaultAgent,
            model: userConfig?.model || opencodeConfig.defaultModel,
            provider: userConfig?.provider || 'alibaba-coding-plan-cn',
            groupId,
            messageCount: 0,
            isActive: true,
        };
        this.userSessions.set(userId, session);
        // 添加到历史记录
        if (!this.userSessionHistory.has(userId)) {
            this.userSessionHistory.set(userId, []);
        }
        const history = this.userSessionHistory.get(userId);
        history.push({
            sessionId,
            title: sessionTitle,
            createdAt: now,
            lastAccessed: now,
        });
        // 限制历史记录数量
        if (history.length > this.config.maxSessionsPerUser) {
            history.shift();
        }
        this.saveData();
        return session;
    }
    /**
     * 更新用户配置
     */
    updateUserConfig(userId, options) {
        let userConfig = this.userConfigs.get(userId);
        if (!userConfig) {
            const opencodeConfig = getOpenCodeConfig();
            userConfig = {
                userId,
                agent: opencodeConfig.defaultAgent,
                model: opencodeConfig.defaultModel,
                provider: 'alibaba-coding-plan-cn',
                createdAt: Date.now(),
            };
        }
        if (options.agent)
            userConfig.agent = options.agent;
        if (options.model)
            userConfig.model = options.model;
        if (options.provider)
            userConfig.provider = options.provider;
        this.userConfigs.set(userId, userConfig);
        // 同时更新当前会话
        const session = this.userSessions.get(userId);
        if (session) {
            if (options.agent)
                session.agent = options.agent;
            if (options.model)
                session.model = options.model;
            if (options.provider)
                session.provider = options.provider;
        }
        this.saveData();
        return userConfig;
    }
    /**
     * 切换到指定会话
     */
    switchToSession(userId, sessionId) {
        const history = this.userSessionHistory.get(userId) || [];
        const sessionInfo = history.find(h => h.sessionId === sessionId);
        const currentSession = this.userSessions.get(userId);
        const opencodeConfig = getOpenCodeConfig();
        const newSession = {
            userId,
            sessionId,
            createdAt: sessionInfo?.createdAt || Date.now(),
            lastAccessed: Date.now(),
            title: sessionInfo?.title || `QQ_${userId}`,
            agent: currentSession?.agent || opencodeConfig.defaultAgent,
            model: currentSession?.model || opencodeConfig.defaultModel,
            provider: currentSession?.provider || 'alibaba-coding-plan-cn',
            messageCount: 0,
            isActive: true,
        };
        this.userSessions.set(userId, newSession);
        this.saveData();
        return newSession;
    }
    /**
     * 获取用户配置
     */
    getUserConfig(userId) {
        return this.userConfigs.get(userId);
    }
    /**
     * 获取用户会话历史
     */
    getUserSessionHistory(userId) {
        return this.userSessionHistory.get(userId) || [];
    }
    /**
     * 更新会话标题
     */
    updateSessionTitle(userId, sessionId, newTitle) {
        // 更新当前会话
        const session = this.userSessions.get(userId);
        if (session && session.sessionId === sessionId) {
            session.title = newTitle;
        }
        // 更新历史记录
        const history = this.userSessionHistory.get(userId);
        if (history) {
            const item = history.find(h => h.sessionId === sessionId);
            if (item) {
                item.title = newTitle;
            }
        }
        this.saveData();
        return true;
    }
    /**
     * 删除会话
     */
    deleteSession(userId, sessionId) {
        const history = this.userSessionHistory.get(userId);
        if (history) {
            const index = history.findIndex(h => h.sessionId === sessionId);
            if (index >= 0) {
                history.splice(index, 1);
                this.saveData();
                return true;
            }
        }
        return false;
    }
    /**
     * 保存数据到文件
     */
    saveData() {
        if (this.config.storageType !== 'file')
            return;
        const data = {
            userSessions: Array.from(this.userSessions.values()),
            userConfigs: Array.from(this.userConfigs.values()),
            userSessionHistory: Object.fromEntries(this.userSessionHistory),
            savedAt: Date.now(),
        };
        // 确保目录存在
        const dir = path.dirname(this.dataPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2), 'utf-8');
    }
    /**
     * 从文件加载数据
     */
    loadData() {
        if (this.config.storageType !== 'file')
            return;
        if (!fs.existsSync(this.dataPath)) {
            return;
        }
        try {
            const content = fs.readFileSync(this.dataPath, 'utf-8');
            const data = JSON.parse(content);
            // 加载用户会话
            if (Array.isArray(data.userSessions)) {
                for (const session of data.userSessions) {
                    this.userSessions.set(session.userId, session);
                }
            }
            // 加载用户配置
            if (Array.isArray(data.userConfigs)) {
                for (const config of data.userConfigs) {
                    this.userConfigs.set(config.userId, config);
                }
            }
            // 加载会话历史
            if (data.userSessionHistory) {
                for (const [userId, history] of Object.entries(data.userSessionHistory)) {
                    this.userSessionHistory.set(parseInt(userId), history);
                }
            }
        }
        catch (error) { }
    }
}
// 单例实例
let sessionManagerInstance = null;
export function getSessionManager() {
    if (!sessionManagerInstance) {
        sessionManagerInstance = new SessionManager();
    }
    return sessionManagerInstance;
}
//# sourceMappingURL=manager.js.map