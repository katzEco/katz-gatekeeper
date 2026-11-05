# Gatekeeper Bot

Discord interaction bot running over Hono.js on Bun with PostgreSQL & Redis.

## Features

- **Zero-gateway overhead**: Uses Discord HTTP Interactions endpoint instead of persistent gateway WebSockets.
- **Native Ed25519 verification**: Validates Discord request signatures via standard Web Crypto API.
- **Postgres Database**: Stores target servers, rooms, and whitelists (`postgres://dethz:dethz198@localhost:5431/gatekeeper`).
- **Redis Cache**: Caches whitelist checks at `redis://localhost:6380` for high-throughput responses.
- **Slash commands**: Built-in `/ping`, `/gatekeeper`, `/verify`, and `/help`.
- **Management API**: REST endpoints for `/api/servers`, `/api/rooms`, and `/api/whitelist`.
- **Health monitoring**: `GET /` and `GET /health` with DB and Redis connection diagnostics.

## Setup

1. Copy `.env.example` to `.env`:
   ```sh
   cp .env.example .env
   ```
2. Fill Discord credentials in `.env`:
   - `DISCORD_APPLICATION_ID`
   - `DISCORD_PUBLIC_KEY`
   - `DISCORD_TOKEN`
   - `DISCORD_GUILD_ID` (optional, for immediate command updates in test server)
   - `DATABASE_URL` (defaults to `postgres://dethz:dethz198@localhost:5431/gatekeeper`)
   - `REDIS_URL` (defaults to `redis://localhost:6380`)

3. Register slash commands:
   ```sh
   bun run register
   ```

4. Set **Interactions Endpoint URL** in Discord Developer Portal:
   ```text
   https://<your-domain>/interactions
   ```

## Development & Deployment

Local dev:
```sh
bun run dev
```

Run tests:
```sh
bun test
```

Run with Docker Compose:
```sh
docker compose up -d --build
```
