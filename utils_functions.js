const { PermissionsBitField, ChannelType } = require("discord.js");
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
    .catch(error => {
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
  timeWindowMs = 5 * 60 * 1000,
) {
  const now = Date.now();
  const userMessages = [];
  const guildObject = await client.guilds.fetch(guild);

  const textChannels = guildObject.channels.cache.filter(
    ch => ch.isTextBased() && ch.viewable,
  );

  for (const [, channel] of textChannels) {
    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      const filtered = messages.filter(
        msg =>
          msg.author.id === userId &&
          now - msg.createdTimestamp <= timeWindowMs,
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
        )
          continue;

        console.log(`New message from ${msg.author.id}: ${msg.content}`);

        userMessageCount[msg.author.id] ??= [];
        userMessageCount[msg.author.id].push(msg);
      }

      for (const [userId, msgs] of Object.entries(userMessageCount)) {
        if (msgs.length > 0 && !seenUsers.has(userId)) {
          seenUsers.add(userId);

          try {
            const member = await channel.guild.members.fetch(userId);
            await member.kick("Spam in monitored channel");
            console.log(`Kicking user ${userId} for spamming in ${channelId}`);

            const reportChannel = await client.channels.fetch(reportChannelId);
            if (reportChannel) {
              let text = `### **User Kicked**\nUser: ${member.user.tag} (${userId})\nReason: Spam in monitored channel: <#${channelId}>`;
              if (msgs[0].content && msgs[0].content != "") {
                text += `\n\`\`\`${msgs[0].content}\`\`\``;
              } else if (msgs[0] && msgs[0] != "") {
                text += `\n\`\`\`${msgs[0]}\`\`\``;
              }
              await reportChannel.send(text);
            }
          } catch (err) {
            if (!err.message.startsWith("Unknown Member")) postErrors(err);
          }

          for (const msg of msgs) {
            try {
              await msg.delete();
            } catch (err) {
              postErrors(err);
            }
          }
        }
      }
    } catch (err) {
      postErrors(err);
    }
  }
}

async function fetchMessagesFromAllChannels(
  guild,
  userId,
  limitPerChannel = 100,
  timeToCheckUntil,
) {
  const textChannels = guild.channels.cache.filter(
    ch => ch.type === ChannelType.GuildText,
  );

  const fetchPromises = textChannels.map(async channel => {
    try {
      const fetched = await channel.messages.fetch({
        limit: limitPerChannel,
      });
      return fetched.filter(msg => {
        return (
          msg.author.id === userId &&
          (!timeToCheckUntil || msg.createdTimestamp >= timeToCheckUntil)
        );
      });
    } catch (err) {
      return new Map();
    }
  });

  const results = await Promise.all(fetchPromises);

  return results.flatMap(col => [...col.values()]);
}

async function checkUserSpamInChannel(message, botText, postErrors) {
  console.log("New message");
  if (
    message.author.bot ||
    message.author.id === botText.starq_id ||
    message.member?.permissions.has(PermissionsBitField.Flags.Administrator)
  )
    return;

  const timeToCheck = Date.now() - 10 * 60 * 1000;

  try {
    const messages = await fetchMessagesFromAllChannels(
      message.guild,
      message.author.id,
      10,
      timeToCheck,
    );
    const matchingMessages = messages.filter(msg => {
      return msg.id !== message.id;
    });

    if (matchingMessages.length > 0) {
      console.log(`Deleting ${matchingMessages.length} other channel messages`);
      for (const msg of matchingMessages) {
        try {
          await msg.delete();
        } catch (err) {
          postErrors(
            `Unable to delete other message in <#${msg.channelId}>`,
            err,
          );
        }
      }
    }
    try {
      console.log("Deleting message");
      await message.delete();
    } catch (err) {
      postErrors(
        `Unable to delete main message in <#${message.channelId}>`,
        err,
      );
    }

    try {
      console.log(`Kicking ${message.member.id}`);
      await message.member.kick("Spam in monitored channel");
    } catch (err) {
      postErrors(
        `Unable to kick user ${message.member.id} in <#${message.channelId}>`,
        err,
      );
    }

    return {
      kicked: true,
      sampleContent: message.content[0] ?? message.content,
    };
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
