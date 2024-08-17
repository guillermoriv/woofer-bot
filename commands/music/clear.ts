import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { CommandWithProps } from "../../types/command";
import { useQueue } from "discord-player";

export default {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Clear all the music in the queue"),
  voiceChannel: true,
  async execute(interaction, client) {
    const queue = useQueue(interaction.guild!);

    if (!queue)
      return interaction.reply({
        content: `No music currently playing <${interaction.member}>... try again ? <❌>`,
      });

    if (!queue.tracks.toArray()[1])
      return interaction.reply({
        content: `No music in the queue after the current one <${interaction.member}>... try again ? <❌>`,
      });

    queue.tracks.clear();

    const embed = new EmbedBuilder()
      .setAuthor({ name: "Music queue cleared <✅>" })
      .setColor("#2f3136");

    return interaction.reply({ embeds: [embed] });
  },
} as CommandWithProps;
