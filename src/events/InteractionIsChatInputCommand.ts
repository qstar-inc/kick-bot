import { ChatInputCommandInteraction, Collection, Events, MessageFlags } from "discord.js";

import { KickBotClient } from "../types/client.js";
import { BotEvent } from "../types/events.js";
import { botText } from "../variables/botText.js";
import { messages } from "../variables/messages.js";

const admin = [botText.starq_id /* StarQ */];

const InteractionIsChatInputCommand: BotEvent = {
  name: Events.InteractionCreate,
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.isChatInputCommand()) return;
    const client = interaction.client as KickBotClient;

    const command = client.commands.get(interaction.commandName) as any;

    if (!command) {
      return interaction.reply({
        content: messages.command_not_found(interaction.commandName),
        flags: MessageFlags.Ephemeral,
      });
    }
    if (!admin.includes(interaction.user.id)) {
      const { cooldowns } = client;

      let timestamps =
        cooldowns.get(command.data.name) ?? new Collection<string, number>();

      cooldowns.set(command.data.name, timestamps);

      const now = Date.now();
      const cooldownAmount = (command.cooldown ?? 3) * 1_000;

      const lastUsed = timestamps.get(interaction.user.id);

      if (lastUsed) {
        const expirationTime = lastUsed + cooldownAmount;

        if (now < expirationTime) {
          return interaction.reply({
            content: messages.cooldown(
              command.data.name,
              `${cooldownAmount / 1_000} seconds`,
            ),
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
    }

    if (!admin.includes(interaction.user.id) && command.data.name == "reload") {
      await interaction.reply({
        content: messages.unauthorized,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      await client.logger.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction
          .followUp({
            content: messages.critical,
            flags: MessageFlags.Ephemeral,
          })
          .catch(async (error: any) => {
            await client.logger.error(error);
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

export default InteractionIsChatInputCommand;
