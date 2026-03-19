/**
 * OpenCode QQ Plugin - Main Entry
 * 
 * 这个插件实现：
 * 1. 通过 WebSocket 连接 NapCat 接收 QQ 消息
 * 2. 将消息转发到 OpenCode AI 处理
 * 3. 通过自定义工具发送 QQ 消息回复
 * 4. 支持命令系统（/help, /new, /session 等）
 * 5. Web 界面（不依赖 OpenCode HTTP API）
 */

import type { Plugin, PluginInput } from '@opencode-ai/plugin';
import * as net from 'net';
import { getNapCatClient, NapCatClient } from './napcat/client';
import { getSessionManager, SessionManager } from './session/manager';
import { initConfig, getConfig, isUserWhitelisted, isGroupWhitelisted, getOpenCodeConfig, getBotConfig, getWhitelistConfig, getWebServerConfig, getSessionConfig, getInstanceLockConfig } from './config/loader';
import { getAgentModelCache } from './cache/agent-model';
import { getTaskScheduler } from './task/scheduler';

// QQ 消息工具
import { 
  qqSendMessageTool, 
  qqGetFriendsTool, 
  qqGetGroupHistoryTool, 
  qqSearchFriendTool, 
  qqSendFileTool, 
  qqGetLoginInfoTool, 
  qqSendPokeTool, 
  qqGetFileTool 
} from './tools';

// 控制工具 (参考 axeuh-control skill)
import {
  userSessionListTool,
  userSessionCreateTool,
  userSessionSwitchTool,
  userSessionDeleteTool,
  sessionTitleSetTool,
  setUserSessionCreateClient,
  setSessionTitleSetClient,
  taskListTool,
  taskCreateTool,
  taskDeleteTool,
  agentListTool,
  agentGetTool,
  agentSetTool,
  modelListTool,
  modelGetTool,
  modelSetTool,
  systemHealthTool,
  systemReloadTool,
} from './tools';

import { QQMessage } from './types';
import { createLogServer, interceptConsole, addLog } from './log-server';
import { createApiServer, setClient, SimulatedMessage } from './api-server';
import { createWebServer, setOpenCodeClient, setConfig as setWebConfig, broadcastToUser, broadcastOpenCodeEvent } from './web-server';
// 消息处理模块
import { extractFileInfo, extractPlainText, extractQuotedMessageId, parseMessageSegments, buildMessageContext, isBotMentioned, FileInfo } from './message/parser';
import { getFileHandler, FileHandler } from './message/file-handler';
import { processReplyMessage, formatReplyContent } from './message/reply-handler';

// 启动日志服务器并拦截 console
console.log('========================================');
console.log('[QQ Plugin] 正在启动日志服务器...');
console.log('========================================');
interceptConsole();
const logServer = createLogServer(4099);
const apiServer = createApiServer(4098);

// 实例锁相关变量
let instanceLockServer: net.Server | null = null;
let isPrimaryInstance = false;

/**
 * 尝试获取实例锁
 * 返回 true 表示当前实例是主实例，应连接 NapCat
 */
function tryAcquireInstanceLock(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      instanceLockServer = server;
      isPrimaryInstance = true;
      resolve(true);
    });
    
    server.listen(port, '127.0.0.1');
  });
}

// 命令前缀
const COMMAND_PREFIX = '/';

/**
 * OpenCode QQ Plugin
 */
