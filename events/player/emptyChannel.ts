import type { GuildQueue } from "discord-player";
import { EmbedBuilder } from "discord.js";

export default (queue: GuildQueue) => {
  const embed = new EmbedBuilder()
    .setAuthor({
      name: "Nobody is in the voice channel, leaving the voice channel!  <❌>",
    })
    .setColor("#2f3136");

  (queue.metadata as any).channel.send({
    embeds: [embed],
  });
};
