import { Hono, type Context } from "hono";
import { config } from "./config";
import { dbService, initDb, sql } from "./db";
import { redisService } from "./redis";
import { startDiscordBot, botState, swapRoleRoomConnection } from "./bot/discord";
import { renderDashboardHtml } from "./views/dashboard";

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

// RawBlock Frontend Dashboard
app.get("/dashboard", async (c) => {
  return c.html(await renderDashboardHtml());
});

// Root: Dashboard for browsers, JSON for API/curl/tests
app.get("/", async (c) => {
  const accept = c.req.header("accept") || "";
  if (accept.includes("text/html") && !accept.includes("application/json")) {
    return c.html(await renderDashboardHtml());
  }

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
    bot: {
      connected: botState.connected,
      tag: botState.tag,
      ping: botState.ping,
    },
    database: dbOk ? "connected" : "disconnected",
    redis: redisOk ? "connected" : "disconnected",
    invite_url: getInviteUrl() || null,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (c) => c.json({ status: "ok" }));

// Whitelist Real-time Verification check
app.get("/api/whitelist/check", async (c) => {
  const serverId = c.req.query("serverId") || "";
  const targetId = c.req.query("targetId") || "";
  if (!serverId || !targetId) {
    return c.json({ error: "serverId and targetId are required" }, 400);
  }
  const allowed = await isAllowed(serverId, targetId);
  return c.json({ serverId, targetId, allowed });
});

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

app.delete("/api/servers", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const id = body.id || c.req.query("id");
    if (!id) {
      return c.json({ error: "id is required" }, 400);
    }
    const deleted = await dbService.removeServer(id);
    await redisService.invalidateServer(id);
    return c.json({ success: deleted });
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

app.post("/api/rooms/swap-connection", async (c) => {
  try {
    const body = await c.req.json();
    const { roomId, roleId } = body;
    if (!roomId || !roleId) {
      return c.json({ error: "roomId and roleId are required" }, 400);
    }
    const result = await swapRoleRoomConnection(roomId, roleId);
    return c.json(result);
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
    const body = await c.req.json().catch(() => ({}));
    const serverId = body.serverId || c.req.query("serverId");
    const targetId = body.targetId || c.req.query("targetId");

    if (!serverId) {
      return c.json({ error: "serverId is required" }, 400);
    }

    if (targetId) {
      const deleted = await dbService.removeWhitelist(serverId, targetId);
      await redisService.invalidateWhitelist(serverId, targetId);
      return c.json({ success: deleted });
    } else {
      // Remove all whitelist entries for the specified server
      const count = await dbService.removeWhitelistByServer(serverId);
      await redisService.invalidateServer(serverId);
      return c.json({ success: true, removedCount: count });
    }
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
async function handleInteraction(c: Context) {
  const signature = c.req.header("x-signature-ed25519") ?? "";
  const timestamp = c.req.header("x-signature-timestamp") ?? "";
  const rawBody = await c.req.text();

  const publicKey = process.env.DISCORD_PUBLIC_KEY || config.discord.publicKey || "";
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

if (import.meta.main) {
  const inviteUrl = getInviteUrl();
  console.log(`🚀 Gatekeeper server running on http://localhost:${config.port}`);
  console.log(
    inviteUrl
      ? `🤖 Discord Bot Invite: ${inviteUrl}`
      : `ℹ️ Discord Bot Invite: (set DISCORD_APPLICATION_ID in .env)`
  );

  startDiscordBot().catch((err) => {
    console.warn("Discord gateway notice:", err.message);
  });
}

export default {
  port: config.port,
  fetch: app.fetch,
};
