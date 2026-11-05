# Gatekeeper Bot - Setup & Discord Integration Guide

Comprehensive guide to deploying, configuring, and managing Gatekeeper Discord Bot.

---

## 1. Discord Developer Portal Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** and name it (e.g., `Gatekeeper`).
3. Under **General Information**:
   - Copy **Application ID** &rarr; set as `DISCORD_APPLICATION_ID` in `.env`.
   - Copy **Public Key** &rarr; set as `DISCORD_PUBLIC_KEY` in `.env`.
4. Under **Bot**:
   - Click **Reset Token** to generate a bot token &rarr; set as `DISCORD_TOKEN` in `.env`.
   - Enable **Privileged Gateway Intents** if future gateway events are added (not required for HTTP interactions).
5. Generate Bot Invite Link:
   - When server starts, Gatekeeper automatically logs your invite link:
     ```text
     https://discord.com/oauth2/authorize?client_id=<YOUR_APP_ID>&scope=bot%20applications.commands&permissions=8
     ```
   - Open this URL in browser to add Gatekeeper to your target Discord server.

---

## 2. Setting Interactions Endpoint URL

Discord HTTP interaction bots require a publicly reachable HTTPS endpoint to deliver interactions.

1. Expose your local port `3000` via Cloudflare Tunnel or reverse proxy:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
2. In Discord Developer Portal &rarr; **General Information** &rarr; **Interactions Endpoint URL**:
   ```text
   https://<your-public-domain>/interactions
   ```
3. Discord will send a test `PING` request with Ed25519 signature. Gatekeeper automatically validates signature and returns `PONG` (`{ type: 1 }`).
4. Click **Save Changes**.

---

## 3. Registering Slash Commands

Before commands appear in Discord clients, register them with Discord's REST API:

```bash
bun run register
```

### Global vs Guild Commands:
- **Global Commands** (`DISCORD_GUILD_ID` left empty in `.env`):
  Available across all servers where bot is installed. Discord caches global commands for up to 1 hour.
- **Guild Commands** (`DISCORD_GUILD_ID=<your_guild_id>` in `.env`):
  Updates instantly in your specific test server. Recommended during development.

---

## 4. PostgreSQL & Redis Architecture

Gatekeeper uses zero-dependency native Bun drivers:
- **`Bun.SQL`**: Connects to `postgres://dethz:dethz198@localhost:5431/gatekeeper`.
  - Tables are created automatically on startup via `initDb()`.
- **`Bun.RedisClient`**: Connects to `redis://localhost:6380`.
  - Caches whitelist lookups with a 300-second TTL to avoid database hits during interactions.

### Database Tables:
- `servers`: Guild configuration (`id`, `name`, `enabled`, timestamps).
- `rooms`: Channels assigned to Gatekeeper (`id`, `server_id`, `name`, `type`, timestamps).
- `whitelist`: Authorized user/role access list (`id`, `server_id`, `target_id`, `target_type`, `reason`).

---

## 5. Whitelist Management Workflow

1. Register target server:
   ```bash
   curl -X POST http://localhost:3000/api/servers \
     -H "Content-Type: application/json" \
     -d '{"id": "123456789012345678", "name": "Main Server"}'
   ```

2. Add user to whitelist:
   ```bash
   curl -X POST http://localhost:3000/api/whitelist \
     -H "Content-Type: application/json" \
     -d '{"serverId": "123456789012345678", "targetId": "987654321098765432", "reason": "Admin"}'
   ```

3. In Discord, run `/verify`:
   - Whitelisted user receives: `✅ Verification successful. You are on the whitelist! Access granted.`
   - Non-whitelisted user receives: `⛔ Verification check: User not on whitelist for this server.`