export const QQPlugin: Plugin = async (ctx: PluginInput) => {
  const { project, client, directory, worktree, serverUrl } = ctx;
  
  console.log('========================================');
  console.log('[QQ Plugin] 插件正在初始化...');
  console.log(`[QQ Plugin] 工作目录: ${directory}`);
  console.log('========================================');
  
  // 初始化配置
  try {
    initConfig();
    console.log('[QQ Plugin] 配置加载成功');
  } catch (error: any) {
    console.error(`[QQ Plugin] 配置加载失败: ${error.message}`);
    return {};
  }
  
  // 尝试获取实例锁，只有主实例才启动 Web 和 NapCat
  const instanceLockConfig = getInstanceLockConfig();
  let isPrimary = true;
  
  if (instanceLockConfig.enabled) {
    isPrimary = await tryAcquireInstanceLock(instanceLockConfig.port);
  }
  
  // 获取组件实例
  const napcat = getNapCatClient();
  const sessionManager = getSessionManager();
  const botConfig = getBotConfig();
  const opencodeConfig = getOpenCodeConfig();
  const whitelistConfig = getWhitelistConfig();
  
  // 初始化智能体和模型缓存（使用 SDK）
  const agentModelCache = getAgentModelCache();
  agentModelCache.setClient(client);
  agentModelCache.initialize(opencodeConfig.supportedAgents, opencodeConfig.supportedModels)
    .catch(() => {});
  
  // 只有主实例才启动 Web 服务器和 NapCat
  if (isPrimary) {
    console.log('[QQ Plugin] 主实例已启动');
    
    // 根据配置决定是否启动 Web 服务器
    const webServerConfig = getWebServerConfig();
    if (webServerConfig.enabled) {
      console.log('[QQ Plugin] 正在启动 Web 服务器...');
      setWebConfig({
        whitelistUsers: whitelistConfig.qqUsers,
        dataPath: 'data/users.json',
      });
      // 设置 OpenCode 客户端到 Web 服务器
      setOpenCodeClient(client, async (simMsg: SimulatedMessage) => {
        const msg: QQMessage = {
          time: Date.now(),
          self_id: parseInt(botConfig.qqId),
          user_id: simMsg.user_id,
          group_id: simMsg.group_id,
          message_type: simMsg.message_type || 'private',
          sub_type: 'friend',
          message_id: Date.now(),
          message: [{ type: 'text', data: { text: simMsg.message } }],
          raw_message: simMsg.message,
          sender: {
            user_id: simMsg.user_id,
            nickname: simMsg.sender_name || 'SimUser',
            sex: 'unknown',
            age: 0,
          },
          post_type: 'message',
        };
        await handleQQMessage(msg);
      });
      
      const webServer = createWebServer(webServerConfig);
    } else {
      console.log('[QQ Plugin] Web 服务器已禁用');
    }
    
    // 设置 API 服务器的客户端引用
    setClient(client, async (simMsg: SimulatedMessage) => {
      // 模拟 QQ 消息处理
      const msg: QQMessage = {
        time: Date.now(),
        self_id: parseInt(botConfig.qqId),
        user_id: simMsg.user_id,
        group_id: simMsg.group_id,
        message_type: simMsg.message_type || 'private',
        sub_type: 'friend',
        message_id: Date.now(),
        message: [{ type: 'text', data: { text: simMsg.message } }],
        raw_message: simMsg.message,
        sender: {
          user_id: simMsg.user_id,
          nickname: simMsg.sender_name || 'SimUser',
          sex: 'unknown',
          age: 0,
        },
        post_type: 'message',
      };
      
      // 直接调用消息处理器
      await handleQQMessage(msg);
    });
    
    // 连接 NapCat（仅主实例）
    const connectNapCat = async () => {
      console.log('[QQ Plugin] 正在连接 NapCat...');
      try {
        await napcat.connect();
        console.log('[QQ Plugin] NapCat 连接成功');
      } catch (error: any) {
        console.error(`[QQ Plugin] NapCat 连接失败: ${error.message}`);
      }
    };
    
    // 启动连接（异步，不阻塞插件初始化）
    connectNapCat();
  } else {
    console.log('[QQ Plugin] 非主实例，跳过 Web 和 NapCat 启动');
  }
  
  // 处理 QQ 消息
  const handleQQMessage = async (msg: QQMessage) => {
    if (msg.message_type !== 'private' && msg.message_type !== 'group') {
      return;
    }
    
    const userId = msg.user_id;
    const groupId = msg.group_id;
    const rawMessage = msg.raw_message || '';
    
    if (!userId) return;
    
    // 白名单检查
    if (msg.message_type === 'private') {
      if (!isUserWhitelisted(userId)) {
        return;
      }
    } else if (msg.message_type === 'group') {
      if (!isGroupWhitelisted(groupId!) || !isUserWhitelisted(userId)) {
        return;
      }
      
      // 检查是否 @机器人（同时支持 OneBot 数组格式和 CQ 码格式）
      const botId = botConfig.qqId;
      if (!isBotMentioned(msg, botId)) {
        return;
      }
    }
    
    // ==================== 消息段解析 ====================
    let plainText = '';
    let commandText = '';  // 用于命令检测（不包含 @）
    let fileInfo: FileInfo[] = [];
    let replyContent: string | null = null;
    
    // 解析消息段（支持 OneBot 数组格式）
    if (msg.message && Array.isArray(msg.message)) {
      const parsed = parseMessageSegments(msg.message as any[]);
      plainText = parsed.text;
      commandText = parsed.textWithoutAt;  // 不包含 @ 的文本
      fileInfo = parsed.fileInfo;
      
      // 处理引用消息
      if (parsed.replyId) {
        const replyResult = await processReplyMessage(parsed.replyId, userId, groupId, directory);
        if (replyResult) {
          replyContent = formatReplyContent(replyResult);
        }
      }
    } else {
      // CQ 码格式
      plainText = extractPlainText(rawMessage);
      commandText = plainText;  // CQ 码格式已经移除了 @
      fileInfo = extractFileInfo(rawMessage);
      
      // 处理引用消息（CQ 码格式）
      const replyId = extractQuotedMessageId(msg);
      if (replyId) {
        const replyResult = await processReplyMessage(replyId, userId, groupId, directory);
        if (replyResult) {
          replyContent = formatReplyContent(replyResult);
        }
      }
    }
    
    const senderName = msg.sender?.nickname || `QQ用户_${userId}`;
    
    // 检查是否为命令（使用不包含 @ 的文本）
    const trimmedCommand = commandText.trim();
    if (trimmedCommand.startsWith(COMMAND_PREFIX)) {
      await handleCommand(msg.message_type, groupId, userId, trimmedCommand);
      return;
    }
    
    // ==================== 处理文件 ====================
    const fileHandler = getFileHandler({ downloadDir: `${directory}/data/downloads` });
    let fileMessages: string[] = [];
    
    if (fileInfo.length > 0) {
      fileMessages = await fileHandler.processFileMessage(fileInfo, userId, groupId);
    }
    
    // 获取或创建用户会话
    let session = sessionManager.getUserSession(userId);
    if (!session) {
      // 创建新会话
      const newSessionId = await createOpenCodeSession(client, userId);
      if (newSessionId) {
        session = sessionManager.createUserSession(userId, newSessionId, undefined, groupId);
      } else {
        await napcat.sendPrivateMessage(userId, '无法创建会话，请稍后重试');
        return;
      }
    }
    
    // 解析正确的 agent 和 model 格式
    // agent: 直接使用配置中的名称，如 "Sisyphus (Ultraworker)"
    // model: 格式 "provider/model"，如 "alibaba-coding-plan-cn/glm-5"
    const agentId = session.agent;
    let modelId = session.model;
    let providerId = session.provider;
    
    // 如果 model 包含 "/"，解析 provider 和 model
    if (modelId.includes('/')) {
      const parts = modelId.split('/');
      providerId = parts[0];
      modelId = parts[1];
    }
    
    // 构建消息上下文
    const messageWithContext = buildMessageContext({
      text: plainText,
      senderName,
      senderId: userId,
      messageType: msg.message_type,
      groupId,
      fileInfo,
      replyContent: replyContent || undefined,
    });
    
    // 添加文件下载信息
    const fullMessage = fileMessages.length > 0 
      ? `${messageWithContext}\n\n${fileMessages.join('\n')}`
      : messageWithContext;
    
    // 发送消息到 OpenCode
    try {
      const result = await client.session.prompt({
        path: { id: session.sessionId },
        body: {
          agent: agentId,
          model: {
            modelID: modelId,
            providerID: providerId,
          },
          parts: [{ type: 'text', text: fullMessage }],
        },
      });
    } catch (error: any) {}
  };
  
  // 处理命令
  const handleCommand = async (
    messageType: 'private' | 'group',
    groupId: number | undefined,
    userId: number,
    commandText: string
  ) => {
    const [command, ...args] = commandText.slice(1).split(/\s+/);
    const argString = args.join(' ');
    
    let reply = '';
    
    switch (command.toLowerCase()) {
      case 'help':
        reply = getHelpText();
        break;
        
      case 'new':
        const newSessionId = await createOpenCodeSession(client, userId, argString || undefined);
        if (newSessionId) {
          sessionManager.createUserSession(userId, newSessionId, argString || undefined, groupId);
          reply = argString 
            ? `已创建新会话\n标题：${argString}`
            : '已创建新会话';
        } else {
          reply = '创建会话失败，请稍后重试';
        }
        break;
        
      case 'session':
        reply = await handleSessionCommand(client, userId, argString);
        break;
        
      case 'agent':
        reply = handleAgentCommand(userId, argString);
        break;
        
      case 'model':
        reply = handleModelCommand(userId, argString);
        break;
        
      case 'stop':
        reply = await handleStopCommand(client, userId);
        break;
        
      case 'undo':
        reply = await handleUndoCommand(client, userId);
        break;
        
      case 'redo':
        reply = await handleRedoCommand(client, userId);
        break;
        
      case 'compact':
        reply = await handleCompactCommand(client, userId);
        break;
        
      case 'command':
        reply = await handleSlashCommand(client, userId, argString);
        break;
        
      case 'reload':
        reply = '热重载功能暂不可用，请手动重启 OpenCode';
        break;
        
      default:
        reply = `未知命令：${command}\n使用 /help 查看可用命令`;
    }
    
    // 发送回复
    if (messageType === 'private') {
      await napcat.sendPrivateMessage(userId, reply);
    } else if (groupId) {
      await napcat.sendGroupMessage(groupId, `[CQ:at,qq=${userId}] ${reply}`);
    }
  };
  
  // 注册消息处理器
  napcat.on('message', handleQQMessage);

  // 初始化任务调度器
  const taskScheduler = getTaskScheduler();
  taskScheduler.setExecutionCallback(async (task) => {
    // 获取用户会话
    const session = sessionManager.getUserSession(task.userId);
    if (!session) {
      return;
    }
    // 发送任务提示到 OpenCode
    try {
      await client.session.prompt({
        path: { id: task.sessionId },
        body: {
          agent: session.agent,
          model: {
            modelID: session.model.split('/')[1] || session.model,
            providerID: session.model.split('/')[0] || 'alibaba-coding-plan-cn',
          },
          parts: [{ type: 'text', text: task.prompt }],
        },
      });
    } catch (error: any) {}
  });
  taskScheduler.startAll();

  // 设置控制工具的 OpenCode 客户端引用
  setUserSessionCreateClient(client);
  setSessionTitleSetClient(client);

  // 返回插件钩子
  return {
    // =====================
    // QQ 消息工具 (参考 qq-message-napcat skill)
    // =====================
    tool: {
      // 消息相关
      qq_send_message: qqSendMessageTool,
      // 好友相关
      qq_get_friends: qqGetFriendsTool,
      qq_search_friend: qqSearchFriendTool,
      // 群聊相关
      qq_get_group_history: qqGetGroupHistoryTool,
      // 文件相关
      qq_send_file: qqSendFileTool,
      qq_get_file: qqGetFileTool,
      // 账号相关
      qq_get_login_info: qqGetLoginInfoTool,
      // 互动相关
      qq_send_poke: qqSendPokeTool,

      // =====================
      // 控制工具 (参考 axeuh-control skill)
      // =====================
      // 用户会话管理
      user_session_list: userSessionListTool,
      user_session_create: userSessionCreateTool,
      user_session_switch: userSessionSwitchTool,
      user_session_delete: userSessionDeleteTool,
      session_title_set: sessionTitleSetTool,
      // 任务管理
      task_list: taskListTool,
      task_create: taskCreateTool,
      task_delete: taskDeleteTool,
      // 智能体管理
      agent_list: agentListTool,
      agent_get: agentGetTool,
      agent_set: agentSetTool,
      // 模型管理
      model_list: modelListTool,
      model_get: modelGetTool,
      model_set: modelSetTool,
      // 系统管理
      system_health: systemHealthTool,
      system_reload: systemReloadTool,
    },
    
    // 事件钩子 - 监听 OpenCode 内部事件并广播给 Web 客户端
    event: async ({ event }) => {
      // 构造 SSE 事件格式
      const sseEvent = {
        directory: directory,
        payload: {
          type: event.type,
          properties: event.properties,
        },
      };
      
      // 广播给所有 Web SSE 客户端
      broadcastOpenCodeEvent(sseEvent);
    },
  };
};

