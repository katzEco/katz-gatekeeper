# Gatekeeper Bot (Hono + Discord.js + PostgreSQL + Redis)

High-performance Discord bot & RawBlock access control dashboard built with **Bun**, **Hono.js**, **Discord.js**, **PostgreSQL** (port `5431`), and **Redis** (port `6380`).

Features a 24/7 Discord Gateway client for live online presence & slash commands, dual-mode HTTP webhook interactions, and a Catppuccin Macchiato brutalist web control dashboard.

---

## ⚡ Quick Start

### Run Locally with Bun

```bash
bun install
bun run dev
```

Server and bot start automatically:
```text
🚀 Gatekeeper server running on http://localhost:3003
🤖 Discord Bot connected as dethz-gatekeeper#3651 (Gateway ONLINE)
🤖 Discord Bot Invite: https://discord.com/oauth2/authorize?client_id=1567869663554043935&scope=bot%20applications.commands&permissions=8
```

Open `http://localhost:3003/` in your browser for the **RawBlock Control Dashboard**.

---

## ⚙️ Environment Variables (`.env`)

Copy template and fill your Discord credentials:
```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP server listening port |
| `NODE_ENV` | `production` | Runtime mode (`development` / `production`) |
| `DATABASE_URL` | `postgres://dethz:dethz198@localhost:5431/gatekeeper` | PostgreSQL database connection string |
| `REDIS_URL` | `redis://localhost:6380` | Redis cache connection string |
| `DISCORD_APPLICATION_ID` | `""` | Discord Application / Client ID |
| `DISCORD_PUBLIC_KEY` | `""` | Discord Application Public Key (for Ed25519 signature checks) |
| `DISCORD_TOKEN` | `""` | Discord Bot Token (for REST API & command sync) |
| `DISCORD_GUILD_ID` | `""` | *(Optional)* Target Guild ID for instant slash command sync |

---

## 🚀 Architecture (Ponytail Zero-Dep)

- **HTTP Interactions over Hono**: Runs over stateless HTTP webhooks (`POST /interactions`, `POST /`) rather than persistent WebSocket gateway connections.
- **Native Web Crypto Ed25519**: Validates `x-signature-ed25519` and `x-signature-timestamp` headers using standard `crypto.subtle` (no external crypto dependencies).
- **PostgreSQL (`5431`)**: Stores servers, channels/rooms, and member whitelists using native `Bun.SQL`.
- **Redis (`6380`)**: Caches whitelist decisions with 300-second TTL via native `Bun.RedisClient`.
- **Automatic Invite Generation**: Prints OAuth2 invite link on startup and serves it at `GET /`.

---

## 🤖 Discord Slash Commands

Register commands with Discord REST API:
```bash
bun run register
```

| Command | Description | Behavior |
|---|---|---|
| `/ping` | Latency & health check | Replies with bot status and roundtrip latency |
| `/gatekeeper` | System diagnostics | Displays current Guild ID, PostgreSQL, and Redis status |
| `/verify` | User access check | Checks if user is on the server whitelist via Redis + Postgres |
| `/control-room` | Interactive room panel | Posts a rich embed with dynamic toggle button to control connection access |
| `/swap-connection` | Toggle room access | Swaps `Connect` permission for target role in specified room |
| `/help` | Command reference | Displays interactive guide to available commands |

---

## 📡 REST API Reference & cURL Examples

### 1. Health & Service Diagnostics
```bash
curl http://localhost:3000/
```
Response:
```json
{
  "service": "gatekeeper",
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "invite_url": "https://discord.com/oauth2/authorize?client_id=...&scope=bot%20applications.commands&permissions=8",
  "uptime": 120,
  "timestamp": "2026-11-05T19:25:00.000Z"
}
```

### 2. Register Target Server (Guild)
```bash
curl -X POST http://localhost:3000/api/servers \
  -H "Content-Type: application/json" \
  -d '{
    "id": "123456789012345678",
    "name": "Main Discord Server",
    "enabled": true
  }'
```

### 3. Remove Target Server
```bash
curl -X DELETE http://localhost:3000/api/servers \
  -H "Content-Type: application/json" \
  -d '{ "id": "123456789012345678" }'
```

### 4. Register Room / Channel
```bash
curl -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "id": "987654321098765432",
    "serverId": "123456789012345678",
    "name": "verify-gate",
    "type": "verify"
  }'
```

### 5. Add User to Whitelist
```bash
curl -X POST http://localhost:3000/api/whitelist \
  -H "Content-Type: application/json" \
  -d '{
    "serverId": "123456789012345678",
    "targetId": "555666777888999000",
    "targetType": "user",
    "reason": "Team Member"
  }'
```

### 6. Remove User or Server Whitelist
Remove specific user:
```bash
curl -X DELETE http://localhost:3000/api/whitelist \
  -H "Content-Type: application/json" \
  -d '{
    "serverId": "123456789012345678",
    "targetId": "555666777888999000"
  }'
```
Remove all whitelist entries for a server:
```bash
curl -X DELETE "http://localhost:3000/api/whitelist?serverId=123456789012345678"
```

---

## 🗄️ Database Schema

### `servers`
```sql
CREATE TABLE servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `rooms`
```sql
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `whitelist`
```sql
CREATE TABLE whitelist (
  id SERIAL PRIMARY KEY,
  server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'user',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(server_id, target_id)
);
```

---

## 🧪 Testing

Run test suite:
```bash
bun test
```

Runs 8 tests covering:
- Health and status endpoints
- Ed25519 signature verification (rejection of missing & forged signatures)
- Discord PING/PONG handshake
- Slash command dispatch (`/ping`, `/verify` with Redis caching)

---

## 📖 Additional Documentation

- [Discord Developer Portal & Webhook Setup Guide](docs/SETUP.md)
