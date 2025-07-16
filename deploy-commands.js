const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const { postErrors } = require("./utils_functions");

require("dotenv").config();

clientId = process.env.APP_ID;
token = process.env.DISCORD_TOKEN;

const registerCommands = async () => {
  const commands = [];
  const foldersPath = path.join(__dirname, "commands");
  const commandFolders = fs.readdirSync(foldersPath);

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      if ("data" in command && "execute" in command) {
        command.data.integration_types = [0, 1];
        command.data.contexts = [0, 1, 2];
        commands.push(command.data.toJSON());
      } else {
        console.log(
          `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
        );
      }
    }
  }

  const rest = new REST().setToken(token);

  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    const data = await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );

    return { success: true, count: data.length };
  } catch (error) {
    await postErrors(error);
    return { success: false, error };
  }
};

module.exports = registerCommands;

if (require.main === module) {
  (async () => {
    await registerCommands();
  })();
}
