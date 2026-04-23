import { Channel, TextChannel } from "discord.js";

import { KickBotClient } from "../types/client.js";

const channelCache = new Map<string, TextChannel>();

export async function getTextChannel(
  client: KickBotClient,
  id: string,
): Promise<[TextChannel | null, boolean]> {
  if (channelCache.has(id)) {
    return [channelCache.get(id)!, true];
  }

  let channel: Channel | null | undefined;

  try {
    channel = client.channels.cache.get(id);
  } catch {
    channel = null;
  }

  if (!channel) {
    try {
      channel = await client.channels.fetch(id);
    } catch (err) {
      return [null, false];
    }
  }

  if (!channel || !channel.isTextBased() || !("messages" in channel)) {
    return [null, false];
  }

  const textChannel = channel as TextChannel;
  channelCache.set(id, textChannel);

  return [textChannel, true];
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export function getErrorMessage(err: unknown) {
  if (err instanceof Error) {
    return err.message;
  } else {
    return "Unknown error";
  }
}
