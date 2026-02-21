import { getChannelMonitor } from "../db.js";
import { Events } from "discord.js";
import { botText } from "../botText.js";
import { checkUserSpamInChannel } from "../utils_functions.js";

export default {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || message.author.id == botText.starq_id) return;
    const client = message.client;

    const channels = await getChannelMonitor();
    const matchedChannel = channels.find(
      row => row.monitor === message.channel.id,
    );
    if (!matchedChannel) return;

    const result = await checkUserSpamInChannel(message);
    if (result.kicked) {
      const reportChannel = await client.channels.fetch(matchedChannel.report);
      if (reportChannel) {
        let sampleContent = "";
        if (result.sampleContent && result.sampleContent != "") {
          sampleContent = `\n\`\`\`${result.sampleContent}\`\`\``;
        }

        await reportChannel.send(
          `### **User Kicked**\nUser: ${message.author.tag} (${message.author.id})\nReason: Spam in monitored channel: <#${matchedChannel.monitor}>${sampleContent}`,
        );
      }
    }
  },
};
