/**
 * API 服务器 - 提供测试接口模拟 QQ 消息
 */
import * as http from 'http';
// OpenCode client 引用
let opencodeClient = null;
// 消息处理器引用
let messageHandler = null;
/**
 * 设置 OpenCode 客户端和消息处理器
 */
export function setClient(client, handler) {
    opencodeClient = client;
    messageHandler = handler;
}
/**
 * 创建 API 服务器
 */
export function createApiServer(port = 4098) {
    const server = http.createServer(async (req, res) => {
        const url = req.url || '/';
        const method = req.method || 'GET';
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        // 发送模拟消息
        if (url === '/api/send' && method === 'POST') {
            try {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', async () => {
                    try {
                        const data = JSON.parse(body);
                        if (!messageHandler) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Message handler not initialized' }));
                            return;
                        }
                        // 构造模拟消息
                        const msg = {
                            user_id: data.user_id || 2176284372,
                            group_id: data.group_id,
                            message: data.message || '',
                            sender_name: data.sender_name || 'TestUser',
                            message_type: data.group_id ? 'group' : 'private',
                        };
                        // 调用消息处理器
                        await messageHandler(msg);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: 'Message sent', data: msg }));
                    }
                    catch (e) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: e.message }));
                    }
                });
            }
            catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
            return;
        }
        // 直接发送到 OpenCode session (测试用)
        if (url === '/api/prompt' && method === 'POST') {
            try {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', async () => {
                    try {
                        const data = JSON.parse(body);
                        if (!opencodeClient) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'OpenCode client not initialized' }));
                            return;
                        }
                        const sessionId = data.session_id;
                        const message = data.message;
                        const agent = data.agent;
                        const model = data.model;
                        if (!sessionId || !message) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'session_id and message required' }));
                            return;
                        }
                        // 直接调用 prompt
                        const result = await opencodeClient.session.prompt({
                            path: { id: sessionId },
                            body: {
                                agent: agent,
                                model: model ? { modelID: model, providerID: 'alibaba-coding-plan-cn' } : undefined,
                                parts: [{ type: 'text', text: message }],
                            },
                        });
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            result: result.data,
                            error: result.error
                        }));
                    }
                    catch (e) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: e.message, stack: e.stack }));
                    }
                });
            }
            catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
            return;
        }
        // 创建新会话
        if (url === '/api/session/create' && method === 'POST') {
            try {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', async () => {
                    try {
                        const data = JSON.parse(body);
                        if (!opencodeClient) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'OpenCode client not initialized' }));
                            return;
                        }
                        const result = await opencodeClient.session.create({
                            body: { title: data.title || 'Test Session' },
                        });
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            session_id: result.data?.id,
                            error: result.error
                        }));
                    }
                    catch (e) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: e.message }));
                    }
                });
            }
            catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
            return;
        }
        // 列出会话
        if (url === '/api/session/list') {
            try {
                if (!opencodeClient) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'OpenCode client not initialized' }));
                    return;
                }
                const result = await opencodeClient.session.list();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    sessions: result.data
                }));
            }
            catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
            return;
        }
        // API 文档
        if (url === '/' || url === '/api') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                name: 'QQ Plugin API Server',
                endpoints: {
                    'POST /api/send': {
                        description: 'Send simulated QQ message',
                        body: { user_id: 'number', group_id: 'number (optional)', message: 'string', sender_name: 'string (optional)' }
                    },
                    'POST /api/prompt': {
                        description: 'Direct prompt to OpenCode session',
                        body: { session_id: 'string', message: 'string', agent: 'string (optional)', model: 'string (optional)' }
                    },
                    'POST /api/session/create': {
                        description: 'Create new OpenCode session',
                        body: { title: 'string (optional)' }
                    },
                    'GET /api/session/list': {
                        description: 'List all OpenCode sessions'
                    }
                }
            }, null, 2));
            return;
        }
        // 404
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    });
    server.listen(port, () => { });
    return server;
}
//# sourceMappingURL=api-server.js.map