const { Collection, Events, MessageFlags } = require("discord.js");
const messages = require("../messages");
const { botText } = require("../botText");
const { postErrors } = require("../utils_functions");
const admin = [botText.starq_id /* StarQ */];

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      return interaction.reply({
        content: messages.command_not_found(interaction.commandName),
        flags: MessageFlags.Ephemeral,
      });
    }
    if (!admin.includes(interaction.user.id)) {
      const { cooldowns } = interaction.client;

      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
      }

      const now = Date.now();
      const timestamps = cooldowns.get(command.data.name);
      const defaultCooldownDuration = 3;
      const cooldownAmount =
        (command.cooldown ?? defaultCooldownDuration) * 1_000;

      if (timestamps.has(interaction.user.id)) {
        const expirationTime =
          timestamps.get(interaction.user.id) + cooldownAmount;

        if (now < expirationTime) {
          return interaction.reply({
            content: messages.cooldown(
              command.data.name,
              `${cooldownAmount / 1_000} seconds`
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
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      await postErrors(error);
      if (interaction.replied || interaction.deferred) {
        await interaction
          .followUp({
            content: messages.critical,
            flags: MessageFlags.Ephemeral,
          })
          .catch(async (error) => {
            await postErrors(error);
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
