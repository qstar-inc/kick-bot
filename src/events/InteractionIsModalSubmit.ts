import { Events, MessageFlags, ModalSubmitInteraction } from "discord.js";

import { KickBotClient } from "../types/client.js";
import { BotEvent } from "../types/events.js";
import { messages } from "../variables/messages.js";

const InteractionIsModalSubmit: BotEvent = {
  name: Events.InteractionCreate,
  async execute(interaction: ModalSubmitInteraction) {
    if (!interaction.isModalSubmit()) return;

    const client = interaction.client as KickBotClient;
    let command = null;

    if (interaction.customId.startsWith("manage-")) {
      command = client.commands.get("manage");
    }

    if (!command) {
      return interaction.reply({
        content: messages.command_not_found(interaction.customId),
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await command.execute(interaction);
    } catch (error) {
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
    }
  },
};

export default InteractionIsModalSubmit;
