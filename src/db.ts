// ponytail: native Bun.SQL for Postgres, zero ORM dependencies
import { SQL } from "bun";
import { config } from "./config";

export const sql = new SQL(config.databaseUrl, { max: 5 });

export interface ServerRecord {
  id: string;
  name: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoomRecord {
  id: string;
  server_id: string;
  name: string;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface WhitelistRecord {
  id: number;
  server_id: string;
  target_id: string;
  target_type: "user" | "role";
  reason?: string | null;
  created_at: string;
}

async function ensureDatabaseExists(dbUrl: string): Promise<void> {
  const url = new URL(dbUrl);
  const targetDb = url.pathname.replace(/^\//, "");
  if (!targetDb || targetDb === "postgres") return;

  const tryCreateOn = async (maintenanceDb: string) => {
    url.pathname = `/${maintenanceDb}`;
    const admin = new SQL(url.toString());
    try {
      const rows = (await admin`SELECT 1 FROM pg_database WHERE datname = ${targetDb}`) as any[];
      if (rows.length === 0 && /^[a-zA-Z0-9_]+$/.test(targetDb)) {
        await admin.unsafe(`CREATE DATABASE ${targetDb}`);
      }
    } finally {
      await admin.close();
    }
  };

  try {
    await tryCreateOn("postgres");
  } catch {
    try {
      await tryCreateOn("app");
    } catch {
      // Ignore if permission denied or manually created
    }
  }
}

let dbInitialized = false;

export async function initDb(): Promise<void> {
  if (dbInitialized) return;
  await ensureDatabaseExists(config.databaseUrl);

  await sql`
    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'general',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS whitelist (
      id SERIAL PRIMARY KEY,
      server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL,
      target_type TEXT NOT NULL DEFAULT 'user',
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(server_id, target_id)
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_rooms_server_id ON rooms(server_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_whitelist_server_target ON whitelist(server_id, target_id);`;
  dbInitialized = true;
}

export const dbService = {
  // Servers
  async getAllServers(): Promise<ServerRecord[]> {
    const rows = await sql`SELECT * FROM servers ORDER BY name ASC`;
    return rows as unknown as ServerRecord[];
  },

  async getServer(id: string): Promise<ServerRecord | null> {
    const rows = await sql`SELECT * FROM servers WHERE id = ${id} LIMIT 1`;
    return ((rows as any[])[0] as unknown as ServerRecord) || null;
  },

  async upsertServer(params: { id: string; name: string; enabled?: boolean }): Promise<ServerRecord> {
    const enabled = params.enabled ?? true;
    const now = new Date().toISOString();
    const rows = await sql`
      INSERT INTO servers (id, name, enabled, created_at, updated_at)
      VALUES (${params.id}, ${params.name}, ${enabled}, ${now}, ${now})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        enabled = EXCLUDED.enabled,
        updated_at = EXCLUDED.updated_at
      RETURNING *;
    `;
    return (rows as any[])[0] as unknown as ServerRecord;
  },

  async removeServer(id: string): Promise<boolean> {
    const res = await sql`
      DELETE FROM servers
      WHERE id = ${id}
      RETURNING id;
    `;
    return (res as any[]).length > 0;
  },

  // Rooms
  async getRooms(serverId?: string): Promise<RoomRecord[]> {
    if (serverId) {
      const rows = await sql`SELECT * FROM rooms WHERE server_id = ${serverId} ORDER BY name ASC`;
      return rows as unknown as RoomRecord[];
    }
    const rows = await sql`SELECT * FROM rooms ORDER BY server_id, name ASC`;
    return rows as unknown as RoomRecord[];
  },

  async upsertRoom(params: {
    id: string;
    serverId: string;
    name: string;
    type?: string;
  }): Promise<RoomRecord> {
    const type = params.type || "general";
    const now = new Date().toISOString();
    const rows = await sql`
      INSERT INTO rooms (id, server_id, name, type, created_at, updated_at)
      VALUES (${params.id}, ${params.serverId}, ${params.name}, ${type}, ${now}, ${now})
      ON CONFLICT (id) DO UPDATE SET
        server_id = EXCLUDED.server_id,
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        updated_at = EXCLUDED.updated_at
      RETURNING *;
    `;
    return (rows as any[])[0] as unknown as RoomRecord;
  },

  // Whitelist
  async getWhitelist(serverId?: string): Promise<WhitelistRecord[]> {
    if (serverId) {
      const rows = await sql`SELECT * FROM whitelist WHERE server_id = ${serverId} ORDER BY created_at DESC`;
      return rows as unknown as WhitelistRecord[];
    }
    const rows = await sql`SELECT * FROM whitelist ORDER BY created_at DESC`;
    return rows as unknown as WhitelistRecord[];
  },

  async isWhitelisted(serverId: string, targetId: string): Promise<boolean> {
    const rows = await sql`
      SELECT 1 FROM whitelist
      WHERE server_id = ${serverId} AND target_id = ${targetId}
      LIMIT 1;
    `;
    return (rows as any[]).length > 0;
  },

  async addWhitelist(params: {
    serverId: string;
    targetId: string;
    targetType?: "user" | "role";
    reason?: string;
  }): Promise<WhitelistRecord> {
    const targetType = params.targetType || "user";
    const reason = params.reason || null;
    const now = new Date().toISOString();
    const rows = await sql`
      INSERT INTO whitelist (server_id, target_id, target_type, reason, created_at)
      VALUES (${params.serverId}, ${params.targetId}, ${targetType}, ${reason}, ${now})
      ON CONFLICT (server_id, target_id) DO UPDATE SET
        target_type = EXCLUDED.target_type,
        reason = EXCLUDED.reason
      RETURNING *;
    `;
    return (rows as any[])[0] as unknown as WhitelistRecord;
  },

  async removeWhitelist(serverId: string, targetId: string): Promise<boolean> {
    const res = await sql`
      DELETE FROM whitelist
      WHERE server_id = ${serverId} AND target_id = ${targetId}
      RETURNING id;
    `;
    return (res as any[]).length > 0;
  },

  async removeWhitelistByServer(serverId: string): Promise<number> {
    const res = await sql`
      DELETE FROM whitelist
      WHERE server_id = ${serverId}
      RETURNING id;
    `;
    return (res as any[]).length;
  },
};
