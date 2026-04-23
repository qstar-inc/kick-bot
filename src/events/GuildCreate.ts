import {
    ContainerBuilder, Events, Guild, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder,
    userMention
} from "discord.js";

import { interact } from "../helpers/interaction.js";
import { KickBotClient } from "../types/client.js";
import { BotEvent } from "../types/events.js";
import { channelIds } from "../variables/channelId.js";

const GuildCreate: BotEvent = {
  name: Events.GuildCreate,
  async execute(guild: Guild) {
    const client = guild.client as KickBotClient;
    try {
      const container = new ContainerBuilder();

      let link = `[Link](https://discord.com/channels/${guild.id}/)`;
      const memberNum = guild.approximateMemberCount ?? guild.memberCount;

      const textDisplay = new TextDisplayBuilder().setContent(
        `-# I just joined a new server
### ${guild.name} : ${link}
> **${memberNum}** members | Owner: ${userMention(guild.ownerId)}`,
      );

      const iconURL = guild.iconURL();

      if (iconURL) {
        container.addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(textDisplay)
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(`${iconURL}`)),
        );
      } else {
        container.addTextDisplayComponents(textDisplay);
      }

      const channel = client.channels.cache.get(channelIds.welcome);

      if (!channel || !channel.isSendable()) {
        client.logger.error(
          new Error(`Channel ${channelIds.serverJoin} is not sendable.`),
          "GuildCreate",
        );
        return;
      }

      await interact({
        mode: "channel",
        channel: channel,
        container: container,
        noMention: true,
      });
    } catch (error) {
      client.logger.error(error, "GuildCreate");
    }
  },
};

export default GuildCreate;
