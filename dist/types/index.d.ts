/**
 * OpenCode QQ Plugin - Type Definitions
 */
export interface QQPluginConfig {
    bot: BotConfig;
    napcat: NapCatConfig;
    opencode: OpenCodeConfig;
    whitelist: WhitelistConfig;
    session: SessionConfig;
    webServer: WebServerConfig;
    features: FeaturesConfig;
    logging: LoggingConfig;
    fileHandling: FileHandlingConfig;
    instanceLock?: InstanceLockConfig;
}
export interface InstanceLockConfig {
    enabled: boolean;
    port: number;
}
export interface BotConfig {
    name: string;
    qqId: string;
    adminQq: string;
}
export interface NapCatConfig {
    websocket: WebSocketConfig;
    httpApi: HttpApiConfig;
}
export interface WebSocketConfig {
    url: string;
    accessToken: string;
    heartbeatInterval: number;
    reconnectInterval: number;
}
export interface HttpApiConfig {
    baseUrl: string;
    accessToken: string;
    timeout: number;
    enabled: boolean;
}
export interface OpenCodeConfig {
    host: string;
    port: number;
    directory: string;
    defaultAgent: string;
    defaultModel: string;
    supportedAgents: string[];
    supportedModels: string[];
}
export interface WhitelistConfig {
    qqUsers: number[];
    groups: number[];
}
export interface SessionConfig {
    storageType: 'memory' | 'file';
    filePath: string;
    maxSessionsPerUser: number;
    isolateByUser: boolean;
}
export interface WebServerConfig {
    enabled: boolean;
    port: number;
    ssl?: SSLConfig;
}
export interface SSLConfig {
    enabled: boolean;
    keyPath: string;
    certPath: string;
    caPath?: string;
}
export interface FeaturesConfig {
    whitelistFilter: boolean;
    pokeReply: boolean;
    mentionBot: boolean;
}
export interface LoggingConfig {
    level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
    file: string;
}
export interface FileHandlingConfig {
    downloadDir: string;
    autoDownload: boolean;
    maxFileSize: number;
    napcatTempDir: string;
}
export interface UserSession {
    userId: number;
    sessionId: string;
    createdAt: number;
    lastAccessed: number;
    title: string;
    agent: string;
    model: string;
    provider: string;
    groupId?: number;
    messageCount: number;
    isActive: boolean;
}
export interface UserConfig {
    userId: number;
    agent: string;
    model: string;
    provider: string;
    createdAt: number;
}
export interface QQMessage {
    post_type: 'message' | 'notice' | 'request' | 'meta_event';
    message_type?: 'private' | 'group';
    sub_type?: string;
    user_id?: number;
    group_id?: number;
    message?: MessageSegment[] | string;
    raw_message?: string;
    sender?: QQSender;
    time?: number;
    self_id?: number;
    message_id?: number;
    real_id?: string;
    raw?: any;
}
export interface MessageSegment {
    type: string;
    data: Record<string, any>;
}
export interface TextSegment extends MessageSegment {
    type: 'text';
    data: {
        text: string;
    };
}
export interface AtSegment extends MessageSegment {
    type: 'at';
    data: {
        qq: string;
        name?: string;
    };
}
export interface ImageSegment extends MessageSegment {
    type: 'image';
    data: {
        file: string;
        url?: string;
        file_id?: string;
    };
}
export interface FileSegment extends MessageSegment {
    type: 'file';
    data: {
        file: string;
        file_id?: string;
        file_size?: string;
    };
}
export interface ReplySegment extends MessageSegment {
    type: 'reply';
    data: {
        id: string;
    };
}
export interface ForwardSegment extends MessageSegment {
    type: 'forward';
    data: {
        id: string;
    };
}
export interface FaceSegment extends MessageSegment {
    type: 'face';
    data: {
        id: string;
    };
}
export interface QQSender {
    user_id: number;
    nickname: string;
    card?: string;
    sex?: 'male' | 'female' | 'unknown';
    age?: number;
    area?: string;
    level?: string;
    role?: 'owner' | 'admin' | 'member';
}
export interface OneBotApiRequest {
    action: string;
    params: Record<string, any>;
    echo: string | number;
}
export interface OneBotApiResponse {
    status: 'ok' | 'failed';
    retcode: number;
    data?: any;
    echo?: string | number;
    message?: string;
    wording?: string;
}
export interface ToolContext {
    agent: string;
    sessionID: string;
    messageID: string;
    directory: string;
    worktree: string;
}
export interface PluginContext {
    project: {
        id: string;
        name: string;
        path: string;
    };
    directory: string;
    worktree: string;
    client: any;
    $: any;
}
//# sourceMappingURL=index.d.ts.map