import { EmbedBuilder } from "discord.js";
import type { Command } from "../../types/command";
import { useQueue } from "discord-player";

export default {
  name: "skip",
  description: "Skip the current song",
  voiceChannel: true,
  async execute(interaction, _) {
    await interaction.deferReply();

    const queue = useQueue(interaction.guild!);
    if (!queue?.isPlaying())
      return interaction.editReply("No music is being played!?");

    const success = queue?.node.skip();

    const embed = new EmbedBuilder().setColor("#2f3136").setAuthor({
      name: success
        ? `Current music <${queue.currentTrack?.title}> skipped <✅>`
        : `Something went wrong <${interaction.member?.user.username}>... try again ? <❌>`,
    });

    return interaction.editReply({ embeds: [embed] });
  },
} as Command;
