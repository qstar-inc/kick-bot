const { Events } = require("discord.js");
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
  },
};
