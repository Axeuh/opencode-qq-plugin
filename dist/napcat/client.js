/**
 * NapCat WebSocket 客户端
 * 连接到 NapCat WebSocket 服务器，接收 QQ 消息
 */
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { getNapCatConfig, getBotConfig } from '../config/loader';
export class NapCatClient extends EventEmitter {
    constructor() {
        super();
        this.ws = null;
        this.config = getNapCatConfig();
        this.botConfig = getBotConfig();
        this.echoCounter = 1;
        this.pendingRequests = new Map();
        this.reconnectTimer = null;
        this.isConnected = false;
    }
    /**
     * 连接到 NapCat WebSocket 服务器
     */
    async connect() {
        return new Promise((resolve, reject) => {
            const wsUrl = this.config.websocket.url;
            const accessToken = this.config.websocket.accessToken;
            // 构建连接 URL（包含 access_token）
            const url = new URL(wsUrl);
            if (accessToken) {
                url.searchParams.set('access_token', accessToken);
            }
            this.ws = new WebSocket(url.toString(), {
                headers: accessToken ? {
                    'Authorization': `Bearer ${accessToken}`
                } : undefined
            });
            this.ws.on('open', () => {
                this.isConnected = true;
                this.emit('connected');
                resolve();
            });
            this.ws.on('message', (data) => {
                this.handleMessage(data);
            });
            this.ws.on('close', () => {
                this.isConnected = false;
                this.emit('disconnected');
                this.scheduleReconnect();
            });
            this.ws.on('error', (error) => {
                this.emit('error', error);
                if (!this.isConnected) {
                    reject(error);
                }
            });
        });
    }
    /**
     * 断开连接
     */
    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }
    /**
     * 处理收到的消息
     */
    handleMessage(data) {
        try {
            const msg = JSON.parse(data.toString());
            // 检查是否为 API 响应
            if (msg.echo !== undefined) {
                this.handleApiResponse(msg);
                return;
            }
            // 处理事件消息
            if (msg.post_type) {
                const qqMessage = msg;
                // 只处理消息类型
                if (qqMessage.post_type === 'message') {
                    this.emit('message', qqMessage);
                }
            }
        }
        catch (error) { }
    }
    /**
     * 处理 API 响应
     */
    handleApiResponse(response) {
        const echo = response.echo;
        if (echo === undefined)
            return;
        const pending = this.pendingRequests.get(echo);
        if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(echo);
            if (response.status === 'ok') {
                pending.resolve(response.data);
            }
            else {
                pending.reject(new Error(response.message || response.wording || 'API call failed'));
            }
        }
    }
    /**
     * 发送 API 请求
     */
    async sendApi(action, params = {}) {
        return new Promise((resolve, reject) => {
            if (!this.ws || !this.isConnected) {
                reject(new Error('WebSocket not connected'));
                return;
            }
            const echo = this.echoCounter++;
            const request = {
                action,
                params,
                echo
            };
            // 设置超时
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(echo);
                reject(new Error(`API call timeout: ${action}`));
            }, this.config.httpApi.timeout * 1000);
            this.pendingRequests.set(echo, { resolve, reject, timeout });
            this.ws.send(JSON.stringify(request), (error) => {
                if (error) {
                    clearTimeout(timeout);
                    this.pendingRequests.delete(echo);
                    reject(error);
                }
            });
        });
    }
    /**
     * 发送私聊消息
     */
    async sendPrivateMessage(userId, message) {
        return this.sendApi('send_private_msg', {
            user_id: userId,
            message
        });
    }
    /**
     * 发送群聊消息
     */
    async sendGroupMessage(groupId, message) {
        return this.sendApi('send_group_msg', {
            group_id: groupId,
            message
        });
    }
    /**
     * 获取好友列表
     */
    async getFriendList() {
        return this.sendApi('get_friend_list');
    }
    /**
     * 获取群列表
     */
    async getGroupList() {
        return this.sendApi('get_group_list');
    }
    /**
     * 获取群历史消息
     */
    async getGroupMsgHistory(groupId, count = 20) {
        return this.sendApi('get_group_msg_history', {
            group_id: groupId,
            count
        });
    }
    /**
     * 获取登录账号信息
     */
    async getLoginInfo() {
        return this.sendApi('get_login_info');
    }
    /**
     * 搜索好友（客户端过滤）
     */
    async searchFriend(name, exactMatch = false) {
        const friends = await this.getFriendList();
        const searchName = name.toLowerCase();
        return friends.filter(f => {
            const nickname = (f.nickname || '').toLowerCase();
            const remark = (f.remark || '').toLowerCase();
            if (exactMatch) {
                return nickname === searchName || remark === searchName;
            }
            return nickname.includes(searchName) || remark.includes(searchName);
        });
    }
    /**
     * 发送私聊文件
     */
    async sendPrivateFile(userId, file, name) {
        return this.sendApi('upload_private_file', {
            user_id: userId,
            file,
            name: name || 'file'
        });
    }
    /**
     * 发送群聊文件
     */
    async sendGroupFile(groupId, file, name) {
        return this.sendApi('upload_group_file', {
            group_id: groupId,
            file,
            name: name || 'file'
        });
    }
    /**
     * 发送戳一戳
     */
    async sendPoke(userId, groupId) {
        if (groupId) {
            return this.sendApi('group_poke', {
                user_id: userId,
                group_id: groupId
            });
        }
        return this.sendApi('friend_poke', {
            user_id: userId
        });
    }
    /**
     * 获取文件信息
     */
    async getFile(fileId, file) {
        const params = {};
        if (fileId)
            params.file_id = fileId;
        if (file)
            params.file = file;
        return this.sendApi('get_file', params);
    }
    /**
     * 获取消息内容（用于获取引用消息）
     */
    async getMsg(messageId) {
        return this.sendApi('get_msg', { message_id: messageId });
    }
    /**
     * 获取合并转发消息内容
     */
    async getForwardMsg(messageId) {
        return this.sendApi('get_forward_msg', { message_id: messageId });
    }
    /**
     * 计划重连
     */
    scheduleReconnect() {
        if (this.reconnectTimer)
            return;
        const delay = this.config.websocket.reconnectInterval;
        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            try {
                await this.connect();
            }
            catch (error) {
                this.scheduleReconnect();
            }
        }, delay);
    }
    /**
     * 检查是否连接
     */
    isActive() {
        return this.isConnected && this.ws !== null;
    }
}
// 单例实例
let napCatClientInstance = null;
export function getNapCatClient() {
    if (!napCatClientInstance) {
        napCatClientInstance = new NapCatClient();
    }
    return napCatClientInstance;
}
//# sourceMappingURL=client.js.map