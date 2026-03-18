# OpenCode QQ Plugin - AI 安装指南

本文档专为 AI 助手设计，用于帮助用户安装和配置 OpenCode QQ Plugin。

---

## 给 AI 助手的提示

**重要**：在帮助用户安装插件时，请使用 `question` 工具**依次**向用户提问，逐步收集配置信息。

**提问顺序（使用 question 工具）：**

**问题 1 - 基本信息：**
```
请提供以下基本信息：
1. 机器人的 QQ 号是多少？
2. 管理员的 QQ 号是多少？
```

**问题 2 - NapCat WebSocket：**
```
请提供 NapCat WebSocket 服务配置：
1. WebSocket 服务地址和端口是什么？（例如：ws://localhost:3002）
2. WebSocket 访问令牌是什么？
```

**问题 3 - NapCat HTTP API：**
```
请提供 NapCat HTTP API 服务配置：
1. HTTP API 服务地址和端口是什么？（例如：http://localhost:3001）
2. HTTP API 访问令牌是什么？
```

**问题 4 - 白名单：**
```
请提供白名单配置：
1. 允许使用此插件的 QQ 号列表（多个用逗号分隔）
2. 允许使用此插件的群号列表（可选，多个用逗号分隔）
```

---

## 概述

OpenCode QQ Plugin 将 QQ 消息与 OpenCode AI 集成，提供：
- 通过 NapCat WebSocket 处理 QQ 消息
- Web 管理界面（端口 8080）
- 自定义 AI 工具（发送消息、获取好友等）
- 会话管理和白名单过滤

---

## 前置要求

安装前，请验证以下条件：

1. **已安装 OpenCode** - 用户必须已安装 OpenCode CLI
2. **NapCat 正在运行** - NapCat 服务已启用 WebSocket（默认：ws://localhost:3002）
3. **Node.js 18+** - 插件依赖需要

验证命令：
```bash
opencode --version
node --version
```

---

## 安装步骤

### 步骤 1：创建插件目录

```bash
# 创建插件目录（选择合适的位置）
mkdir -p ~/.opencode/plugins/opencode-qq-plugin
cd ~/.opencode/plugins/opencode-qq-plugin
```

### 步骤 2：复制插件文件

插件需要以下文件：
- `dist/` - 编译后的 JavaScript 文件
- `public/` - Web 界面文件
- `config.example.json` - 配置模板

获取方式：
- 从现有安装复制
- 从 GitHub Release 下载
- 通过 npm 安装：`npm install opencode-qq-plugin`

### 步骤 3：创建配置文件

复制模板并编辑：
```bash
cp config.example.json config.json
```

### 步骤 4：配置必要字段

编辑 `config.json`，填入用户的具体信息：

```json
{
  "bot": {
    "name": "机器人名称",
    "qqId": "机器人QQ号",
    "adminQq": "管理员QQ号"
  },
  "napcat": {
    "websocket": {
      "url": "WEBSOCKET地址",
      "accessToken": "WEBSOCKET访问令牌"
    },
    "httpApi": {
      "baseUrl": "HTTP_API地址",
      "accessToken": "HTTP访问令牌",
      "enabled": true
    }
  },
  "whitelist": {
    "qqUsers": [允许使用的QQ号列表],
    "groups": [允许使用的群号列表]
  }
}
```

**重要：NapCat 服务配置**

用户需要在 NapCat 中创建两个服务：
1. **WebSocket 服务器** - 用于接收 QQ 消息（默认端口 3002）
2. **HTTP API 服务器** - 用于发送消息等操作（默认端口 3001）

在 NapCat 配置文件中添加：
```json
{
  "http": {
    "enable": true,
    "host": "0.0.0.0",
    "port": 你的HTTP端口,
    "secret": "你的HTTP访问令牌"
  },
  "ws": {
    "enable": true,
    "host": "0.0.0.0",
    "port": 你的WebSocket端口,
    "secret": "你的WebSocket访问令牌"
  }
}
```

**需要向用户询问的关键字段：**
| 字段 | 说明 | 示例 |
|------|------|------|
| `bot.qqId` | 机器人 QQ 号 | "123456789" |
| `bot.adminQq` | 管理员 QQ 号 | "987654321" |
| `napcat.websocket.url` | NapCat WebSocket 地址 | "ws://localhost:3002" |
| `napcat.websocket.accessToken` | NapCat WebSocket 访问令牌 | "abc123xyz" |
| `napcat.httpApi.baseUrl` | NapCat HTTP API 地址 | "http://localhost:3001" |
| `napcat.httpApi.accessToken` | NapCat HTTP API 访问令牌 | "def456uvw" |
| `whitelist.qqUsers` | 允许使用的 QQ 号 | [123456789, 987654321] |
| `whitelist.groups` | 允许使用的群号 | [813729523] |

### 步骤 5：在 OpenCode 中注册插件

在项目根目录创建或编辑 `.opencode/opencode.json`：

```json
{
  "plugin": ["./path/to/opencode-qq-plugin"]
}
```

全局安装方式：
```json
{
  "plugin": ["~/.opencode/plugins/opencode-qq-plugin"]
}
```

### 步骤 6：启动 OpenCode

```bash
# 无需 --port 参数
opencode
```

---

## 验证安装

启动 OpenCode 后，验证插件是否正常工作：

### 1. 检查 Web 界面
- 打开浏览器访问：http://127.0.0.1:8080
- 应显示登录页面

