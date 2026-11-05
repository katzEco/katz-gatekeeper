import { describe, it, expect, beforeAll } from "bun:test";
import { app } from "../src/index";
import { config } from "../src/config";
import { redisService } from "../src/redis";

describe("Gatekeeper Bot API", () => {
  let publicKeyHex: string;
  let privateKey: CryptoKey;

  beforeAll(async () => {
    const keyPair = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
    privateKey = keyPair.privateKey;
    const rawPub = await crypto.subtle.exportKey("raw", keyPair.publicKey);
    publicKeyHex = Buffer.from(rawPub).toString("hex");
    process.env.DISCORD_PUBLIC_KEY = publicKeyHex;
    config.discord.publicKey = publicKeyHex;
  });

  async function createSignedRequest(path: string, bodyObj: any, timestamp = "1234567890") {
    const bodyStr = JSON.stringify(bodyObj);
    const msg = new TextEncoder().encode(timestamp + bodyStr);
    const sig = await crypto.subtle.sign("Ed25519", privateKey, msg);
    const sigHex = Buffer.from(sig).toString("hex");

    return app.request(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature-ed25519": sigHex,
        "x-signature-timestamp": timestamp,
      },
      body: bodyStr,
    });
  }

  it("GET / returns health & status", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.service).toBe("gatekeeper");
    expect(data.status).toBe("ok");
    expect(data.database).toBeDefined();
    expect(data.redis).toBeDefined();
  });

  it("GET /health returns 200 ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
  });

  it("POST /interactions rejects missing signature with 401", async () => {
    const res = await app.request("/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: 1 }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /interactions rejects invalid signature with 401", async () => {
    const res = await app.request("/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature-ed25519": "badbad".repeat(16),
        "x-signature-timestamp": "1234567890",
      },
      body: JSON.stringify({ type: 1 }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /interactions handles PING (type 1) with PONG", async () => {
    const res = await createSignedRequest("/interactions", { type: 1 });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe(1);
  });

  it("POST /interactions handles /ping command (type 2)", async () => {
    const res = await createSignedRequest("/interactions", {
      type: 2,
      data: { name: "ping" },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe(4);
    expect(data.data.content).toContain("Pong");
  });

  it("POST /interactions handles /verify command (unwhitelisted)", async () => {
    const res = await createSignedRequest("/interactions", {
      type: 2,
      guild_id: "test-guild",
      user: { id: "unauthorized-user-999" },
      data: { name: "verify" },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe(4);
    expect(data.data.content).toContain("not on whitelist");
  });

  it("POST /interactions handles /verify command (whitelisted via redis cache)", async () => {
    await redisService.setWhitelistedCache("test-guild", "authorized-user-123", true);
    const res = await createSignedRequest("/interactions", {
      type: 2,
      guild_id: "test-guild",
      user: { id: "authorized-user-123" },
      data: { name: "verify" },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe(4);
    expect(data.data.content).toContain("Verification successful");
  });

  it("GET /dashboard returns RawBlock HTML dashboard", async () => {
    const res = await app.request("/dashboard");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("GATEKEEPER");
    expect(html).toContain("WHITELIST REGISTRY");
    expect(html).toContain("RAWBLOCK ACCESS GATEWAY");
  });

  it("GET /api/whitelist/check verifies user permissions", async () => {
    const res = await app.request("/api/whitelist/check?serverId=test-guild&targetId=authorized-user-123");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.allowed).toBe(true);
  });

  it("POST & DELETE /api/servers manages target server lifecycle", async () => {
    const addRes = await app.request("/api/servers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "temp-guild-99", name: "Temporary Guild" }),
    });
    expect(addRes.status).toBe(200);

    const delRes = await app.request("/api/servers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "temp-guild-99" }),
    });
    expect(delRes.status).toBe(200);
    const delData = await delRes.json();
    expect(delData.success).toBe(true);
  });

  it("DELETE /api/whitelist removes whitelist by server", async () => {
    const delRes = await app.request("/api/whitelist?serverId=temp-guild-99", {
      method: "DELETE",
    });
    expect(delRes.status).toBe(200);
    const data = await delRes.json();
    expect(data.success).toBe(true);
  });

  it("POST /api/rooms/swap-connection validates input parameters", async () => {
    const res = await app.request("/api/rooms/swap-connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("required");
  });

  it("POST /api/rooms/swap-connection handles offline or missing channel safely", async () => {
    const res = await app.request("/api/rooms/swap-connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: "non-existent-room", roleId: "non-existent-role" }),
    });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
