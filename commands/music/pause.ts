import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { CommandWithProps } from "../../types/command";
import { useQueue } from "discord-player";

export default {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause the current track"),
  voiceChannel: true,
  async execute(interaction, _) {
    const queue = useQueue(interaction.guild!);

    if (!queue?.isPlaying())
      return interaction.reply(
        `No music currently playing <${interaction.member}>... try again ? <❌>`,
      );

    if (queue.node.isPaused())
      return interaction.reply({
        content: `The track is currently paused, <${interaction.member}>... try again ? <❌>`,
      });

    const success = queue.node.setPaused(true);
    const pauseEmbed = new EmbedBuilder()
      .setAuthor({
        name: success
          ? `Current music <${queue.currentTrack?.title}> paused <✅>`
          : `Something went wrong <${interaction.member}>... try again ? <❌>`,
      })
      .setColor("#2f3136");

    return interaction.reply({ embeds: [pauseEmbed] });
  },
} as CommandWithProps;
