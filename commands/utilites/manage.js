const {
  SlashCommandBuilder,
  MessageFlags,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");
const db = require("../../db");
const { botText } = require("../../botText");

module.exports = {
  category: "utilities",
  data: new SlashCommandBuilder()
    .setName("manage")
    .setDescription("Manage channel to monitor")
    .addChannelOption((option) =>
      option
        .setName("monitor")
        .setDescription("Select the channel to monitor")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .addChannelOption((option) =>
      option
        .setName("report")
        .setDescription("Select the channel to report to")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const monitorChannel = interaction.options.getChannel("monitor");
    const reportChannel = interaction.options.getChannel("report");

    const hasAdminPermission = interaction.memberPermissions.has(
      PermissionsBitField.Flags.Administrator
    );
    if (!interaction.user.id == botText.starq_id || !hasAdminPermission) {
      await interaction.followUp(messages.unauthorizedAdmin);
      return;
    }

    let content;
    let posted = false;
    const permissions = monitorChannel.permissionsFor(
      interaction.guild.members.me
    );
    const hasPermission =
      permissions.has(PermissionsBitField.Flags.SendMessages) &&
      permissions.has(PermissionsBitField.Flags.ViewChannel);

    if (!hasPermission) {
      content = `I do not have permission to send messages in <#${channelId}>.`;
    } else {
      var server = await db.getChannelMonitorServer(monitorChannel.guild.id);
      if (server == null) {
        posted = true;
        content = `### <#${monitorChannel.id}> is now being monitored. <#${reportChannel.id}> will be used for reporting back.`;
        await db.addChannelMonitor(
          monitorChannel.guild.id,
          monitorChannel.id,
          reportChannel.id
        );
      } else {
        content = `Another channel is already set.`;
      }

      if (posted) {
        await monitorChannel
          .send({
            content: `# WARNING: WRITING ANYTHING IN THIS CHANNEL WILL RESULT YOU GETTING KICKED FROM THE SERVER`,
          })
          .catch((error) => {
            console.error(error);
          });
        await reportChannel
          .send({
            content: `Assigned this channel for reporting back`,
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }

    await interaction.followUp({
      content: content,
    });
  },
};
