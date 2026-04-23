import {
    channelMention, Events, Message, PermissionsBitField, TextChannel, userMention
} from "discord.js";

import { monitorByChannel } from "../db/channels.js";
import { insertSpamUser } from "../db/spammers.js";
import { interact } from "../helpers/interaction.js";
import { kickSpammers } from "../helpers/spammers.js";
import { getTextChannel } from "../helpers/utils.js";
import { KickBotClient } from "../types/client.js";
import { BotEvent } from "../types/events.js";
import { botText } from "../variables/botText.js";

const processingUsers = new Set<string>();

const MessageCreate: BotEvent = {
  name: Events.MessageCreate,
  async execute(message: Message<true>) {
    if (!message.inGuild()) return;
    if (
      message.author.bot ||
      message.author.id === botText.starq_id ||
      message.member?.permissions.has(PermissionsBitField.Flags.ManageMessages)
    )
      return;

    const config = monitorByChannel.get(message.channel.id);
    if (!config) return;

    if (processingUsers.has(message.author.id)) return;
    processingUsers.add(message.author.id);

    const client = message.client as KickBotClient;

    try {
      await insertSpamUser(
        message.guild.id,
        message.author.id,
        message.content,
        BigInt(message.createdTimestamp),
      );

      if (message.member?.kickable) {
        try {
          await message.member.kick("Spam in monitored channel");
        } catch (error) {
          client.logger.error(error, "MessageCreate");
        }

        const getReport = await getTextChannel(client, config.report);
        if (!getReport[1]) return;

        const reportChannel = getReport[0] as TextChannel;

        await interact({
          mode: "channel",
          channel: reportChannel,
          text: `Kicked user ${userMention(message.author.id)} for spamming in ${channelMention(config.monitor)}`,
        });
      }
    } finally {
      processingUsers.delete(message.author.id);
      if (message.deletable) await message.delete();
      await kickSpammers(client);
    }
  },
};

export default MessageCreate;
