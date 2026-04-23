import {
    BaseInteraction, ContainerBuilder, Message, MessageFlags, SendableChannels
} from "discord.js";

import { createTextContainer } from "./componentsV2.js";

type InteractionPayload =
  | {
      mode: "interaction";
      interaction: BaseInteraction;
      text: string;
      ephemeral?: boolean;
      followUp?: boolean;
    }
  | {
      mode: "channel";
      channel: SendableChannels;
      container?: ContainerBuilder;
      text?: string;
      noMention?: boolean;
    }
  | {
      mode: "edit";
      message: Message;
      container?: ContainerBuilder;
      text?: string;
    };

export async function interact(payload: InteractionPayload): Promise<boolean> {
  try {
    if (payload.mode === "interaction") {
      const {
        interaction,
        text,
        ephemeral = false,
        followUp = false,
      } = payload;

      const options = {
        components: [createTextContainer(text)],
        flags:
          MessageFlags.IsComponentsV2 +
          (ephemeral ? MessageFlags.Ephemeral : 0),
      };

      if (interaction.isCommand()) {
        if (followUp || interaction.replied || interaction.deferred) {
          await interaction.followUp(options);
        } else {
          await interaction.reply(options);
        }
      }

      if (interaction.isModalSubmit()) {
        await interaction.reply(options);
      }

      return true;
    }

    if (payload.mode === "channel") {
      const { channel, container, text, noMention = false } = payload;

      const options: any = {
        components: [
          container ?? (text ? createTextContainer(text) : undefined),
        ].filter(Boolean),

        flags: MessageFlags.IsComponentsV2,
        allowedMentions: noMention ? { parse: [] } : undefined,
      };

      await channel.send(options);
      return true;
    }

    if (payload.mode === "edit") {
      const { message, container, text } = payload;

      const options: any = {
        components: [
          container ?? (text ? createTextContainer(text) : undefined),
        ].filter(Boolean),

        flags: MessageFlags.IsComponentsV2,
      };

      await message.edit(options);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Discord send failed:", error);
    return false;
  }
}
