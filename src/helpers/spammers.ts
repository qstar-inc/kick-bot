import {
    ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, channelMention,
    DiscordAPIError, Guild, GuildChannel, MessageActionRowComponentBuilder, PermissionFlagsBits,
    PermissionsBitField, SendableChannels, TextChannel, userMention
} from "discord.js";

import { monitorByGuild } from "../db/channels.js";
import { getSpammersToProcess, markProcessed } from "../db/spammers.js";
import { chunkArray, getErrorMessage, getTextChannel } from "../helpers/utils.js";
import { KickBotClient } from "../types/client.js";
import { SpamUserRow } from "../types/db.js";
import { createTextContainer } from "./componentsV2.js";
import { interact } from "./interaction.js";

let running: boolean = false;

export async function startSpamScanner(client: KickBotClient) {
  setInterval(
    async () => {
      if (running) return;
      running = true;

      try {
        await kickSpammers(client);
      } finally {
        running = false;
      }
    },
    0.25 * 60 * 1000,
  ); // every 15 seconds
}

export async function kickSpammers(client: KickBotClient) {
  const functionName = kickSpammers.name;
  try {
    const allSpammers = await getSpammersToProcess();

    await Promise.allSettled(
      allSpammers.map(spammer => processSpammer(client, spammer, functionName)),
    );
  } catch (error) {
    client.logger.error(error);
  }
}

async function processSpammer(
  client: KickBotClient,
  spammer: SpamUserRow,
  functionName: string,
) {
  const serverConfig = monitorByGuild.get(spammer.server);

  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

  if (!serverConfig) {
    client.logger.error(
      new Error(`Server config not found ${spammer.server}`),
      functionName,
    );
    return;
  }

  const getMonitor = await getTextChannel(client, serverConfig.monitor);
  if (!getMonitor[1]) return;

  const monitorChannel = getMonitor[0] as TextChannel;

  const getReport = await getTextChannel(client, serverConfig.report);
  if (!getReport[1]) return;

  const reportChannel = getReport[0] as TextChannel;

  if (!monitorChannel.isSendable() || !reportChannel.isSendable()) {
    const errorText = `Server config is wrong for ${spammer.server}\nmonitorChannel: ${channelMention(monitorChannel.id)} (${monitorChannel.isSendable() ? "" : "No access"}), reportChannel: ${channelMention(reportChannel.id)} (${reportChannel.isSendable() ? "" : "No access"})`;
    client.logger.error(new Error(errorText), functionName);
    if (reportChannel.isSendable()) {
      await interact({
        mode: "channel",
        channel: reportChannel,
        text: errorText,
      });
    }
    return;
  }

  let server = client.guilds.cache.get(spammer.server);
  if (!server) {
    server = await client.guilds.fetch(spammer.server);
    if (!server) return;
  }

  const channels = await server.channels.fetch();

  const me = server.members.me ?? (await server.members.fetchMe());

  const textChannels = channels.filter(ch => {
    if (!ch || !ch.isTextBased() || !ch.isSendable()) return false;

    const perms = ch.permissionsFor(me);
    return perms?.has("ViewChannel");
  });

  const channelList = [...textChannels.values()];
  const chunks = chunkArray(channelList, 5);

  for (const chunk of chunks) {
    await Promise.allSettled(
      chunk.map(async channel => {
        const ch = channel as TextChannel;

        try {
          if (
            !ch
              .permissionsFor(client.user)
              ?.has(PermissionsBitField.Flags.ViewChannel)
          ) {
            console.log(
              `Bot does not have permission to view the channel ${channel?.id} in ${channel?.guild.name}`,
            );
            return;
          }

          const messages = await ch.messages.fetch({ limit: 20 });
          const toDelete = messages.filter(
            m =>
              m.deletable &&
              m.author.id === spammer.user &&
              m.createdTimestamp > tenMinutesAgo,
          );

          await Promise.allSettled(toDelete.map(m => m.delete()));
        } catch (error) {
          client.logger.error(error);
        }
      }),
    );
  }

  await Promise.allSettled(
    [...monitorByGuild.values()].map(async perServerConfig => {
      if (perServerConfig.id == serverConfig.id) return;

      const getReport = await getTextChannel(client, perServerConfig.report);
      if (!getReport[1]) return;

      const serverReport = getReport[0] as TextChannel;

      if (!serverReport.isSendable()) return;

      const guild = await client.guilds
        .fetch(perServerConfig.server)
        .catch(() => null);
      if (!guild) return;

      const member = await guild.members.fetch(spammer.user).catch(() => null);
      if (!member) return;

      const me = client.user ?? (await server.members.fetchMe());

      const perms = serverReport.permissionsFor(me);
      if (!perms?.has("ViewChannel")) return;

      const button = new ButtonBuilder()
        .setStyle(ButtonStyle.Danger)
        .setCustomId(`kick-${perServerConfig.id}-${spammer.id}`)
        .setLabel("Kick user?");

      const container = createTextContainer(
        `User ${userMention(spammer.user)} was found posting on a monitored channel on a different server. Would you like to kick them from this server?`,
      ).addActionRowComponents(
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
          button,
        ),
      );

      await interact({
        mode: "channel",
        container,
        channel: serverReport,
      });
    }),
  );

  await markProcessed(spammer.id);
}

export async function postWarning(monitorChannel: SendableChannels) {
  const messages = await monitorChannel.messages.fetch({ limit: 10 });
  const existingWarning = messages.find(
    msg => msg.author.id === monitorChannel.client.user?.id,
  );

  if (existingWarning) {
    await interact({
      mode: "edit",
      message: existingWarning,
      text: postWarningText,
    });
  } else {
    await interact({
      mode: "channel",
      channel: monitorChannel,
      text: postWarningText,
    });
  }
}

export const postWarningText = `## Do NOT send messages in this channel.
**ANY MESSAGES RESULTS IN AN IMMEDIATE KICK.**`;

export async function kickSpammer(
  client: KickBotClient,
  interaction: ButtonInteraction,
) {
  const [_, __, spammerId] = interaction.customId.split("-");

  if (!spammerId) return;

  const guild = interaction.guild as Guild;
  const member = await guild.members.fetch(spammerId).catch(() => null);
  if (!member) return;

  let text;
  if (!member?.kickable) {
    text = `User ${userMention(spammerId)} was kicked following recent infraction on other server!`;
  } else {
    try {
      await member.kick("Spam in monitored channel");
      text = `User ${userMention(spammerId)} was kicked following recent infraction on other server!`;
    } catch (error) {
      client.logger.error(error, "Failed kick");
      text = `Failed to kick ${userMention(spammerId)}\nError Code: ${getErrorMessage(error)}`;
    }
  }

  const container = createTextContainer(text);

  await interact({
    mode: "edit",
    container,
    message: interaction.message,
  });
}
