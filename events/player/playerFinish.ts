import type { GuildQueue, Track } from "discord-player";
import { EmbedBuilder } from "discord.js";

export default (queue: GuildQueue, track: Track) => {
  const embed = new EmbedBuilder()
    .setAuthor({
      name: `Finish playing <${track.title}> in <${queue.channel!.name}> <🎧>`,
      iconURL: track.thumbnail,
    })
    .setColor("#2f3136");

  // todo: type this
  (queue.metadata as any).channel.send({ embeds: [embed] });
};
