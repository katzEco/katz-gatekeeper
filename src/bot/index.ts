// Entry point for bun run bot: runs Hono server + Discord Gateway bot
import server from "../index";
import { startDiscordBot } from "./discord";

startDiscordBot().catch((err) => {
  console.warn("Discord gateway notice:", err.message);
});

export default server;
