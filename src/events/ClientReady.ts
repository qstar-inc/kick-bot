import {
    ActivityType, channelMention, Collection, Colors, ContainerBuilder, ContainerComponent, Events,
    Message, PermissionsBitField, TextChannel, TextDisplayBuilder, TextDisplayComponent, userMention
} from "discord.js";

import { monitorByChannel, reloadChannels } from "../db/channels.js";
import { setLogger, testConnection } from "../db/main.js";
import { insertSpamUser } from "../db/spammers.js";
import { interact } from "../helpers/interaction.js";
import { postWarning, postWarningText, startSpamScanner } from "../helpers/spammers.js";
import { getTextChannel, sleep } from "../helpers/utils.js";
import { KickBotClient } from "../types/client.js";
import { MonitorChannelRow } from "../types/db.js";
import { BotEvent } from "../types/events.js";
import { botText } from "../variables/botText.js";
import { channelIds } from "../variables/channelId.js";

async function waitForDbConnection(client: KickBotClient) {
  setLogger(client.logger);
  while (true) {
    try {
      await testConnection();
      break;
    } catch {
      console.log("Database not connected, retrying in 2s...");
      await sleep(2000);
    }
  }

  if (!client.user) return;

  console.log(`Ready! Logged in as ${client.user.tag}`);
  await reloadChannels();
  await startChannelCheckup(client);
  await startSpamScanner(client);
}

let running: boolean = false;

export async function startChannelCheckup(client: KickBotClient) {
  setInterval(
    async () => {
      if (running) return;
      running = true;

      try {
        await checkChannels(client);
      } finally {
        running = false;
      }
    },
    60 * 60 * 1000,
  );
}

async function postStartup(client: KickBotClient) {
  const guilds = client.guilds.cache;

  client.user.setActivity(`Bonking spammers in ${guilds.size} servers`, {
    type: ActivityType.Custom,
  });

  if (client.user.id != botText.test_bot_id) {
    let topText = `# ${botText.name} is now online...\n`;
    topText += `-# Active in ${guilds.size} servers\n`;

    if (guilds.size > 0) {
      guilds.sort((a, b) => {
        const aCount = a.members.guild.memberCount || 0;
        const bCount = b.members.guild.memberCount || 0;
        return bCount - aCount;
      });
      guilds.forEach(guild => {
        const sysChId = `${guild.name}`;

        topText += `* ${sysChId} (${
          guild.members.guild.memberCount
        }) by ${userMention(guild.members.guild.ownerId)}\n`;
      });
    }

    const channel = client.channels.cache.get(channelIds.welcome);

    if (!channel || !channel.isSendable()) {
      client.logger.error(
        null,
        `Channel ${channelIds.welcome} is not sendable.`,
      );
      return;
    }

    const container = new ContainerBuilder().setAccentColor(Colors.Blurple);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(topText.trim()),
    );

    await interact({
      mode: "channel",
      channel: channel,
      container: container,
      noMention: true,
    });
  }
}

async function checkChannels(client: KickBotClient) {
  for (const [channelId, config] of monitorByChannel.entries()) {
    await checkPerm(client, channelId, config);
    await checkMessage(client, channelId, config);
  }
}

const REQUIRED_PERMS = [
  PermissionsBitField.Flags.ViewChannel,
  PermissionsBitField.Flags.SendMessages,
  PermissionsBitField.Flags.ManageMessages,
  PermissionsBitField.Flags.KickMembers,
  PermissionsBitField.Flags.ModerateMembers,
];