/**
 * 格式化消息发送到 OpenCode
 */
function formatMessageForOpenCode(
  text: string,
  messageType: 'private' | 'group',
  groupId: number | undefined,
  userId: number,
  senderName: string
): string {
  const context = messageType === 'group' 
    ? `[群聊消息] 群号: ${groupId}, 发送者: ${senderName} (${userId})`
    : `[私聊消息] 发送者: ${senderName} (${userId})`;
  
  return `${context}\n\n${text}`;
}

/**
 * 创建 OpenCode 会话
 */
async function createOpenCodeSession(client: any, userId: number, customTitle?: string): Promise<string | null> {
  try {
    const body: any = {};
    if (customTitle) {
      body.title = customTitle;
    }
    
    const result = await client.session.create({ body });
    if (result.error) {
      return null;
    }
    return result.data?.id || null;
  } catch (error) {
    return null;
  }
}

// ==================== 新增命令处理函数 ====================

/**
 * 处理 /stop 命令 - 打断当前会话
 */
async function handleStopCommand(client: any, userId: number): Promise<string> {
  const sessionManager = getSessionManager();
  const session = sessionManager.getUserSession(userId);
  
  if (!session) {
    return '没有活动的会话';
  }
  
  try {
    const result = await client.session.abort({
      path: { id: session.sessionId }
    });
    
    if (result.error) {
      return `中止失败：${result.error}`;
    }
    
    return `已中止会话：${session.sessionId}`;
  } catch (error: any) {
    return `中止失败：${error.message}`;
  }
}

