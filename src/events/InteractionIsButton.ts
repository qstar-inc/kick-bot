import { ButtonInteraction, Events, MessageFlags } from "discord.js";

import { kickSpammer, kickSpammers } from "../helpers/spammers.js";
import { KickBotClient } from "../types/client.js";
import { BotEvent } from "../types/events.js";
import { messages } from "../variables/messages.js";

const InteractionIsButton: BotEvent = {
  name: Events.InteractionCreate,
  async execute(interaction: ButtonInteraction) {
    if (!interaction.isButton()) return;
    const client = interaction.client as KickBotClient;

    let command = null;

    if (interaction.customId.startsWith("manage-")) {
      command = client.commands.get("manage");
    } else if (interaction.customId.startsWith("kick-")) {
      await kickSpammer(client, interaction);
    }

    if (!command) {
      await interaction.reply({
        content: messages.command_not_found(interaction.customId),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      await client.logger.error(error);
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: messages.critical,
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.reply({
            content: messages.critical,
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch (error) {
        client.logger.error(error, "InteractionIsButton");
      }
    }
  },
};

export default InteractionIsButton;
