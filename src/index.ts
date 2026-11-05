import { Hono } from "hono";
import { config } from "./config";
import { dbService, initDb, sql } from "./db";
import { redisService } from "./redis";

export const app = new Hono();

// Initialize DB schema on startup (gracefully warning if connection pending)
initDb().catch((err) => {
  console.warn("Postgres initDb notice:", err.message);
});

// shortcut: Ed25519 Web Crypto verify; upgrade path: tweetnacl if non-WebCrypto engine needed
export async function verifySignature(
  publicKey: string,
  signature: string,
  timestamp: string,
  body: string
): Promise<boolean> {
  if (!publicKey || !signature || !timestamp) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      Buffer.from(publicKey, "hex"),
      { name: "Ed25519" },
      false,
      ["verify"]
    );
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      Buffer.from(signature, "hex"),
      new TextEncoder().encode(timestamp + body)
    );
  } catch {
    return false;
  }
}

// Generate Discord bot invite link
export function getInviteUrl(appId?: string): string {
  const id = appId || config.discord.applicationId || process.env.DISCORD_APPLICATION_ID;
  if (!id) return "";
  return `https://discord.com/oauth2/authorize?client_id=${id}&scope=bot%20applications.commands&permissions=8`;
}

// Health check endpoint with DB & Redis status
app.get("/", async (c) => {
  let dbOk = false;
  try {
    const check = await sql`SELECT 1 as ok`;
    dbOk = (check as any[])[0]?.ok === 1;
  } catch {
    dbOk = false;
  }

  const redisOk = await redisService.ping();

  return c.json({
    service: "gatekeeper",
    status: "ok",
    database: dbOk ? "connected" : "disconnected",
    redis: redisOk ? "connected" : "disconnected",
    invite_url: getInviteUrl() || null,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (c) => c.json({ status: "ok" }));

// Server & room management API
app.get("/api/servers", async (c) => {
  try {
    const servers = await dbService.getAllServers();
    return c.json(servers);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post("/api/servers", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.id || !body.name) {
      return c.json({ error: "id and name are required" }, 400);
    }
    const server = await dbService.upsertServer(body);
    return c.json(server);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get("/api/rooms", async (c) => {
  try {
    const serverId = c.req.query("serverId");
    const rooms = await dbService.getRooms(serverId);
    return c.json(rooms);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post("/api/rooms", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.id || !body.serverId || !body.name) {
      return c.json({ error: "id, serverId, and name are required" }, 400);
    }
    const room = await dbService.upsertRoom(body);
    return c.json(room);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get("/api/whitelist", async (c) => {
  try {
    const serverId = c.req.query("serverId");
    const list = await dbService.getWhitelist(serverId);
    return c.json(list);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post("/api/whitelist", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.serverId || !body.targetId) {
      return c.json({ error: "serverId and targetId are required" }, 400);
    }
    const record = await dbService.addWhitelist(body);
    await redisService.setWhitelistedCache(body.serverId, body.targetId, true);
    return c.json(record);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete("/api/whitelist", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.serverId || !body.targetId) {
      return c.json({ error: "serverId and targetId are required" }, 400);
    }
    const deleted = await dbService.removeWhitelist(body.serverId, body.targetId);
    await redisService.invalidateWhitelist(body.serverId, body.targetId);
    return c.json({ success: deleted });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Helper to check whitelist with Redis cache
async function isAllowed(serverId: string, targetId: string): Promise<boolean> {
  const cached = await redisService.isWhitelistedCached(serverId, targetId);
  if (cached !== null) return cached;

  try {
    const allowed = await dbService.isWhitelisted(serverId, targetId);
    await redisService.setWhitelistedCache(serverId, targetId, allowed);
    return allowed;
  } catch {
    return false;
  }
}

// Discord Interaction handler
async function handleInteraction(c: any) {
  const signature = c.req.header("x-signature-ed25519") ?? "";
  const timestamp = c.req.header("x-signature-timestamp") ?? "";
  const rawBody = await c.req.text();

  const publicKey = config.discord.publicKey || process.env.DISCORD_PUBLIC_KEY || "";
  if (!publicKey) {
    return c.text("DISCORD_PUBLIC_KEY not configured", 500);
  }

  const isValid = await verifySignature(publicKey, signature, timestamp, rawBody);
  if (!isValid) {
    return c.text("Invalid request signature", 401);
  }

  let interaction: any;
  try {
    interaction = JSON.parse(rawBody);
  } catch {
    return c.text("Bad Request: Invalid JSON", 400);
  }

  // Type 1: Discord PING verification
  if (interaction.type === 1) {
    return c.json({ type: 1 });
  }

  // Type 2: Application Command (Slash command)
  if (interaction.type === 2) {
    const name = interaction.data?.name;
    const guildId = interaction.guild_id || "global";
    const userId = interaction.member?.user?.id || interaction.user?.id || "";

    switch (name) {
      case "ping":
        return c.json({
          type: 4,
          data: { content: "🏓 Pong! Gatekeeper operational." },
        });

      case "gatekeeper":
        return c.json({
          type: 4,
          data: {
            content: `🛡️ **Gatekeeper Status**\n• Server: \`${guildId}\`\n• Database: \`Postgres:5431/gatekeeper\`\n• Cache: \`Redis:6380\``,
          },
        });

      case "verify": {
        const allowed = userId ? await isAllowed(guildId, userId) : false;
        if (allowed) {
          return c.json({
            type: 4,
            data: { content: "✅ Verification successful. You are on the whitelist! Access granted." },
          });
        }
        return c.json({
          type: 4,
          data: { content: "⛔ Verification check: User not on whitelist for this server." },
        });
      }

      case "help":
        return c.json({
          type: 4,
          data: {
            content:
              "🛡️ **Gatekeeper Commands**\n• `/ping` - Health check\n• `/gatekeeper` - System status\n• `/verify` - User whitelist check\n• `/help` - Command list",
          },
        });

      default:
        return c.json({
          type: 4,
          data: { content: `Received command: /${name}` },
        });
    }
  }

  return c.json({ error: "Unsupported interaction type" }, 400);
}

app.post("/", handleInteraction);
app.post("/interactions", handleInteraction);
app.post("/api/interactions", handleInteraction);

const inviteUrl = getInviteUrl();
console.log(`🚀 Gatekeeper server running on http://localhost:${config.port}`);
console.log(
  inviteUrl
    ? `🤖 Discord Bot Invite: ${inviteUrl}`
    : `ℹ️ Discord Bot Invite: (set DISCORD_APPLICATION_ID in .env)`
);

export default {
  port: config.port,
  fetch: app.fetch,
};
