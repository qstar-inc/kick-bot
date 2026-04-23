import { Collection, GatewayIntentBits, Partials } from "discord.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { requireEnv } from "./helpers/env.js";
import { KickBotClient } from "./types/client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(process.cwd(), ".env");

async function loadEnv() {
  if (fs.existsSync(envPath)) {
    await import("dotenv/config");
  }
}

await loadEnv().catch(console.error);

export const isDev = requireEnv("NODE_ENV") == "dev";
const token = isDev
  ? requireEnv("DEV_DISCORD_TOKEN")
  : requireEnv("DISCORD_TOKEN");

const client = new KickBotClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.GuildMember, Partials.User],
});

client.cooldowns = new Collection();
client.commands = new Collection();

async function login() {
  const foldersPath = path.join(__dirname, "commands");
  const commandFolders = fs.readdirSync(foldersPath);

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter(file => file.endsWith(".ts") || file.endsWith(".js"));
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);

      const commandModule = await import(pathToFileURL(filePath).href);
      const command = commandModule.default;

      if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
      } else {
        console.log(
          `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
        );
      }
    }
  }

  const eventsPath = path.join(__dirname, "events");
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter(file => file.endsWith(".ts") || file.endsWith(".js"));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);

    const eventModule = await import(pathToFileURL(filePath).href);
    const event = eventModule.default;

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }

  await client.login(token);
}

login().catch(console.error);

export { client };
