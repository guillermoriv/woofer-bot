import type { GuildQueue } from "discord-player";
import { EmbedBuilder } from "discord.js";

export default (queue: GuildQueue) => {
  const embed = new EmbedBuilder()
    .setAuthor({
      name: "Disconnected from the voice channel, clearing the queue! <❌>",
    })
    .setColor("#2f3136");

  (queue.metadata as any).channel.send({
    embeds: [embed],
  });
};