async function checkPerm(
  client: KickBotClient,
  channelId: string,
  config: MonitorChannelRow,
) {
  const [channel, ok] = await getTextChannel(client, channelId);
  if (!ok || !channel) return;

  const guild = channel.guild;
  const me = guild.members.me;

  if (!me) return;

  const perms = channel.permissionsFor(me);
  if (!perms) return;

  const missing: string[] = [];

  for (const perm of REQUIRED_PERMS) {
    if (!perms.has(perm)) {
      const name = Object.keys(PermissionsBitField.Flags).find(
        key =>
          PermissionsBitField.Flags[
            key as keyof typeof PermissionsBitField.Flags
          ] === perm,
      );

      if (name) missing.push(name);
    }
  }

  let hierarchyIssue = false;

  if (!guild.members.me?.permissions.has(PermissionsBitField.Flags.KickMembers))
    hierarchyIssue = true;

  if (missing.length === 0 && !hierarchyIssue) return;

  const [reportChannel, reportOk] = await getTextChannel(client, config.report);

  if (!reportOk || !reportChannel) return;

  let text = `Permission issue detected for ${channelMention(channelId)}:\n`;

  if (missing.length > 0) text += `- ${missing.join("\n- ")}\n`;

  if (hierarchyIssue)
    text += `- Bot cannot kick members due to role hierarchy.`;

  await reportChannel.send({ content: text }).catch(() => {});
}

async function checkMessage(
  client: KickBotClient,
  channelId: string,
  config: MonitorChannelRow,
) {
  const getChannel = await getTextChannel(client, channelId);
  if (!getChannel[1]) return;

  const channel = getChannel[0] as TextChannel;

  let messages: Collection<string, Message<true>>;
  try {
    messages = await channel.messages.fetch({ limit: 10 });
  } catch {
    return;
  }

  let validWarningMessage: Message | null = null;

  for (const msg of messages.values()) {
    const isBotMessage =
      msg.author.id === client.user?.id || msg.author.id === botText.starq_id;

    const isPrivileged =
      msg.member?.permissions.has(PermissionsBitField.Flags.ManageMessages) ??
      false;

    if (!isBotMessage && !isPrivileged) {
      try {
        await insertSpamUser(
          channel.guild.id,
          msg.author.id,
          msg.content,
          BigInt(msg.createdTimestamp),
        );

        if (msg.member?.kickable) {
          await msg.member.kick("Spam in monitored channel");

          const getReport = await getTextChannel(client, config.report);
          if (getReport[1]) {
            const reportChannel = getReport[0] as TextChannel;

            await interact({
              mode: "channel",
              channel: reportChannel,
              text: `Kicked ${userMention(msg.author.id)} for spamming in ${channelMention(channel.id)}>`,
            });
          }
        }
      } catch (err) {
        client.logger.error(err, "checkChannels-kick");
      } finally {
        if (msg.deletable) await msg.delete().catch(() => {});
      }

      continue;
    }

    if (isBotMessage) {
      const isCompV2 = msg.components.some(row => {
        if (!(row instanceof ContainerComponent)) return false;
        return true;
      });

      let postedText = "";

      const hasTag = isCompV2
        ? msg.components.some(row => {
            if (!(row instanceof ContainerComponent)) return false;

            const r = row as ContainerComponent;

            return r.components.some(rr => {
              if (!(rr instanceof TextDisplayComponent)) return false;
              const content = rr.content;
              postedText = content;
              return content.includes(postWarningText);
            });
          })
        : msg.content.includes(postWarningText);

      if (!isCompV2) postedText = msg.content;

      if (!hasTag && !isCompV2) {
        if (msg.deletable) await msg.delete().catch(() => {});
        continue;
      }

      if (validWarningMessage) {
        if (msg.deletable) await msg.delete().catch(() => {});
        continue;
      }

      validWarningMessage = msg;

      console.log(postedText);
      console.log(postWarningText);
      console.log(postedText !== postWarningText);
      if (postedText !== postWarningText) {
        await interact({
          mode: "edit",
          message: msg,
          text: postWarningText,
        });
      }
    }
  }

  if (!validWarningMessage) {
    await postWarning(channel);
  }
}

const ClientReady: BotEvent = {
  name: Events.ClientReady,
  once: true,
  async execute(client: KickBotClient) {
    await waitForDbConnection(client);
    await postStartup(client);
  },
};

export default ClientReady;
