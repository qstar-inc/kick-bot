const { Events } = require("discord.js");
const { startSpamScanner } = require("../monitor");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    startSpamScanner(client);
  },
};
