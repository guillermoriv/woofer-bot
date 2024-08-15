import { EmbedBuilder } from "discord.js";
import type { Command } from "../../types/command";
import { useQueue } from "discord-player";

export default {
  name: "resume",
  description: "Resume the track",
  voiceChannel: true,
  async execute(interaction, _) {
    await interaction.deferReply();

    const queue = useQueue(interaction.guild!);
    if (!queue) return interaction.editReply("No music is being played!?");
    if (!queue.node.isPlaying())
      return interaction.editReply(
        `The track is already running <${interaction.member}>... try again ? <❌>`,
      );

    const success = queue.node.resume();
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
