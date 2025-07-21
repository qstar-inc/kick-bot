const { PermissionsBitField } = require("discord.js");
const channelIds = require("./channelId");

async function postErrors(a, b) {
  const { client } = require("./index");
  let text, error;

  if (typeof b === "undefined") {
    error = a;
    text = "";
  } else {
    text = `${a}\n`;
    error = b;
  }

  let errorText = error.stack || error.toString();

  if (errorText.length > 3900) {
    errorText = errorText.slice(0, 3900) + "...";
  }

  const errorLog = `${text}\`\`\`${errorText}\`\`\``;
  const channel = client.channels.cache.get(channelIds.error);
  await channel
    .send({
      content: errorLog,
    })
    .catch((error) => {
      console.error(error);
    });
}

function sanitizeLine(line) {
  return decodeURIComponent(`${line.replaceAll("\\", "/")}`);
}

async function findAllMessagesByUser(
  client,
  guild,
  userId,
  timeWindowMs = 5 * 60 * 1000
) {
  const now = Date.now();
  const userMessages = [];
  const guildObject = await client.guilds.fetch(guild);

  const textChannels = guildObject.channels.cache.filter(
    (ch) => ch.isTextBased() && ch.viewable
  );

  for (const [, channel] of textChannels) {
    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      const filtered = messages.filter(
        (msg) =>
          msg.author.id === userId && now - msg.createdTimestamp <= timeWindowMs
      );
      userMessages.push(...filtered.values());
    } catch (err) {
      console.log(`Cannot fetch messages from ${channel.name}:`, err.message);
    }
  }

  return userMessages;
}

async function monitorSpamAcrossChannels(client, db, botText, postErrors) {
  const channels = await db.getChannelMonitor();
  const seenUsers = new Set();
  for (const channelData of channels) {
    const { monitor: channelId, report: reportChannelId } = channelData;

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) continue;

      const messages = await channel.messages.fetch({ limit: 100 });

      const userMessageCount = {};

      for (const msg of messages.values()) {
        if (
          msg.author.bot ||
          msg.author.id === botText.starq_id ||
          msg.member?.permissions.has(PermissionsBitField.Flags.Administrator)
        ) {
          continue;
        }

        userMessageCount[msg.author.id] ??= [];
        userMessageCount[msg.author.id].push(msg);
      }

      for (const [userId, msgs] of Object.entries(userMessageCount)) {
        if (msgs.length > 1 && !seenUsers.has(userId)) {
          seenUsers.add(userId);

          for (const msg of msgs) {
            try {
              await msg.delete();
            } catch (err) {
              postErrors(err);
            }
          }

          try {
            const member = await channel.guild.members.fetch(userId);
            await member.kick("Spam in monitored channel");

            const reportChannel = await client.channels.fetch(reportChannelId);
            if (reportChannel) {
              await reportChannel.send(
                `### **User Kicked**\nUser: ${member.user.tag} (${userId})\nReason: Spam in monitored channel: <#${channelId}>\n\`\`\`${msgs[0].content}\`\`\``
              );
            }
          } catch (err) {
            postErrors(err);
          }
        }
      }
    } catch (err) {
      postErrors(err);
    }
  }
}

async function checkUserSpamInChannel(message, botText, postErrors) {
  if (
    message.author.bot ||
    message.author.id === botText.starq_id ||
    message.member?.permissions.has(PermissionsBitField.Flags.Administrator)
  ) {
    return;
  }

  try {
    const messages = await message.channel.messages.fetch({ limit: 100 });
    const matchingMessages = messages.filter(
      (msg) =>
        msg.author.id === message.author.id &&
        msg.content === message.content &&
        msg.id !== message.id
    );

    if (matchingMessages.size > 0) {
      for (const msg of matchingMessages.values()) {
        await msg.delete();
      }
      await message.delete();

      await message.member.kick("Spam in monitored channel");

      return {
        kicked: true,
        sampleContent: message.content,
      };
    }
  } catch (err) {
    postErrors(err);
  }

  return { kicked: false };
}

module.exports = {
  postErrors,
  sanitizeLine,
  findAllMessagesByUser,
  monitorSpamAcrossChannels,
  checkUserSpamInChannel,
};
