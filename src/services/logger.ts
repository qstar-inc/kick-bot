import { Client } from "discord.js";

import { interact } from "../helpers/interaction.js";
import { channelIds } from "../variables/channelId.js";

type LogLevel = "info" | "warn" | "error";

export class Logger {
  constructor(private client: Client) {}

  private format(level: LogLevel, message: string) {
    const time = new Date().toISOString();
    return `[${time}] [${level.toUpperCase()}] ${message}`;
  }

  info(message: string) {
    console.log(this.format("info", message));
  }

  warn(message: string) {
    console.warn(this.format("warn", message));
  }

  async error(error: unknown, context?: string) {
    const errorText =
      error instanceof Error ? error.stack || error.message : String(error);

    const content = context
      ? `**${context}**\n\`\`\`${errorText}\`\`\``
      : `\`\`\`${errorText}\`\`\``;

    console.error(this.format("error", errorText));

    const channelId = channelIds.error;
    if (!channelId) return;

    const channel = this.client.channels.cache.get(channelId);

    if (!channel || !channel.isSendable()) return;

    try {
      await interact({ mode: "channel", text: content, channel });
    } catch (err) {
      console.error("Failed to send error log:", err);
    }
  }
}
