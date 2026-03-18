# OpenCode QQ Plugin - AI Installation Guide

This document is designed for AI assistants to help users install and configure the OpenCode QQ Plugin.

---

## Overview

OpenCode QQ Plugin integrates QQ messages with OpenCode AI, providing:
- QQ message handling via NapCat WebSocket
- Web management interface (port 8080)
- Custom AI tools (send message, get friends, etc.)
- Session management and whitelist filtering

---

## Prerequisites

Before installation, verify these requirements:

1. **OpenCode installed** - User must have OpenCode CLI installed
2. **NapCat running** - NapCat service with WebSocket enabled (default: ws://localhost:3002)
3. **Node.js 18+** - Required for plugin dependencies

Verify with:
```bash
opencode --version
node --version
```

---

## Installation Steps

### Step 1: Create Plugin Directory

```bash
# Create a directory for the plugin (choose appropriate location)
mkdir -p ~/.opencode/plugins/opencode-qq-plugin
cd ~/.opencode/plugins/opencode-qq-plugin
```

### Step 2: Copy Plugin Files

The plugin requires these files:
- `dist/` - Compiled JavaScript files
- `public/` - Web interface files
- `config.example.json` - Configuration template

Either:
- Copy from existing installation
- Download from GitHub release
- Install via npm: `npm install opencode-qq-plugin`

### Step 3: Create Configuration File

Copy the template and edit:
```bash
cp config.example.json config.json
```

### Step 4: Configure Required Fields

Edit `config.json` with user's specific values:

```json
{
  "bot": {
    "name": "BotName",
    "qqId": "BOT_QQ_NUMBER",
    "adminQq": "ADMIN_QQ_NUMBER"
  },
  "napcat": {
    "websocket": {
      "url": "ws://localhost:3002",
      "accessToken": "NAPCAT_ACCESS_TOKEN"
    }
  },
  "whitelist": {
    "qqUsers": [ALLOWED_QQ_NUMBERS],
    "groups": [ALLOWED_GROUP_NUMBERS]
  }
}
```

**Critical fields to ask user:**
| Field | Description | Example |
|-------|-------------|---------|
| `bot.qqId` | Bot's QQ number | "123456789" |
| `bot.adminQq` | Admin's QQ number | "987654321" |
| `napcat.websocket.accessToken` | NapCat access token | "abc123xyz" |
| `whitelist.qqUsers` | Allowed user QQ numbers | [123456789, 987654321] |
| `whitelist.groups` | Allowed group numbers | [813729523] |

### Step 5: Register Plugin with OpenCode

Create or edit `.opencode/opencode.json` in the project root:

```json
{
  "plugin": ["./path/to/opencode-qq-plugin"]
}
```

For global installation:
```json
{
  "plugin": ["~/.opencode/plugins/opencode-qq-plugin"]
}
```

### Step 6: Start OpenCode

```bash
# No --port parameter needed
opencode
```

---

## Verification

After starting OpenCode, verify the plugin works:

### 1. Check Web Interface
- Open browser: http://127.0.0.1:8080
- Should show login page

### 2. Check Log Server
- Open browser: http://127.0.0.1:4099
- Should show log viewer

### 3. Test QQ Message
- Send a message to the bot QQ
- Bot should respond if user is in whitelist

### 4. Check Plugin Tools
The plugin provides these AI tools:
- `qq_send_message` - Send QQ message
- `qq_get_friends` - Get friend list
- `qq_search_friend` - Search friend by name
- `qq_send_file` - Send file to QQ
- `qq_get_login_info` - Get bot QQ info
- `qq_send_poke` - Send poke
- `qq_get_file` - Get file info
- `qq_get_group_history` - Get group history

---

## Configuration Reference

### bot
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | Bot display name |
| qqId | string | Yes | Bot's QQ number |
| adminQq | string | No | Admin's QQ number |

### napcat.websocket
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| url | string | Yes | NapCat WebSocket URL |
| accessToken | string | Yes | Access token |
| reconnectInterval | number | No | Reconnect interval (ms) |

### whitelist
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| qqUsers | number[] | Yes | Allowed QQ user IDs |
| groups | number[] | No | Allowed group IDs |

### webServer
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| enabled | boolean | No | Enable web interface |
| port | number | No | Web server port (default 8080) |

### session.isolateByUser
| Value | Behavior |
|-------|----------|
| true | Each user has isolated sessions |
| false | Global sessions (default) |

---

## Troubleshooting

### Plugin not loading
1. Check `.opencode/opencode.json` path is correct
2. Verify `dist/` directory exists
3. Check OpenCode version >= 0.15.0

### Web interface not accessible
1. Check port 8080 is not in use: `netstat -an | grep 8080`
2. Verify `webServer.enabled` is true in config

### QQ messages not received
1. Verify NapCat WebSocket is running
2. Check `napcat.websocket.accessToken` matches NapCat config
3. Ensure user is in `whitelist.qqUsers`

### AI cannot send QQ messages
1. Verify bot is friends with target user (for private messages)
2. Check bot has permission in group (for group messages)

---

## File Structure After Installation

```
opencode-qq-plugin/
├── dist/                    # Compiled JS
│   ├── index.js            # Entry point
│   └── ...
├── public/
│   └── index.html          # Web interface
├── config.json             # User configuration (create from example)
├── config.example.json     # Configuration template
└── data/                   # Runtime data (auto-created)
    ├── sessions.json       # Session mappings
    ├── users.json          # Web users
    └── downloads/          # Downloaded files
```

---

## Quick Installation Script

For automated installation, run this after copying plugin files:

```bash
#!/bin/bash
# Quick setup script for opencode-qq-plugin

PLUGIN_DIR="${1:-$HOME/.opencode/plugins/opencode-qq-plugin}"

# Create config from example if not exists
if [ ! -f "$PLUGIN_DIR/config.json" ]; then
    cp "$PLUGIN_DIR/config.example.json" "$PLUGIN_DIR/config.json"
    echo "Created config.json - please edit with your values"
fi

# Create data directories
mkdir -p "$PLUGIN_DIR/data/downloads"
mkdir -p "$PLUGIN_DIR/logs"

# Create OpenCode config if not exists
OPENCODE_CONFIG="$HOME/.opencode/opencode.json"
if [ ! -f "$OPENCODE_CONFIG" ]; then
    echo '{"plugin": ["~/.opencode/plugins/opencode-qq-plugin"]}' > "$OPENCODE_CONFIG"
    echo "Created .opencode/opencode.json"
fi

echo "Setup complete! Edit $PLUGIN_DIR/config.json with your configuration."
```

---

## AI Assistant Checklist

When helping user install this plugin, complete these steps:

- [ ] Verify OpenCode is installed
- [ ] Verify NapCat is running
- [ ] Copy plugin files to target directory
- [ ] Create `config.json` from `config.example.json`
- [ ] Ask user for required configuration values
- [ ] Update `config.json` with user's values
- [ ] Register plugin in `.opencode/opencode.json`
- [ ] Start OpenCode and verify web interface
- [ ] Test with a QQ message

---

## Contact & Support

- GitHub Issues: https://github.com/your-username/opencode-qq-plugin/issues
- NapCat Documentation: https://napcat.apifox.cn/
- OpenCode Documentation: https://opencode.ai/docs