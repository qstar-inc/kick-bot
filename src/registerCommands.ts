import {
    REST, RESTPostAPIApplicationCommandsJSONBody, Routes, SlashCommandBuilder
} from "discord.js";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { requireEnv } from "./helpers/env.js";

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  await import("dotenv/config");
}

const isDev = requireEnv("NODE_ENV") == "dev";

const token = isDev
  ? requireEnv("DEV_DISCORD_TOKEN")
  : requireEnv("DISCORD_TOKEN");

const clientId = isDev ? requireEnv("DEV_APP_ID") : requireEnv("APP_ID");

export async function registerCommands() {
  const commands: RESTPostAPIApplicationCommandsJSONBody[] = [];

  const foldersPath = path.join(__dirname, "commands");
  const commandFolders = fs.readdirSync(foldersPath);

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);

    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter(file => file.endsWith(".ts") || file.endsWith(".js"));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      console.log(`Loading: ${filePath}`);
      let commandModule;
      try {
        commandModule = await import(pathToFileURL(filePath).href);
      } catch (err) {
        console.error(`Failed to load: ${filePath}`);
        console.error(err);
        return;
      }
      const command = commandModule.default;
      if (command?.data && command?.execute) {
        command.data.integration_types = [0, 1];
        command.data.contexts = [0, 1, 2];

        commands.push(command.data.toJSON());
      } else {
        console.warn(
          `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
        );
      }
    }
  }

  const rest = new REST({ version: "10" }).setToken(token);

  try {
    const data = (await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    })) as unknown[];

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`,
    );

    return { success: true, count: data.length };
  } catch (error) {
    console.error("Command registration failed:", error);
    return { success: false, error };
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  (async () => {
    await registerCommands();
    process.exit(0);
  })().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
