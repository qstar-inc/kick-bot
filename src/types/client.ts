import { Client, ClientOptions, Collection } from "discord.js";

import { Logger } from "../services/logger.js";

export class KickBotClient extends Client<true> {
  public commands = new Collection<string, any>();
  public cooldowns = new Collection<string, Collection<string, number>>();

  public logger: Logger;

  constructor(options: ClientOptions) {
    super(options);
    this.logger = new Logger(this);
  }
}
