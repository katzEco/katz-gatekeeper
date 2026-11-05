// ponytail: lightweight discord.js gateway client; handles slash commands & online presence
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageFlags,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
} from "discord.js";
import { config } from "../config";
import { dbService } from "../db";
import { redisService } from "../redis";

export let discordClient: Client | null = null;

export const botState = {
  connected: false,
  tag: null as string | null,
  error: null as string | null,
  guildsCount: 0,
  ping: -1,
};

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

// ponytail: swaps/toggles Connect permission for a role in a target room
export async function swapRoleRoomConnection(
  roomId: string,
  roleId: string
): Promise<{
  success: boolean;
  allowed: boolean;
  roomId: string;
  roomName: string;
  roleId: string;
  roleName?: string;
}> {
  if (!discordClient || !discordClient.isReady()) {
    throw new Error("Discord bot gateway is not connected");
  }

  const channel = await discordClient.channels.fetch(roomId);
  if (!channel || !("permissionOverwrites" in channel)) {
    throw new Error(`Target room ${roomId} not found or unsupported`);
  }

  const guildChannel = channel as any;
  const currentOverwrite = guildChannel.permissionOverwrites.cache.get(roleId);

  // Check if Connect permission is currently allowed
  const currentlyAllowed = currentOverwrite?.allow.has(PermissionFlagsBits.Connect) ?? false;
  const nextAllowed = !currentlyAllowed;

  // Swap Connect permission
  await guildChannel.permissionOverwrites.edit(roleId, {
    Connect: nextAllowed,
  });

  const role = guildChannel.guild?.roles.cache.get(roleId);

  return {
    success: true,
    allowed: nextAllowed,
    roomId,
    roomName: guildChannel.name || roomId,
    roleId,
    roleName: role?.name || roleId,
  };
}

// ponytail: builds brutalist control panel embed and swap button components
export function createControlPanelComponents(
  roomId: string,
  roleId: string,
  allowed: boolean,
  lastUpdatedBy?: string
) {
  const embed = new EmbedBuilder()
    .setColor(allowed ? 0xa6da95 : 0xed8796) // Catppuccin Green or Red
    .setTitle("🛡️ GATEKEEPER // ROOM ACCESS CONTROLLER")
    .setDescription("Interactive connection access panel. Click the button below to toggle role connection permission.")
    .addFields(
      { name: "Target Room", value: `<#${roomId}>`, inline: true },
      { name: "Controlled Role", value: `<@&${roleId}>`, inline: true },
      { name: "Connection Access", value: allowed ? "✅ **ALLOWED**" : "⛔ **DENIED**", inline: true },
      ...(lastUpdatedBy
        ? [{ name: "Last Toggled By", value: `${lastUpdatedBy}` }]
        : [{ name: "Status", value: "Ready for access control" }])
    )
    .setFooter({ text: "Gatekeeper Access Gateway • RawBlock Control" })
    .setTimestamp();

  const button = new ButtonBuilder()
    .setCustomId(`swap_conn:${roomId}:${roleId}`)
    .setLabel(allowed ? "LOCK ROOM (DENY ACCESS)" : "UNLOCK ROOM (ALLOW ACCESS)")
    .setEmoji(allowed ? "🔒" : "🔓")
    .setStyle(allowed ? ButtonStyle.Danger : ButtonStyle.Success);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

  return { embed, row };
}

