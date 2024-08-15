import type { GuildQueue, Track } from "discord-player";
import { EmbedBuilder } from "discord.js";

export default (queue: GuildQueue, track: Track) => {
  const embed = new EmbedBuilder()
    .setAuthor({
      name: `Skipping <**${track.title}**> due to an issue! <❌>`,
    })
    .setColor("#EE4B2B");

  (queue.metadata as any).channel.send({
    embeds: [embed],
    iconURL: track.thumbnail,
  });
};
