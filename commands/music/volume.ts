import { SlashCommandBuilder } from "discord.js";
import type { CommandWithProps } from "../../types/command";
import { useQueue } from "discord-player";

export default {
  data: new SlashCommandBuilder()
    .addNumberOption((option) =>
      option
        .setName("volume")
        .setDescription("The new volume")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    )
    .setName("volume")
    .setDescription("Adjust volume"),
  voiceChannel: true,
  async execute(interaction, client) {
    const queue = useQueue(interaction.guild!);

    if (!queue)
      return interaction.reply({
        content: `No music currently playing <${interaction.member}>... try again ? <❌>`,
      });

    const vol = interaction.options.getNumber("volume");

    if (!vol) {
      return interaction.reply({
        content: `No volume specified <${interaction.member}>... try again ? <❌>`,
      });
    }

    if (queue.node.volume === vol)
      return interaction.reply({
        content: `The new volume is already the current one <${interaction.member}>... try again ? <❌>`,
      });

    const success = queue.node.setVolume(vol);

    return interaction.reply({
      content: success
        ? `The volume has been modified to <${vol}/${100}%> <🔊>`
        : `Something went wrong ${interaction.member}... try again ? ❌`,
    });
  },
} as CommandWithProps;
