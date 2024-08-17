import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { CommandWithProps } from "../../types/command";
import { useQueue } from "discord-player";

export default {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skip the current track"),
  voiceChannel: true,
  async execute(interaction, _) {
    const queue = useQueue(interaction.guild!);
    if (!queue?.isPlaying())
      return interaction.reply("No music is being played!?");

    const success = queue.node.skip();

    const embed = new EmbedBuilder().setColor("#2f3136").setAuthor({
      name: success
        ? `Current music <${queue.currentTrack?.title}> skipped <✅>`
        : `Something went wrong <${interaction.member}>... try again ? <❌>`,
    });

    return interaction.reply({ embeds: [embed] });
  },
} as CommandWithProps;
