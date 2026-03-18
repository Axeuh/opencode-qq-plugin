/**
 * NapCat WebSocket 客户端
 * 连接到 NapCat WebSocket 服务器，接收 QQ 消息
 */
import { EventEmitter } from 'events';
import { QQMessage } from '../types';
export interface NapCatClientEvents {
    connected: () => void;
    disconnected: () => void;
    message: (msg: QQMessage) => void;
    error: (error: Error) => void;
}
export declare class NapCatClient extends EventEmitter {
    private ws;
    private config;
    private botConfig;
    private echoCounter;
    private pendingRequests;
    private reconnectTimer;
    private isConnected;
    constructor();
    /**
     * 连接到 NapCat WebSocket 服务器
     */
    connect(): Promise<void>;
    /**
     * 断开连接
     */
    disconnect(): void;
    /**
     * 处理收到的消息
     */
    private handleMessage;
    /**
     * 处理 API 响应
     */
    private handleApiResponse;
    /**
     * 发送 API 请求
     */
    sendApi<T = any>(action: string, params?: Record<string, any>): Promise<T>;
    /**
     * 发送私聊消息
     */
    sendPrivateMessage(userId: number, message: string): Promise<any>;
    /**
     * 发送群聊消息
     */
    sendGroupMessage(groupId: number, message: string): Promise<any>;
    /**
     * 获取好友列表
     */
    getFriendList(): Promise<any[]>;
    /**
     * 获取群列表
     */
    getGroupList(): Promise<any[]>;
    /**
     * 获取群历史消息
     */
    getGroupMsgHistory(groupId: number, count?: number): Promise<any>;
    /**
     * 获取登录账号信息
     */
    getLoginInfo(): Promise<{
        user_id: number;
        nickname: string;
    }>;
    /**
     * 搜索好友（客户端过滤）
     */
    searchFriend(name: string, exactMatch?: boolean): Promise<any[]>;
    /**
     * 发送私聊文件
     */
    sendPrivateFile(userId: number, file: string, name?: string): Promise<any>;
    /**
     * 发送群聊文件
     */
    sendGroupFile(groupId: number, file: string, name?: string): Promise<any>;
    /**
     * 发送戳一戳
     */
    sendPoke(userId: number, groupId?: number): Promise<any>;
    /**
     * 获取文件信息
     */
    getFile(fileId?: string, file?: string): Promise<any>;
    /**
     * 获取消息内容（用于获取引用消息）
     */
    getMsg(messageId: string): Promise<any>;
    /**
     * 获取合并转发消息内容
     */
    getForwardMsg(messageId: string): Promise<any>;
    /**
     * 计划重连
     */
    private scheduleReconnect;
    /**
     * 检查是否连接
     */
    isActive(): boolean;
}
export declare function getNapCatClient(): NapCatClient;
//# sourceMappingURL=client.d.ts.map