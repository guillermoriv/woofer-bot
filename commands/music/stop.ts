import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { CommandWithProps } from "../../types/command";
import { useQueue } from "discord-player";

export default {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop the current track"),
  voiceChannel: true,
  async execute(interaction, _) {
    const queue = useQueue(interaction.guild!);
    if (!queue?.node.isPlaying())
      return interaction.reply(
        `No music currently playing <${interaction.member}>... try again ? <❌>`,
      );

    queue.delete();

    const embed = new EmbedBuilder().setColor("#2f3136").setAuthor({
      name: "Music stopped into this server, see you next time <✅>",
    });

    return interaction.reply({ embeds: [embed] });
  },
} as CommandWithProps;
