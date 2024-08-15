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
      content: "No music currently playing... try again ? <❌>",
    });

  const resumed = queue.node.resume();
  let message = `Current music <${queue.currentTrack?.title}> resumed <✅>`;

  if (!resumed) {
    queue.node.pause();
    message = `Current music <${queue.currentTrack?.title}> paused <✅>`;
  }

  return interaction.editReply({ content: message });
};
