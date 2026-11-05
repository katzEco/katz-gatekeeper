import { describe, it, expect, beforeAll } from "bun:test";
import { app } from "../src/index";
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
});
