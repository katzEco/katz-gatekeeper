// ponytail: register slash commands with Discord REST API using standard fetch
const appId = process.env.DISCORD_APPLICATION_ID;
const token = process.env.DISCORD_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;

if (!appId || !token) {
  console.error("Error: DISCORD_APPLICATION_ID and DISCORD_TOKEN must be set in .env");
  process.exit(1);
}

const commands = [
  {
    name: "ping",
    description: "Check bot latency and health",
  },
  {
    name: "gatekeeper",
    description: "Check Gatekeeper bot status",
  },
  {
    name: "verify",
    description: "Verify user access",
  },
  {
    name: "help",
    description: "Show Gatekeeper command help",
  },
];

const url = guildId
  ? `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`
  : `https://discord.com/api/v10/applications/${appId}/commands`;

console.log(`Registering ${commands.length} commands (${guildId ? `guild ${guildId}` : "global"})...`);

const res = await fetch(url, {
  method: "PUT",
  headers: {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(commands),
});

if (!res.ok) {
  const errorText = await res.text();
  console.error(`Failed to register commands (${res.status}):`, errorText);
  process.exit(1);
}

const data = (await res.json()) as any[];
console.log(`Successfully registered ${data.length} commands.`);
