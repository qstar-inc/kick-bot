import {
    ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, channelMention,
    ChannelSelectMenuBuilder, ChannelType, CommandInteraction, ContainerBuilder, Guild,
    GuildChannel, GuildMember, LabelBuilder, MessageActionRowComponentBuilder, MessageFlags,
    ModalBuilder, PermissionsBitField, SlashCommandBuilder, TextDisplayBuilder, userMention
} from "discord.js";

import { monitorByGuild, reloadChannels, upsertMonitorChannel } from "../../db/channels.js";
import { startChannelCheckup } from "../../events/ClientReady.js";
import { interact } from "../../helpers/interaction.js";
import { postWarning } from "../../helpers/spammers.js";
import { client } from "../../index.js";
import { KickBotClient } from "../../types/client.js";
import { BotSlashCommand } from "../../types/slashCommand.js";
import { botText } from "../../variables/botText.js";
import { messages } from "../../variables/messages.js";

const Manage: BotSlashCommand = {
  category: "utilities",
  data: new SlashCommandBuilder()
    .setName("manage")
    .setDescription("Manage channel to monitor"),
  async execute(interaction) {
    try {
      if (!interaction.inGuild()) {
        await interact({
          mode: "interaction",
          interaction,
          text: `This command can only be used from a server`,
          ephemeral: true,
        });
        return;
      }

      if (interaction.isChatInputCommand()) {
        if (!interaction.memberPermissions) {
          await interact({
            mode: "interaction",
            interaction,
            text: messages.unauthorizedAdmin,
            ephemeral: true,
          });
          return;
        }

        const hasAdminPermission = interaction.memberPermissions.has(
          PermissionsBitField.Flags.ManageMessages,
        );

        if (interaction.user.id !== botText.starq_id && !hasAdminPermission) {
          await interact({
            mode: "interaction",
            interaction,
            text: messages.unauthorizedAdmin,
            ephemeral: true,
          });
          return;
        }

        const server = monitorByGuild.get(interaction.guild?.id!);

        if (server) {
          const container = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## This server already has bot configurations set.
By continuing, existing configuration will be replaced with new selections made in the next screen.
Current configuration: monitor <#${server.monitor}> and report to <#${server.report}>`,
              ),
            )
            .addActionRowComponents(
              new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
                new ButtonBuilder()
                  .setCustomId("manage-continue")
                  .setLabel("Continue")
                  .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                  .setCustomId("manage-disable")
                  .setLabel("Delete")
                  .setStyle(ButtonStyle.Danger),
              ),
            );

          await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 + MessageFlags.Ephemeral,
          });
          return;
        }
        showModal(interaction);
      } else if (interaction.isButton()) {
        if (interaction.customId == "manage-continue") showModal(interaction);
      } else if (interaction.isModalSubmit()) {
        const iv = interaction.fields;
        const monitorChannel = iv
          .getSelectedChannels("manage-monitor")
          ?.values()
          .next().value as GuildChannel;
        const reportChannel = iv
          .getSelectedChannels("manage-report")
          ?.values()
          .next().value as GuildChannel;

        if (!monitorChannel || !reportChannel) {
          await interact({
            mode: "interaction",
            interaction,
            text: `Error finding ${channelMention(monitorChannel?.id!)} or ${channelMention(reportChannel?.id!)}`,
            ephemeral: true,
          });
          return;
        }

        const guild = interaction.guild as Guild;
        const me = guild.members.me as GuildMember;

        const perm1 = monitorChannel.permissionsFor(me);
        const perm2 = reportChannel.permissionsFor(me);

        const hasPerm1 =
          perm1.has(PermissionsBitField.Flags.SendMessages) &&
          perm1.has(PermissionsBitField.Flags.ViewChannel) &&
          monitorChannel.isSendable();

        const hasPerm2 =
          perm2.has(PermissionsBitField.Flags.SendMessages) &&
          perm2.has(PermissionsBitField.Flags.ViewChannel) &&
          reportChannel.isSendable();

        const permGuild = me.permissions;
        const hasKickPerm = permGuild.has(
          PermissionsBitField.Flags.KickMembers,
        );
        const hasDelPerm = permGuild.has(
          PermissionsBitField.Flags.ManageMessages,
        );

        if (!hasPerm1 || !hasPerm2 || !hasKickPerm || !hasDelPerm) {
          let texts = [];
          if (!hasPerm1) {
            texts.push(
              `I do not have permission to send messages in ${channelMention(monitorChannel.id)}.`,
            );
          }
          if (!hasPerm2) {
            texts.push(
              `I do not have permission to send messages in ${channelMention(reportChannel.id)}.`,
            );
          }
          if (!hasKickPerm) {
            texts.push(
              `I do not have permission to kick members from this server.`,
            );
          }
          if (!hasDelPerm) {
            texts.push(
              `I do not have permission to delete messages in this server.`,
            );
          }

          await interact({
            mode: "interaction",
            interaction,
            text: texts.join("\n"),
            ephemeral: true,
          });
          return;
        }

        const success = await upsertMonitorChannel(
          guild.id,
          monitorChannel.id,
          reportChannel.id,
        );

        if (!success) {
          await interact({
            mode: "interaction",
            interaction,
            text: `### ERROR
Failed to assign ${channelMention(monitorChannel.id)} as the monitor channel and ${channelMention(reportChannel.id)} as the  report channel.`,
            ephemeral: true,
          });
          return;
        }

        postWarning(monitorChannel);

        await interact({
          mode: "channel",
          channel: reportChannel,
          text: `This channel has been assigned for reporting incidents from <#${channelMention(monitorChannel.id)}`,
        });

        await interact({
          mode: "interaction",
          interaction,
          text: `### ${userMention(monitorChannel.id)}> is now being monitored. ${channelMention(reportChannel.id)} will be used for reporting back.`,
          ephemeral: true,
        });
      }
    } catch (error) {
      (interaction.client as KickBotClient).logger.error(error);
    } finally {
      await reloadChannels();
      await startChannelCheckup(client);
    }
  },
};

async function showModal(interaction: CommandInteraction | ButtonInteraction) {
  const modal = new ModalBuilder()
    .setCustomId("manage-modal")
    .setTitle("Manage Kick Bot");
  const monitorSelect = new ChannelSelectMenuBuilder()
    .setCustomId("manage-monitor")
    .setChannelTypes(ChannelType.GuildText)
    .setMinValues(1)
    .setMaxValues(1)
    .setRequired(true);

  const monitorLabel = new LabelBuilder()
    .setLabel("Monitor channel")
    .setDescription("Select the text channel to monitor messages")
    .setChannelSelectMenuComponent(monitorSelect);

  const reportSelect = new ChannelSelectMenuBuilder()
    .setCustomId("manage-report")
    .setChannelTypes(ChannelType.GuildText)
    .setMinValues(1)
    .setMaxValues(1)
    .setRequired(true);

  const reportLabel = new LabelBuilder()
    .setLabel("Report channel")
    .setDescription("Select the text channel to report to")
    .setChannelSelectMenuComponent(reportSelect);

  modal.addLabelComponents(monitorLabel, reportLabel);

  await interaction.showModal(modal);
}

export default Manage;