export async function startDiscordBot(): Promise<Client | null> {
  const token = config.discord.token;
  if (!token) {
    console.warn("Notice: DISCORD_TOKEN not configured. Web dashboard running only.");
    return null;
  }

  if (discordClient) {
    return discordClient;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once(Events.ClientReady, () => {
    botState.connected = true;
    botState.tag = client.user?.tag || null;
    botState.guildsCount = client.guilds.cache.size;
    botState.ping = client.ws.ping;
    botState.error = null;
    console.log(`🤖 Discord Bot connected as ${client.user?.tag} (Gateway ONLINE)`);
  });

  client.on(Events.Error, (err) => {
    botState.connected = false;
    botState.error = err.message;
    console.error("Discord Client error:", err.message);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    // Handle Interactive Button Clicks (Swap Connection)
    if (interaction.isButton()) {
      const { customId, user } = interaction;
      if (customId.startsWith("swap_conn:")) {
        const [, roomId, roleId] = customId.split(":");
        try {
          const res = await swapRoleRoomConnection(roomId, roleId);
          const { embed, row } = createControlPanelComponents(
            roomId,
            roleId,
            res.allowed,
            `<@${user.id}> at <t:${Math.floor(Date.now() / 1000)}:T>`
          );

          await interaction.update({
            embeds: [embed],
            components: [row],
          });
        } catch (err: any) {
          await interaction.reply({
            content: `❌ Error toggling room access: ${err.message}`,
            flags: MessageFlags.Ephemeral,
          });
        }
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;
    const { commandName, guildId, user } = interaction;
    const currentGuild = guildId || "global";

    try {
      if (commandName === "ping") {
        const ping = client.ws.ping;
        await interaction.reply({
          content: `🏓 Pong! Gateway Latency: \`${ping}ms\` | Gatekeeper operational.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (commandName === "gatekeeper") {
        await interaction.reply({
          content: `🛡️ **Gatekeeper Status**\n• Bot: \`${client.user?.tag}\`\n• Server: \`${currentGuild}\`\n• Database: \`Postgres:5431/gatekeeper\`\n• Cache: \`Redis:6380\``,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (commandName === "verify") {
        const allowed = await isAllowed(currentGuild, user.id);
        if (allowed) {
          await interaction.reply({
            content: `✅ **Verification Successful**\nWelcome <@${user.id}>! You are verified on the Gatekeeper whitelist.`,
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.reply({
            content: `⛔ **Verification Denied**\nUser <@${user.id}> is not authorized on the whitelist for this server.`,
            flags: MessageFlags.Ephemeral,
          });
        }
        return;
      }

      if (commandName === "swap-connection") {
        const room = interaction.options.getChannel("room", true);
        const role = interaction.options.getRole("role", true);

        try {
          const res = await swapRoleRoomConnection(room.id, role.id);
          const statusText = res.allowed ? "✅ ALLOWED" : "⛔ DENIED";
          await interaction.reply({
            content: `🔄 **Connection Permission Swapped**\n• Room: <#${room.id}>\n• Role: <@&${role.id}>\n• Access: **${statusText}**`,
            flags: MessageFlags.Ephemeral,
          });
        } catch (err: any) {
          await interaction.reply({
            content: `❌ Failed to swap connection: ${err.message}`,
            flags: MessageFlags.Ephemeral,
          });
        }
        return;
      }

      if (commandName === "control-room") {
        const targetRoom = interaction.options.getChannel("target_room", true);
        const role = interaction.options.getRole("role", true);

        // Check current permission state
        const guildChannel = targetRoom as any;
        const currentOverwrite = guildChannel.permissionOverwrites?.cache?.get(role.id);
        const currentlyAllowed = currentOverwrite?.allow?.has?.(PermissionFlagsBits.Connect) ?? false;

        // Upsert room in database
        if (guildId) {
          dbService
            .upsertRoom({
              id: targetRoom.id,
              serverId: guildId,
              name: targetRoom.name || targetRoom.id,
              type: "voice",
            })
            .catch(() => {});
        }

        const { embed, row } = createControlPanelComponents(
          targetRoom.id,
          role.id,
          currentlyAllowed
        );

        await interaction.reply({
          embeds: [embed],
          components: [row],
        });
        return;
      }

      if (commandName === "help") {
        await interaction.reply({
          content:
            "🛡️ **Gatekeeper Commands**\n• `/ping` - Latency check\n• `/gatekeeper` - Diagnostics\n• `/verify` - User whitelist check\n• `/swap-connection` - Toggle role room connection\n• `/control-room` - Post interactive room controller panel with button\n• `/help` - Command list",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    } catch (err: any) {
      console.error(`Error executing command ${commandName}:`, err.message);
    }
  });

  try {
    await client.login(token);
    discordClient = client;

    // Await ready handshake with 5s timeout
    if (!client.isReady()) {
      await Promise.race([
        new Promise<void>((resolve) => client.once(Events.ClientReady, () => resolve())),
        new Promise<void>((resolve) => setTimeout(resolve, 5000)),
      ]);
    }

    return client;
  } catch (err: any) {
    botState.connected = false;
    botState.error = err.message;
    console.error("Failed to connect Discord bot:", err.message);
    return null;
  }
}
