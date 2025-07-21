const {
  Events,
  MessageFlags,
  Collection,
  PermissionsBitField,
} = require("discord.js");
const db = require("../db");
const { botText } = require("../botText");
const { postErrors, checkUserSpamInChannel } = require("../utils_functions");

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || message.author.id == botText.starq_id) return;
    const client = message.client;

    const channels = await db.getChannelMonitor();
    const matchedChannel = channels.find(
      (row) => row.monitor === message.channel.id
    );
    if (!matchedChannel) return;

    const result = await checkUserSpamInChannel(message, botText, postErrors);
    if (result.kicked) {
      const reportChannel = await client.channels.fetch(matchedChannel.report);
      if (reportChannel) {
        await reportChannel.send(
          `### **User Kicked**\nUser: ${message.author.tag} (${message.author.id})\nReason: Spam in monitored channel: <#${matchedChannel.monitor}>\n\`\`\`${result.sampleContent}\`\`\``
        );
      }
    }

    // await checkUserSpamInChannel(client, db, botText, postErrors);
    // const channels = await db.getChannelMonitor();

    // const matchedChannel = channels.find(
    //   (row) => row.monitor === message.channel.id
    // );
    // if (!matchedChannel) return;

    // const hasAdminPermission = message.member.permissions.has(
    //   PermissionsBitField.Flags.Administrator
    // );
    // if (hasAdminPermission) {
    //   console.log("is admin");
    //   return;
    // }

    // const guildId = message.guild.id;
    // const userId = message.author.id;

    // const userMessages = await findAllMessagesByUser(client, guildId, userId);

    // if (userMessages.length > 1) {
    //   try {
    //     for (const msgData of userMessages) {
    //       try {
    //         const ch = await client.channels.fetch(msgData.channelId);
    //         const msg = await ch.messages.fetch(msgData.id);
    //         if (msg.content == message.content) {
    //           await msg.delete();
    //         }
    //       } catch (err) {
    //         postErrors(err);
    //       }
    //     }

    //     const member = await message.guild.members.fetch(userId);
    //     await member.kick("Spam in monitored channel");
    //     // console.log("simulating kick");

    //     const reportChannel = await message.client.channels.fetch(
    //       matchedChannel.report
    //     );
    //     if (reportChannel) {
    //       await reportChannel.send(
    //         `### **User Kicked**\nUser: ${message.author.tag} (${userId})\nReason: Sent messages in monitored channel: <#${matchedChannel.monitor}>\n\`\`\`${message.content}\`\`\``
    //       );
    //     }
    //   } catch (err) {
    //     await postErrors(err);
    //   }
    // }
  },
};
