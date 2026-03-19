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

import express, { Request, Response, NextFunction } from 'express';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import * as fs from 'fs';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import multer from 'multer';
import { getSessionManager } from './session/manager';
import { getAgentModelCache } from './cache/agent-model';
import { WebServerConfig } from './types';
import { getNapCatClient } from './napcat/client';

// =====================
// 全局事件广播系统
// =====================

type EventCallback = (event: any) => void;

const eventListeners: Set<EventCallback> = new Set();

/**
 * 订阅 OpenCode 事件
 */
export function subscribeToEvents(callback: EventCallback): () => void {
  eventListeners.add(callback);
  return () => eventListeners.delete(callback);
}

/**
 * 广播 OpenCode 事件给所有监听器
 */
export function broadcastOpenCodeEvent(event: any): void {
  for (const callback of eventListeners) {
    try {
      callback(event);
    } catch (e) {
      // 忽略错误
    }
  }
}

// Types
interface UserSession {
  userId: number;
  token: string;
  createdAt: number;
  expiresAt: number;
}

// UserData 只存储认证信息，会话由 SessionManager 统一管理
interface UserData {
  qqId: number;
  passwordHash: string;
  agent?: string;
  model?: string;
  provider?: string;
}

interface SSEClient {
  userId: number;
  res: express.Response;
}

// OpenCode client reference
let opencodeClient: any = null;
let messageHandler: ((msg: any) => Promise<void>) | null = null;

// Data storage
const webSessions: Map<string, UserSession> = new Map();
const userDataStore: Map<number, UserData> = new Map();
const sseClients: Map<number, SSEClient[]> = new Map();

// Config reference
let whitelistUsers: number[] = [];
let dataPath = 'data/users.json';

/**
 * Initialize user data from file
 */
function loadUserData(): void {
  try {
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      for (const [qqId, userData] of Object.entries(data)) {
        userDataStore.set(parseInt(qqId), userData as UserData);
      }
    }
  } catch (error: any) {}
}

/**
 * Save user data to file
 */
