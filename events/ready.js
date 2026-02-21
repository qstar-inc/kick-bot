import { Events } from "discord.js";
import {
  sleep,
  startSpamScanner,
  checkUserSpamInChannelByUserId,
} from "../utils_functions.js";
import pool from "../db.js";

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    async function waitForDbConnection() {
      while (true) {
        try {
          await pool.query("SELECT 1");
          break;
        } catch (error) {
          console.log("Database not connected, retrying in 2s...");
          await sleep(2000);
        }
      }

      console.log(`Ready! Logged in as ${client.user.tag}`);
      // await checkUserSpamInChannelByUserId(
      //   client,
      //   "872407110468661279",
      //   "850485144246812672",
      // );
      await startSpamScanner(client);
    }

    await waitForDbConnection();
  },
};