/**
 * 处理 /undo 命令 - 撤销上一条消息
 */
async function handleUndoCommand(client: any, userId: number): Promise<string> {
  const sessionManager = getSessionManager();
  const session = sessionManager.getUserSession(userId);
  
  if (!session) {
    return '没有活动的会话';
  }
  
  try {
    const result = await client.session.revert({
      path: { id: session.sessionId }
    });
    
    if (result.error) {
      return `撤销失败：${result.error}`;
    }
    
    return '已撤销最后一条消息';
  } catch (error: any) {
    return `撤销失败：${error.message}`;
  }
}

/**
 * 处理 /redo 命令 - 恢复所有撤销的消息
 */
async function handleRedoCommand(client: any, userId: number): Promise<string> {
  const sessionManager = getSessionManager();
  const session = sessionManager.getUserSession(userId);
  
  if (!session) {
    return '没有活动的会话';
  }
  
  try {
    const result = await client.session.unrevert({
      path: { id: session.sessionId }
    });
    
    if (result.error) {
      return `恢复失败：${result.error}`;
    }
    
    return '已恢复所有撤销的消息';
  } catch (error: any) {
    return `恢复失败：${error.message}`;
  }
}

/**
 * 处理 /compact 命令 - 压缩当前会话上下文
 */
async function handleCompactCommand(client: any, userId: number): Promise<string> {
  const sessionManager = getSessionManager();
  const session = sessionManager.getUserSession(userId);
  
  if (!session) {
    return '没有活动的会话';
  }
  
  try {
    const modelId = session.model.includes('/') ? session.model.split('/')[1] : session.model;
    const providerId = session.model.includes('/') ? session.model.split('/')[0] : session.provider;
    
    const result = await client.session.summarize({
      path: { id: session.sessionId },
      body: {
        modelID: modelId,
        providerID: providerId,
      }
    });
    
    if (result.error) {
      return `压缩失败：${result.error}`;
    }
    
    return '会话上下文已压缩';
  } catch (error: any) {
    return `压缩失败：${error.message}`;
  }
}

