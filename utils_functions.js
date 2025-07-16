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

module.exports = { postErrors, sanitizeLine, findAllMessagesByUser };
