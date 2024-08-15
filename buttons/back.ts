import type { GuildQueue } from "discord-player";
import { Client, CommandInteraction } from "discord.js";

export default async (
  interaction: CommandInteraction,
  _: Client,
  queue: GuildQueue,
) => {
  await interaction.deferReply();

  if (!queue?.isPlaying())
    return interaction.editReply({
      content: `No music currently playing... try again ? <❌>`,
    });
  if (!queue.history.previousTrack)
    return interaction.editReply({
      content: `There was no music played before <${interaction.member}>... try again ? <❌>`,
    });

  await queue.history.back();

  return interaction.editReply({
    content: "Playing the <**previous**> track <✅>",
  });
};