/**
 * 处理 /command 命令 - 列出/执行斜杠命令
 */
async function handleSlashCommand(client: any, userId: number, args: string): Promise<string> {
  const sessionManager = getSessionManager();
  
  // 显示帮助
  if (args.toLowerCase() === 'help') {
    return `斜杠命令帮助

可用格式:
  /command - 列出所有可用的斜杠命令
  /command [序号] - 执行对应序号的命令

说明:
  序号来自 /command 显示的命令列表`;
  }
  
  try {
    // 获取命令列表
    const listResult = await client.command.list();
    
    if (listResult.error || !listResult.data) {
      return `获取命令列表失败：${listResult.error}`;
    }
    
    const commands = Array.isArray(listResult.data) ? listResult.data : [];
    
    if (commands.length === 0) {
      return '当前没有可用的斜杠命令';
    }
    
    // 无参数时列出命令
    if (!args) {
      const lines = commands.map((cmd: any, i: number) => {
        const name = cmd.name || cmd.command || cmd;
        return `${i + 1}. ${name}`;
      });
      return `可用的斜杠命令:\n${lines.join('\n')}\n\n使用方法：/command [序号]`;
    }
    
    // 按序号执行命令
    const index = parseInt(args.split(/\s+/)[0]);
    if (isNaN(index) || index < 1 || index > commands.length) {
      return `无效的序号：${args}（有效范围：1-${commands.length}）`;
    }
    
    const targetCmd = commands[index - 1];
    const commandName = targetCmd.name || targetCmd.command || targetCmd;
    const commandArgs = args.split(/\s+/).slice(1).join(' ');
    
    // 获取用户会话
    const session = sessionManager.getUserSession(userId);
    if (!session) {
      return '没有活动的会话，请先使用 /new 创建会话';
    }
    
    // 执行命令
    const execResult = await client.command.execute({
      path: { id: session.sessionId },
      body: {
        command: commandName.startsWith('/') ? commandName : `/${commandName}`,
        arguments: commandArgs || undefined,
        agent: session.agent,
        model: {
          modelID: session.model.includes('/') ? session.model.split('/')[1] : session.model,
          providerID: session.model.includes('/') ? session.model.split('/')[0] : session.provider,
        },
      }
    });
    
    if (execResult.error) {
      return `执行命令失败：${execResult.error}`;
    }
    
    // 提取响应文本
    const parts = execResult.data?.parts || [];
    let responseText = '';
    for (const part of parts) {
      if (part.type === 'text' && part.text) {
        responseText = part.text.substring(0, 500);
        if (part.text.length > 500) responseText += '...';
        break;
      }
    }
    
    let reply = `命令已执行：${commandName}`;
    if (commandArgs) reply += `\n参数：${commandArgs}`;
    if (responseText) reply += `\n\n响应：${responseText}`;
    
    return reply;
  } catch (error: any) {
    return `执行失败：${error.message}`;
  }
}

