// ponytail: central config reading from process.env with ecosystem defaults
export const config = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl:
    process.env.DATABASE_URL || "postgres://dethz:dethz198@localhost:5431/gatekeeper",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6380",
  discord: {
    applicationId: process.env.DISCORD_APPLICATION_ID || "",
    publicKey: process.env.DISCORD_PUBLIC_KEY || "",
    token: process.env.DISCORD_TOKEN || "",
    guildId: process.env.DISCORD_GUILD_ID || "",
  },
};
