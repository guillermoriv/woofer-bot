import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import type { CommandWithProps } from "../../types/command";
import { useQueue } from "discord-player";
import { config } from "../../constants";

export default {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("See what song is currently playing"),
  voiceChannel: true,
  async execute(interaction, client) {
    const emojis = config.emojis;
    const queue = useQueue(interaction.guild!);

    if (!queue?.isPlaying())
      return interaction.reply({
        content: `No music currently playing <${interaction.member}>... try again ? <❌>`,
      });

    const track = queue.currentTrack;
    const methods = ["disabled", "track", "queue"];
    const timestamp = track!.duration;
    const progress = queue.node.createProgressBar();

    const embed = new EmbedBuilder()
      .setAuthor({
        name: track!.title,
        iconURL: client.user?.displayAvatarURL({ size: 1024 }),
      })
      .setThumbnail(track!.thumbnail)
      .setDescription(
        `Volume <**${queue.node.volume}**%> <\n> <Duration **${timestamp}**> <\n> Progress <${progress}> <\n >Loop mode <**${methods[queue.repeatMode]}**> <\n>Requested by <${track?.requestedBy}>`,
      )
      .setFooter({
        text: "Music is great with friends - made with hearth by @guillermoriv",
      })
      .setColor("#2f3136")
      .setTimestamp();

    const resumepause = new ButtonBuilder()
      .setLabel(emojis.resumePause)
      .setCustomId("resume&pause")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      resumepause,
    );

    return interaction.reply({ embeds: [embed], components: [row] });
  },
} as CommandWithProps;
