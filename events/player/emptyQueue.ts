import type { GuildQueue } from "discord-player";
import { EmbedBuilder } from "discord.js";

export default (queue: GuildQueue) => {
  const embed = new EmbedBuilder()
    .setAuthor({
      name: "No more songs in the queue! <❌>",
    })
    .setColor("#EE4B2B");

  (queue.metadata as any).channel.send({
    embeds: [embed],
  });
};
