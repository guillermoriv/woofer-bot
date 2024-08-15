import type { GuildQueue, Track } from "discord-player";
import {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} from "discord.js";

type Emojis = {
  back: string;
  skip: string;
  ResumePause: string;
  loop: string;
};

type Config = {
  app: {
    loopMessage: boolean;
    enableEmojis: boolean;
  };
  emojis?: Emojis;
};

const config: Config = {
  app: {
    loopMessage: true,
    enableEmojis: true,
  },
  emojis: {
    back: "🔙",
    skip: "⏭️",
    ResumePause: "⏯️",
    loop: "🔁",
  },
};

export default (queue: GuildQueue, track: Track) => {
  if (!config.app.loopMessage && queue.repeatMode !== 0) return;

  let EmojiState = config.app.enableEmojis;
  const emojis = config.emojis;

  EmojiState = emojis ? EmojiState : false;

  const embed = new EmbedBuilder()
    .setAuthor({
      name: `Started playing <${track.title}> in <${queue.channel!.name}> <🎧>`,
      iconURL: track.thumbnail,
    })
    .setColor("#2f3136");

  const back = new ButtonBuilder()
    .setLabel(EmojiState && emojis ? emojis.back : "Back")
    .setCustomId("back")
    .setStyle(ButtonStyle.Primary);

  const skip = new ButtonBuilder()
    .setLabel(EmojiState && emojis ? emojis.skip : "Skip")
    .setCustomId("skip")
    .setStyle(ButtonStyle.Primary);

  const resumepause = new ButtonBuilder()
    .setLabel(EmojiState && emojis ? emojis.ResumePause : "Resume & Pause")
    .setCustomId("resume&pause")
    .setStyle(ButtonStyle.Danger);

  const loop = new ButtonBuilder()
    .setLabel(EmojiState && emojis ? emojis.loop : "Loop")
    .setCustomId("loop")
    .setStyle(ButtonStyle.Danger);

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    back,
    loop,
    resumepause,
    skip,
  );

  // todo: type this
  (queue.metadata as any).channel.send({ embeds: [embed], components: [row1] });
};
