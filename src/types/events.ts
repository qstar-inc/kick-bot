import { Client, ClientEvents } from "discord.js";

export type BotEvent<K extends keyof ClientEvents = any> = {
  name: K;
  once?: boolean;
  execute: (...args: ClientEvents[K]) => any;
};

export type ReadyClient = Client<true>;
