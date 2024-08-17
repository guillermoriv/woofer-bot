import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { CommandWithProps } from "../../types/command";
import { useQueue } from "discord-player";

export default {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resume the current track"),
  voiceChannel: true,
  async execute(interaction, _) {
    const queue = useQueue(interaction.guild!);
    if (!queue) return interaction.editReply("No music is being played!?");
    if (!queue.node.isPlaying())
      return interaction.reply(
        `The track is already running <${interaction.member}>... try again ? <❌>`,
      );

    const success = queue.node.resume();
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