function saveUserData(): void {
  try {
    const dataDir = path.dirname(dataPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const data: Record<string, UserData> = {};
    userDataStore.forEach((userData, qqId) => {
      data[qqId.toString()] = userData;
    });
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  } catch (error: any) {}
}

/**
 * Set configuration
 */
export function setConfig(config: {
  whitelistUsers: number[];
  dataPath?: string;
}): void {
  whitelistUsers = config.whitelistUsers;
  if (config.dataPath) {
    dataPath = config.dataPath;
  }
  loadUserData();
}

/**
 * Set OpenCode client
 */
export function setOpenCodeClient(client: any, handler: (msg: any) => Promise<void>): void {
  opencodeClient = client;
  messageHandler = handler;
}

/**
 * Generate session token
 */
function generateToken(): string {
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
}

/**
 * Create web session
 */
function createWebSession(userId: number): string {
  const token = generateToken();
  const now = Date.now();
  webSessions.set(token, {
    userId,
    token,
    createdAt: now,
    expiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  return token;
}

/**
 * Validate web session
 */
function validateSession(token: string): number | null {
  const session = webSessions.get(token);
  if (!session) return null;
  
  if (Date.now() > session.expiresAt) {
    webSessions.delete(token);
    return null;
  }
  
  return session.userId;
}

/**
 * Get or create user data (只存储认证信息)
 */
function getOrCreateUserData(qqId: number): UserData {
  if (!userDataStore.has(qqId)) {
    userDataStore.set(qqId, {
      qqId,
      passwordHash: '',
    });
  }
  return userDataStore.get(qqId)!;
}

/**
 * Auth middleware
 */
function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  let token = '';
  
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.cookies?.session_token) {
    token = req.cookies.session_token;
  } else if (req.query.token) {
    token = req.query.token as string;
  }
  
  const userId = validateSession(token);
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  
  (req as any).userId = userId;
  next();
}

/**
 * Broadcast SSE event to user
 */
export function broadcastToUser(userId: number, event: string, data: any): void {
  const clients = sseClients.get(userId) || [];
  for (const client of clients) {
    try {
      client.res.write(`event: ${event}\n`);
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      // Client disconnected
    }
  }
}

/**
 * Create Web Server
 */
export function createWebServer(config: WebServerConfig): http.Server | https.Server {
  const { port, ssl } = config;
  const app = express();
  
  // Middleware
  app.use(cors({
    origin: '*',
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Cookie parser (simple implementation)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const cookieHeader = req.headers.cookie || '';
    (req as any).cookies = {};
    cookieHeader.split(';').forEach((cookie: string) => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        (req as any).cookies[name] = value;
      }
    });
    next();
  });
  
  // =====================
  // Static Files
  // =====================
  const publicDir = path.join(__dirname, '..', 'public');
  
  // Serve index.html
  app.get('/', (req: Request, res: Response) => {
    const indexPath = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('index.html not found. Please copy from Python project web/index.html');
    }
  });
  
  // Serve static files
  app.use(express.static(publicDir));
  
  // =====================
  // Health Check
  // =====================
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ success: true, status: 'healthy', service: 'QQ Bot Web Server' });
  });
  
  // =====================
  // Bot Info (from NapCat)
  // =====================
  app.get('/api/bot/info', async (req: Request, res: Response) => {
    try {
      const napcat = getNapCatClient();
      const loginInfo = await napcat.getLoginInfo();
      
      res.json({
        success: true,
        qqId: loginInfo.user_id,
        nickname: loginInfo.nickname,
        avatarUrl: `https://q.qlogo.cn/headimg_dl?dst_uin=${loginInfo.user_id}&spec=100`,
      });
    } catch (error: any) {
      res.json({
        success: false,
        error: error.message,
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bot',
      });
    }
  });
  
  // =====================
  // File Upload
  // =====================
  
  // Multer 配置
  const uploadDir = path.join(process.cwd(), 'data', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const userId = req.body.user_id || 'anonymous';
      const userDir = path.join(uploadDir, String(userId));
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
      cb(null, userDir);
    },
    filename: (req, file, cb) => {
      // 保留原始文件名，处理中文文件名
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const safeName = originalName.replace(/[<>:"/\\|?*]/g, '_');
      cb(null, safeName);
    }
  });
  
  const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB 限制
  });
  
  // 文件上传端点
  app.post('/api/upload', upload.single('file'), (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.json({ success: false, error: '没有接收到文件' });
      }
      
      const userId = req.body.user_id || 'anonymous';
      const filePath = req.file.path;
      const absolutePath = path.resolve(filePath);
      const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      
      res.json({
        success: true,
        file_name: originalName,
        file_path: filePath,
        absolute_path: absolutePath,
        size: req.file.size,
        user_id: userId
      });
    } catch (error: any) {
      res.json({ success: false, error: error.message });
    }
  });
  
  // =====================
  // Authentication APIs
  // =====================
  
  // Login
  app.post('/api/login', async (req: Request, res: Response) => {
    try {
      const { qq_id, password } = req.body;
      
      if (!qq_id) {
        return res.json({ success: false, error: 'QQ号不能为空' });
      }
      
      const qqId = parseInt(qq_id);
      if (isNaN(qqId)) {
        return res.json({ success: false, error: 'QQ号必须是数字' });
      }
      
      // Check whitelist
      if (whitelistUsers.length > 0 && !whitelistUsers.includes(qqId)) {
        return res.json({ success: false, error: '您不在白名单中，无法登录' });
      }
      
      const userData = getOrCreateUserData(qqId);
      
      // Check if user has set password
      if (!userData.passwordHash) {
        return res.json({ success: false, need_set_password: true, error: '请先设置密码' });
      }
      
      // Verify password
      if (!password) {
        return res.json({ success: false, need_password: true, error: '请输入密码' });
      }
      
      const valid = await bcrypt.compare(password, userData.passwordHash);
      if (!valid) {
        return res.json({ success: false, need_password: true, error: '密码错误' });
      }
      
      // Create session
      const token = createWebSession(qqId);
      
      res.json({
        success: true,
        qq_id: qqId,
        token,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: '服务器错误' });
    }
  });
  
  // Set password (first time)
  app.post('/api/password/set', async (req: Request, res: Response) => {
    try {
      const { qq_id, password } = req.body;
      
      if (!qq_id || !password) {
        return res.json({ success: false, error: 'QQ号和密码不能为空' });
      }
      
      if (password.length < 6) {
        return res.json({ success: false, error: '密码长度至少6位' });
      }
      
      const qqId = parseInt(qq_id);
      
      // Check whitelist
      if (whitelistUsers.length > 0 && !whitelistUsers.includes(qqId)) {
        return res.json({ success: false, error: '您不在白名单中' });
      }
      
      const userData = getOrCreateUserData(qqId);
      
      if (userData.passwordHash) {
        return res.json({ success: false, error: '您已设置密码，请使用修改密码功能' });
      }
      
      // Hash password
      userData.passwordHash = await bcrypt.hash(password, 10);
      saveUserData();
      
      // Create session
      const token = createWebSession(qqId);
      
      res.json({ success: true, token });
    } catch (error: any) {
      res.status(500).json({ success: false, error: '服务器错误' });
    }
  });
  
  // Change password
  app.post('/api/password/change', async (req: Request, res: Response) => {
    try {
      const { qq_id, old_password, new_password } = req.body;
      
      if (!qq_id || !old_password || !new_password) {
        return res.json({ success: false, error: '参数不完整' });
      }
      
      if (new_password.length < 6) {
        return res.json({ success: false, error: '新密码长度至少6位' });
      }
      
      const qqId = parseInt(qq_id);
      const userData = userDataStore.get(qqId);
      
      if (!userData || !userData.passwordHash) {
        return res.json({ success: false, error: '您尚未设置密码' });
      }
      
      const valid = await bcrypt.compare(old_password, userData.passwordHash);
      if (!valid) {
        return res.json({ success: false, error: '原密码错误' });
      }
      
      userData.passwordHash = await bcrypt.hash(new_password, 10);
      saveUserData();
      
      res.json({ success: true, message: '密码修改成功' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: '服务器错误' });
    }
  });
  
  // =====================
  // Session Management APIs
  // =====================
  
  // Get session list - 根据 isolateByUser 配置决定会话来源
  app.post('/api/session/list', authMiddleware, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const sessionManager = getSessionManager();
    const sessionConfig = sessionManager.getConfig();
    
    if (sessionConfig.isolateByUser) {
      // 用户隔离模式：只显示该用户的会话
      const history = sessionManager.getUserSessionHistory(userId);
      const sessions = history.map(s => ({
        session_id: s.sessionId,
        title: s.title,
        created_at: s.createdAt,
        last_accessed: s.lastAccessed,
      }));
      return res.json({ success: true, sessions, count: sessions.length });
    } else {
      // 全局模式：使用 SDK 获取所有 OpenCode 会话
      try {
        if (!opencodeClient) {
          return res.json({ success: true, sessions: [], count: 0, error: 'OpenCode client not initialized' });
        }
        
        const result = await opencodeClient.session.list();
        if (result.error) {
          return res.json({ success: true, sessions: [], count: 0 });
        }
        
        const allSessions = result.data || [];
        const sessions = allSessions.map((s: any) => ({
          session_id: s.id,
          title: s.title || s.slug,
          created_at: s.time?.created,
          last_accessed: s.time?.updated,
        }));
        return res.json({ success: true, sessions, count: sessions.length });
      } catch (error: any) {
        return res.json({ success: true, sessions: [], count: 0 });
      }
    }
  });
  
  // Create new session - 使用统一的 SessionManager
  app.post('/api/session/new', authMiddleware, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { title } = req.body;
    
    try {
      if (!opencodeClient) {
        return res.json({ success: false, error: 'OpenCode not initialized' });
      }
      
      const result = await opencodeClient.session.create({
        body: { title: title || `QQ_${userId}` },
      });
      
      if (result.error) {
        return res.json({ success: false, error: result.error });
      }
      
      const sessionId = result.data?.id;
      if (!sessionId) {
        return res.json({ success: false, error: 'Failed to create session' });
      }
      
      // 使用统一的 SessionManager 创建会话
      const sessionManager = getSessionManager();
      sessionManager.createUserSession(userId, sessionId, title);
      
      res.json({
        success: true,
        session: {
          session_id: sessionId,
          title: title || `QQ_${userId}`,
          created_at: Date.now(),
        },
      });
    } catch (error: any) {
      res.json({ success: false, error: error.message });
    }
  });
  
  // Delete session - 使用统一的 SessionManager
  app.post('/api/session/delete', authMiddleware, async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { session_id } = req.body;
    
    if (!session_id) {
      return res.json({ success: false, error: 'session_id required' });
    }
    
    const sessionManager = getSessionManager();
    sessionManager.deleteSession(userId, session_id);
    
    // 同时尝试从 OpenCode 删除
    if (opencodeClient) {
      try {
        await opencodeClient.session.delete({
          path: { id: session_id }
        });
      } catch (error: any) {}
    }
    
    res.json({ success: true });
  });
  
  // Switch session - 使用统一的 SessionManager
  app.post('/api/session/switch', authMiddleware, (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { session_id } = req.body;
    
    if (!session_id) {
      return res.json({ success: false, error: 'session_id required' });
    }
    
    const sessionManager = getSessionManager();
    const session = sessionManager.switchToSession(userId, session_id);
    
    res.json({ success: true, session });
  });
  
  // =====================
  // Configuration APIs - 使用统一的 SessionManager
  // =====================
  
  // Get agent
  app.post('/api/agent/get', authMiddleware, (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const sessionManager = getSessionManager();
    const userConfig = sessionManager.getUserConfig(userId);
    
    res.json({
      success: true,
      agent: userConfig?.agent || 'Sisyphus (Ultraworker)',
    });
  });
  
  // Set agent
  app.post('/api/agent/set', authMiddleware, (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { agent } = req.body;
    
    if (!agent) {
      return res.json({ success: false, error: 'agent required' });
    }
    
    const sessionManager = getSessionManager();
    sessionManager.updateUserConfig(userId, { agent });
    
    res.json({ success: true, agent });
  });
  
  // Get model
  app.post('/api/model/get', authMiddleware, (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const sessionManager = getSessionManager();
    const userConfig = sessionManager.getUserConfig(userId);
    
    res.json({
      success: true,
      model: userConfig?.model || 'alibaba-coding-plan-cn/glm-5',
      provider: userConfig?.provider || 'alibaba-coding-plan-cn',
    });
  });
  
  // Set model
  app.post('/api/model/set', authMiddleware, (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { model, provider } = req.body;
    
    if (!model) {
      return res.json({ success: false, error: 'model required' });
    }
    
    const sessionManager = getSessionManager();
    sessionManager.updateUserConfig(userId, { model, provider });
    
    res.json({ success: true, model, provider });
  });
  
  // List agents - 从缓存获取
  app.get('/api/agents/list', (req: Request, res: Response) => {
    const cache = getAgentModelCache();
    const agents = cache.isInitialized() 
      ? cache.getAgentNames() 
      : ['Sisyphus (Ultraworker)', 'Prometheus (Plan Builder)', 'Atlas (Plan Executor)'];
    res.json({ success: true, agents });
  });
  
  // List models - 从缓存获取
  app.get('/api/models/list', (req: Request, res: Response) => {
    const cache = getAgentModelCache();
    if (cache.isInitialized()) {
      const models = cache.getModels();
      res.json({ success: true, models });
    } else {
      res.json({
        success: true,
        models: [
          { id: 'alibaba-coding-plan-cn/glm-5', name: 'GLM-5', provider: 'alibaba-coding-plan-cn' },
          { id: 'alibaba-coding-plan-cn/qwen3.5-plus', name: 'Qwen3.5 Plus', provider: 'alibaba-coding-plan-cn' },
        ],
      });
    }
  });
  
  // =====================
  // QQ User Info API
  // =====================
  
  app.get('/api/qq/userinfo/:qq', async (req: Request, res: Response) => {
    const qq = req.params.qq;
    
    try {
      // Fetch QQ avatar and nickname from API
      const response = await fetch(`https://api.qjqq.cn/api/qqinfo?qq=${qq}`);
      const data = await response.json() as any;
      
      if (data.code === 200 && data.data) {
        res.json({
          success: true,
          nickname: data.data.name,
          avatar: data.data.avatar,
        });
      } else {
        // Fallback: use QQ number as nickname
        res.json({
          success: true,
          nickname: `QQ用户${qq}`,
          avatar: `https://q.qlogo.cn/headimg_dl?dst_uin=${qq}&spec=100`,
        });
      }
    } catch (error) {
      // Fallback
      res.json({
        success: true,
        nickname: `QQ用户${qq}`,
        avatar: `https://q.qlogo.cn/headimg_dl?dst_uin=${qq}&spec=100`,
      });
    }
  });
  
  // =====================
  // OpenCode SDK APIs (替代 HTTP 代理)
  // =====================
  
  // Get session messages - 使用 SDK
  app.get('/api/opencode/sessions/:sessionId/messages', authMiddleware, async (req: Request, res: Response) => {
    const sessionId = req.params.sessionId;
    const limit = parseInt(req.query.limit as string) || 50;
    
    try {
      if (!opencodeClient) {
        return res.status(503).json({ error: 'OpenCode client not initialized' });
      }
      
      const result = await opencodeClient.session.messages({
        path: { id: sessionId },
        query: { limit }
      });
      
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json(result.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Send message to session - 使用 SDK
  app.post('/api/opencode/sessions/:sessionId/messages', authMiddleware, async (req: Request, res: Response) => {
    const sessionId = req.params.sessionId;
    const { agent, model, parts } = req.body;
    
    try {
      if (!opencodeClient) {
        return res.status(503).json({ error: 'OpenCode client not initialized' });
      }
      
      // 解析 model 格式
      let modelId = model?.modelID || model?.id || 'glm-5';
      let providerId = model?.providerID || model?.provider || 'alibaba-coding-plan-cn';
      
      // 如果 model 包含 "/"，解析 provider 和 model
      if (typeof model === 'string' && model.includes('/')) {
        const parts = model.split('/');
        providerId = parts[0];
        modelId = parts[1];
      }
      
      const result = await opencodeClient.session.prompt({
        path: { id: sessionId },
        body: {
          agent: agent || 'Sisyphus (Ultraworker)',
          model: {
            modelID: modelId,
            providerID: providerId,
          },
          parts: parts || [{ type: 'text', text: req.body.text || '' }],
        },
      });
      
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json(result.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // List sessions - 使用 SDK
  app.get('/api/opencode/sessions', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!opencodeClient) {
        return res.status(503).json({ error: 'OpenCode client not initialized' });
      }
      
      const result = await opencodeClient.session.list();
      
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json(result.data || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create session - 使用 SDK
  app.post('/api/opencode/sessions', authMiddleware, async (req: Request, res: Response) => {
    const { title } = req.body;
    
    try {
      if (!opencodeClient) {
        return res.status(503).json({ error: 'OpenCode client not initialized' });
      }
      
      const result = await opencodeClient.session.create({
        body: { title: title || 'New Session' }
      });
      
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json(result.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Delete session - 使用 SDK
  app.delete('/api/opencode/sessions/:sessionId', authMiddleware, async (req: Request, res: Response) => {
    const sessionId = req.params.sessionId;
    
    try {
      if (!opencodeClient) {
        return res.status(503).json({ error: 'OpenCode client not initialized' });
      }
      
      const result = await opencodeClient.session.delete({
        path: { id: sessionId }
      });
      
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // List agents - 使用 SDK
  app.get('/api/opencode/agents', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!opencodeClient) {
        return res.status(503).json({ error: 'OpenCode client not initialized' });
      }
      
      const result = await opencodeClient.app.agents();
      
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json(result.data || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // List providers/models - 使用 SDK
  app.get('/api/opencode/models', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!opencodeClient) {
        return res.status(503).json({ error: 'OpenCode client not initialized' });
      }
      
      const result = await opencodeClient.config.providers();
      
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json(result.data || { providers: [] });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
// Global events (SSE) - 使用插件钩子事件（无需 HTTP API）
  app.get('/api/opencode/events', authMiddleware, async (req: Request, res: Response) => {
    try {
      // Setup SSE response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      
      // 发送连接成功事件
      res.write(`data: ${JSON.stringify({directory: '', payload: {type: 'server.connected', properties: {}}})}\n\n`);
      
      // 订阅 OpenCode 事件
      const unsubscribe = subscribeToEvents((event) => {
        try {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch (e) {
          // 客户端可能已断开
        }
      });
      
      // 心跳保活
      const heartbeat = setInterval(() => {
        try {
          res.write(': heartbeat\n\n');
        } catch (e) {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 30000);
      
      // 客户端断开时清理
      req.on('close', () => {
        clearInterval(heartbeat);
        unsubscribe();
      });
      
    } catch (error: any) {
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.end();
      }
    }
  });
  
  // =====================
  // SSE Events
  // =====================
  
  app.get('/events', authMiddleware, (req: Request, res: Response) => {
    const userId = (req as any).userId;
    
    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    
    // Register client
    if (!sseClients.has(userId)) {
      sseClients.set(userId, []);
    }
    sseClients.get(userId)!.push({ userId, res });
    
    // Send initial connection message
    res.write('event: connected\ndata: {"status":"connected"}\n\n');
    
    // Heartbeat
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 30000);
    
    // Cleanup on close
    req.on('close', () => {
      clearInterval(heartbeat);
      const clients = sseClients.get(userId) || [];
      const index = clients.findIndex(c => c.res === res);
      if (index >= 0) {
        clients.splice(index, 1);
      }
    });
  });
  
  // =====================
  // Start Server
  // =====================
  
  let server: http.Server | https.Server;
  let protocol = 'http';
  
  // 检查 SSL 配置
  if (ssl?.enabled && ssl.keyPath && ssl.certPath) {
    try {
      const sslOptions: https.ServerOptions = {
        key: fs.readFileSync(ssl.keyPath, 'utf-8'),
        cert: fs.readFileSync(ssl.certPath, 'utf-8'),
      };
      
      // 可选 CA 证书
      if (ssl.caPath) {
        sslOptions.ca = fs.readFileSync(ssl.caPath, 'utf-8');
      }
      
      server = https.createServer(sslOptions, app);
      protocol = 'https';
    } catch (error: any) {
      server = http.createServer(app);
    }
  } else {
    server = http.createServer(app);
  }
  
  server.listen(port, () => {
    const protocol = ssl?.enabled ? 'https' : 'http';
    console.log(`[QQ Plugin] Web Server 已启动`);
    console.log(`[QQ Plugin] 地址: ${protocol}://localhost:${port}`);
    console.log(`[QQ Plugin] SSL: ${ssl?.enabled ? '已启用' : '未启用'}`);
  });
  
  server.on('error', (err: NodeJS.ErrnoException) => {
    console.error(`[QQ Plugin] Web Server 启动失败: ${err.message}`);
    if (err.code === 'EADDRINUSE') {
      console.error(`[QQ Plugin] 端口 ${port} 已被占用`);
    }
  });
  
  return server;
}

// Export for use in other modules
export { userDataStore, UserSession, UserData };