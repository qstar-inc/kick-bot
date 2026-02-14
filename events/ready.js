const { Events } = require("discord.js");
const { startSpamScanner } = require("../monitor");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    async function waitForDbConnection() {
      while (true) {
        try {
          await db.query2("SELECT 1");
          break;
        } catch (error) {
          console.log("Database not connected, retrying in 2s...");
          await sleep(2000);
        }
      }

      console.log(`Ready! Logged in as ${client.user.tag}`);
      startSpamScanner(client);
    }

    await waitForDbConnection();
  },
};