### 2. 检查日志服务器
- 打开浏览器访问：http://127.0.0.1:4099
- 应显示日志查看器

### 3. 测试 QQ 消息
- 向机器人 QQ 发送消息
- 如果用户在白名单中，机器人应响应

### 4. 检查插件工具
插件提供以下 AI 工具：
- `qq_send_message` - 发送 QQ 消息
- `qq_get_friends` - 获取好友列表
- `qq_search_friend` - 按名称搜索好友
- `qq_send_file` - 发送文件到 QQ
- `qq_get_login_info` - 获取机器人 QQ 信息
- `qq_send_poke` - 发送戳一戳
- `qq_get_file` - 获取文件信息
- `qq_get_group_history` - 获取群历史消息

---

## 配置参考

### bot 配置
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 机器人显示名称 |
| qqId | string | 是 | 机器人 QQ 号 |
| adminQq | string | 否 | 管理员 QQ 号 |

### napcat.websocket 配置
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | 是 | NapCat WebSocket URL |
| accessToken | string | 是 | WebSocket 访问令牌 |
| reconnectInterval | number | 否 | 重连间隔（毫秒） |

### napcat.httpApi 配置
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| baseUrl | string | 是 | NapCat HTTP API URL |
| accessToken | string | 是 | HTTP API 访问令牌 |
| enabled | boolean | 否 | 是否启用 HTTP API（默认 true） |

### whitelist 配置
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| qqUsers | number[] | 是 | 允许的 QQ 用户 ID |
| groups | number[] | 否 | 允许的群 ID |

### webServer 配置
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| enabled | boolean | 否 | 是否启用 Web 界面 |
| port | number | 否 | Web 服务器端口（默认 8080） |

### session.isolateByUser 配置
| 值 | 行为 |
|------|------|
| true | 每个用户有独立的会话 |
| false | 全局会话（默认） |

---

## 故障排除

### 插件未加载
1. 检查 `.opencode/opencode.json` 路径是否正确
2. 验证 `dist/` 目录是否存在
3. 检查 OpenCode 版本 >= 0.15.0

### Web 界面无法访问
1. 检查端口 8080 是否被占用：`netstat -an | grep 8080`
2. 验证配置中 `webServer.enabled` 为 true

### 无法接收 QQ 消息
1. 验证 NapCat WebSocket 服务是否运行
2. 检查 `napcat.websocket.accessToken` 是否与 NapCat 配置匹配
3. 确保用户在 `whitelist.qqUsers` 中
4. 检查 NapCat 是否正确配置了 WebSocket 服务器

### 无法发送 QQ 消息
1. 验证 NapCat HTTP API 服务是否运行
2. 检查 `napcat.httpApi.accessToken` 是否与 NapCat 配置匹配
3. 确保 `napcat.httpApi.enabled` 为 true

### AI 无法发送 QQ 消息
1. 验证机器人与目标用户是好友关系（私聊消息）
2. 检查机器人在群中是否有发言权限（群聊消息）

---

## 安装后的文件结构

```
opencode-qq-plugin/
├── dist/                    # 编译后的 JS
│   ├── index.js            # 入口文件
│   └── ...
├── public/
│   └── index.html          # Web 界面
├── config.json             # 用户配置（从模板创建）
├── config.example.json     # 配置模板
└── data/                   # 运行时数据（自动创建）
    ├── sessions.json       # 会话映射
    ├── users.json          # Web 用户
    └── downloads/          # 下载的文件
```

---

## 快速安装脚本

复制插件文件后，运行以下脚本：

```bash
#!/bin/bash
# opencode-qq-plugin 快速设置脚本

PLUGIN_DIR="${1:-$HOME/.opencode/plugins/opencode-qq-plugin}"

# 从模板创建配置文件
if [ ! -f "$PLUGIN_DIR/config.json" ]; then
    cp "$PLUGIN_DIR/config.example.json" "$PLUGIN_DIR/config.json"
    echo "已创建 config.json - 请编辑填入你的配置"
fi

# 创建数据目录
mkdir -p "$PLUGIN_DIR/data/downloads"
mkdir -p "$PLUGIN_DIR/logs"

# 创建 OpenCode 配置
OPENCODE_CONFIG="$HOME/.opencode/opencode.json"
if [ ! -f "$OPENCODE_CONFIG" ]; then
    echo '{"plugin": ["~/.opencode/plugins/opencode-qq-plugin"]}' > "$OPENCODE_CONFIG"
    echo "已创建 .opencode/opencode.json"
fi

echo "设置完成！请编辑 $PLUGIN_DIR/config.json 填入你的配置。"
```

---

## AI 助手检查清单

帮助用户安装此插件时，完成以下步骤：

- [ ] 验证 OpenCode 已安装
- [ ] 验证 NapCat 正在运行
- [ ] 复制插件文件到目标目录
- [ ] 从 `config.example.json` 创建 `config.json`
- [ ] 向用户询问必要的配置信息
- [ ] 用用户提供的信息更新 `config.json`
- [ ] 在 `.opencode/opencode.json` 中注册插件
- [ ] 启动 OpenCode 并验证 Web 界面
- [ ] 用 QQ 消息测试

---

## 联系与支持

- GitHub Issues: https://github.com/Axeuh/opencode-qq-plugin/issues
- NapCat 文档: https://napcat.apifox.cn/
- OpenCode 文档: https://opencode.ai/docs