import type { GuildQueue } from "discord-player";
import { EmbedBuilder } from "discord.js";

export default (queue: GuildQueue, error: any) => {
  const embed = new EmbedBuilder()
    .setAuthor({
      name: "Bot had an unexpected error, please check the console imminently!",
    })
    .setColor("#EE4B2B");

  // todo: type this
  (queue.metadata as any).channel.send({ embeds: [embed] });

  console.log(`Error emitted from the player <${error.message}>`);
};
