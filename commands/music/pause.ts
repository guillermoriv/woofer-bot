import { EmbedBuilder } from "discord.js";
import type { Command } from "../../types/command";
import { useQueue } from "discord-player";

export default {
  name: "pause",
  description: "Pause the track",
  voiceChannel: true,
  async execute(interaction, _) {
    await interaction.deferReply();

    const queue = useQueue(interaction.guild!);

    if (!queue?.isPlaying())
      return interaction.editReply(
        `No music currently playing <${interaction.member?.user.username}>... try again ? <❌>`,
      );

    if (queue.node.isPaused())
      return interaction.editReply({
        content: `The track is currently paused, <${interaction.member}>... try again ? <❌>`,
      });

    const success = queue.node.setPaused(true);
    const pauseEmbed = new EmbedBuilder()
      .setAuthor({
        name: success
          ? `Current music <${queue.currentTrack?.title}> paused <✅>`
          : `Something went wrong <${interaction.member?.user.username}>... try again ? <❌>`,
      })
      .setColor("#2f3136");

    return interaction.editReply({ embeds: [pauseEmbed] });
  },
} as Command;
