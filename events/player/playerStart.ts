import type { GuildQueue, Track } from "discord-player";
import {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} from "discord.js";
import { config } from "../../constants";

export default (queue: GuildQueue, track: Track) => {
  const emojis = config.emojis;
  const embed = new EmbedBuilder()
    .setAuthor({
      name: `Started playing <${track.title}> in <${queue.channel!.name}> <🎧>`,
      iconURL: track.thumbnail,
    })
    .setColor("#2f3136");

  const back = new ButtonBuilder()
    .setLabel(emojis.back)
    .setCustomId("back")
    .setStyle(ButtonStyle.Primary);

  const skip = new ButtonBuilder()
    .setLabel(emojis.skip)
    .setCustomId("skip")
    .setStyle(ButtonStyle.Primary);

  const resumepause = new ButtonBuilder()
    .setLabel(emojis.resumePause)
    .setCustomId("resume&pause")
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    back,
    resumepause,
    skip,
  );

  // todo: type this
  (queue.metadata as any).channel.send({ embeds: [embed], components: [row] });
};