/**
 * 获取帮助文本
 */
function getHelpText(): string {
  return `这里是 Axeuh_home~

可用命令:
  /help      - 显示帮助
  /new [标题] - 新建对话（可指定标题）
  /agent     - 切换智能体
  /model     - 切换模型
  /session   - 管理会话（列表/切换/重命名）
  /command   - 列出/执行斜杠命令
  /reload    - 重启机器人
  /stop      - 打断当前会话
  /undo      - 撤销上一条消息
  /redo      - 恢复所有撤销的消息
  /compact   - 压缩当前会话上下文

当前配置:
  智能体：Sisyphus (Ultraworker)
  模型：alibaba-coding-plan-cn/glm-5

使用说明:
  发送任意消息给 Axeuh_home
  群聊需@机器人
  发送 /命令 help 查看详细用法
  例如：/session help, /command help

会话标题:
  /new 我的会话     - 创建标题为"我的会话"的新会话
  /session title 新标题 - 修改当前会话标题`;
}

/**
 * 处理 session 命令
 */
async function handleSessionCommand(
  client: any,
  userId: number,
  args: string
): Promise<string> {
  const sessionManager = getSessionManager();
  const sessionConfig = sessionManager.getConfig();
  
  if (!args) {
    // 显示会话列表
    if (sessionConfig.isolateByUser) {
      // 用户隔离模式：只显示该用户的会话
      const history = sessionManager.getUserSessionHistory(userId);
      if (history.length === 0) {
        return '暂无会话历史，使用 /new 创建新会话';
      }
      
      const currentSession = sessionManager.getUserSession(userId);
      const lines = history.map((h, i) => {
        const marker = currentSession?.sessionId === h.sessionId ? ' *' : '';
        return `${i + 1}. ${h.title}${marker}`;
      });
      
      return `当前会话列表:\n${lines.join('\n')}\n\n切换会话：/session [序号]\n修改标题：/session title <新标题>`;
    } else {
      // 全局模式：显示所有 OpenCode 会话
      try {
        const result = await client.session.list();
        if (result.error || !result.data) {
          return '获取会话列表失败';
        }
        
        const sessions = result.data;
        if (sessions.length === 0) {
          return '暂无会话，使用 /new 创建新会话';
        }
        
        const currentSession = sessionManager.getUserSession(userId);
        const lines = sessions.slice(0, 20).map((s: any, i: number) => {
          const marker = currentSession?.sessionId === s.id ? ' *' : '';
          return `${i + 1}. ${s.title || s.slug}${marker}`;
        });
        
        return `所有会话列表:\n${lines.join('\n')}\n\n切换会话：/session [序号]\n修改标题：/session title <新标题>`;
      } catch (error: any) {
        return `获取会话列表失败: ${error.message}`;
      }
    }
  }
  
  // 处理 title 子命令
  if (args.toLowerCase().startsWith('title ')) {
    const newTitle = args.slice(6).trim();
    if (!newTitle) {
      return '请提供新标题\n用法：/session title <新标题>';
    }
    
    const currentSession = sessionManager.getUserSession(userId);
    if (!currentSession) {
      return '没有活动的会话，请先使用 /new 创建会话';
    }
    
    try {
      // 更新 OpenCode 会话标题
      const result = await client.session.update({
        path: { id: currentSession.sessionId },
        body: { title: newTitle },
      });
      
      if (result.error) {
        return `修改标题失败：${result.error}`;
      }
      
      // 更新本地会话标题
      sessionManager.updateSessionTitle(userId, currentSession.sessionId, newTitle);
      
      return `会话标题已更新：${newTitle}`;
    } catch (error: any) {
      return `修改标题失败：${error.message}`;
    }
  }
  
  // 显示帮助
  if (args.toLowerCase() === 'help') {
    return `会话管理命令

用法:
  /session          - 显示会话列表
  /session [序号]   - 切换到指定会话
  /session title <标题> - 修改当前会话标题

示例:
  /session          # 查看会话列表
  /session 2        # 切换到第2个会话
  /session title 我的新会话  # 修改标题`;
  }
  
  // 切换会话
  const index = parseInt(args);
  if (!isNaN(index)) {
    if (sessionConfig.isolateByUser) {
      // 用户隔离模式
      const history = sessionManager.getUserSessionHistory(userId);
      if (index >= 1 && index <= history.length) {
        const targetSession = history[index - 1];
        sessionManager.switchToSession(userId, targetSession.sessionId);
        return `已切换到会话：${targetSession.title}`;
      }
    } else {
      // 全局模式：从 OpenCode 获取会话列表
      try {
        const result = await client.session.list();
        if (result.data && index >= 1 && index <= result.data.length) {
          const targetSession = result.data[index - 1];
          sessionManager.switchToSession(userId, targetSession.id);
          return `已切换到会话：${targetSession.title || targetSession.slug}`;
        }
      } catch (error: any) {
        return `切换会话失败: ${error.message}`;
      }
    }
  }
  
  return '无效的会话序号';
}

