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

  const success = queue.node.skip();
  let message = `Current music <${queue.currentTrack?.title}> skipped <✅>`;

  if (!success) {
    message = `Current music <${queue.currentTrack?.title}> coulnd't be skipped <❌>`;
  }

  return interaction.editReply({ content: message });
};
