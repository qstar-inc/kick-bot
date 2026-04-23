import { ContainerBuilder, TextDisplayBuilder } from "discord.js";

export function createTextContainer(text: string) {
  return new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(text),
  );
}
