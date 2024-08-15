import { EmbedBuilder } from "discord.js";
import type { Command } from "../../types/command";
import { useQueue } from "discord-player";

export default {
  name: "stop",
  description: "Stop the current song",
  voiceChannel: true,
  async execute(interaction, _) {
    await interaction.deferReply();

    const queue = useQueue(interaction.guild!);
    if (!queue?.node.isPlaying())
      return interaction.editReply(
        `No music currently playing <${interaction.member?.user.username}>... try again ? <❌>`,
      );

    queue.delete();

    const embed = new EmbedBuilder().setColor("#2f3136").setAuthor({
      name: "Music stopped into this server, see you next time <✅>",
    });

    return interaction.editReply({ embeds: [embed] });
  },
} as Command;
