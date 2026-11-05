// ponytail: native Bun.RedisClient, zero npm dependencies
import { config } from "./config";

export const redis = new Bun.RedisClient(config.redisUrl);

export const redisService = {
  async ping(): Promise<boolean> {
    try {
      const res = await redis.ping();
      return res === "PONG";
    } catch {
      return false;
    }
  },

  async isWhitelistedCached(serverId: string, targetId: string): Promise<boolean | null> {
    try {
      const val = await redis.get(`gatekeeper:whitelist:${serverId}:${targetId}`);
      if (val === null) return null;
      return val === "1";
    } catch {
      return null;
    }
  },

  async setWhitelistedCache(
    serverId: string,
    targetId: string,
    allowed: boolean,
    ttlSeconds = 300
  ): Promise<void> {
    try {
      await redis.set(
        `gatekeeper:whitelist:${serverId}:${targetId}`,
        allowed ? "1" : "0",
        "EX",
        String(ttlSeconds)
      );
    } catch (err) {
      console.warn("Redis cache set failed:", err);
    }
  },

  async invalidateWhitelist(serverId: string, targetId: string): Promise<void> {
    try {
      await redis.del(`gatekeeper:whitelist:${serverId}:${targetId}`);
    } catch (err) {
      console.warn("Redis cache invalidate failed:", err);
    }
  },

  async invalidateServer(serverId: string): Promise<void> {
    try {
      const keys = (await redis.keys(`gatekeeper:whitelist:${serverId}:*`)) as string[];
      if (keys && keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (err) {
      console.warn("Redis invalidateServer failed:", err);
    }
  },
};