/**
 * 处理 agent 命令
 */
function handleAgentCommand(userId: number, args: string): string {
  const opencodeConfig = getOpenCodeConfig();
  const sessionManager = getSessionManager();
  const cache = getAgentModelCache();
  
  // 从缓存获取智能体列表
  const agentNames = cache.isInitialized() ? cache.getAgentNames() : opencodeConfig.supportedAgents;
  
  if (!args) {
    // 显示可用智能体列表
    const currentSession = sessionManager.getUserSession(userId);
    const currentAgent = currentSession?.agent || opencodeConfig.defaultAgent;
    
    const lines = agentNames.map((a, i) => {
      const marker = a === currentAgent ? ' *' : '';
      return `${i + 1}. ${a}${marker}`;
    });
    
    return `当前智能体：${currentAgent}\n\n可用的智能体:\n${lines.join('\n')}\n\n使用方法：/agent [序号]`;
  }
  
  // 切换智能体
  const index = parseInt(args);
  if (!isNaN(index) && index >= 1 && index <= agentNames.length) {
    const newAgent = agentNames[index - 1];
    sessionManager.updateUserConfig(userId, { agent: newAgent });
    return `智能体已切换到：${newAgent}`;
  }
  
  return '无效的智能体序号';
}

/**
 * 处理 model 命令
 */
function handleModelCommand(userId: number, args: string): string {
  const opencodeConfig = getOpenCodeConfig();
  const sessionManager = getSessionManager();
  const cache = getAgentModelCache();
  
  // 从缓存获取模型列表
  const modelIds = cache.isInitialized() ? cache.getModelIds() : opencodeConfig.supportedModels;
  
  if (!args) {
    // 显示可用模型列表
    const currentSession = sessionManager.getUserSession(userId);
    const currentModel = currentSession?.model || opencodeConfig.defaultModel;
    
    const lines = modelIds.map((m, i) => {
      const marker = m === currentModel ? ' *' : '';
      return `${i + 1}. ${m}${marker}`;
    });
    
    return `当前模型：${currentModel}\n\n可用的模型:\n${lines.join('\n')}\n\n使用方法：/model [序号]`;
  }
  
  // 切换模型
  const index = parseInt(args);
  if (!isNaN(index) && index >= 1 && index <= modelIds.length) {
    const newModel = modelIds[index - 1];
    // 存储完整格式 "provider/model"
    sessionManager.updateUserConfig(userId, { model: newModel });
    return `模型已切换到：${newModel}`;
  }
  
  return '无效的模型序号';
}

// 默认导出
export default QQPlugin;