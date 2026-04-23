import { Interaction, SlashCommandBuilder } from "discord.js";

export type BotSlashCommand = {
  category: string;
  data: SlashCommandBuilder;
  execute: (interaction: Interaction) => Promise<void>;
};
