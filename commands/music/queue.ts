import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { CommandWithProps } from "../../types/command";
import { useQueue } from "discord-player";

export default {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("See what songs are in the queue"),
  voiceChannel: true,
  async execute(interaction, client) {
    const queue = useQueue(interaction.guild!);

    if (!queue)
      return interaction.reply({
        content: `No music currently playing <${interaction.member}>... try again ? <❌>`,
      });

    if (!queue.tracks.toArray()[0])
      return interaction.reply({
        content: `No music in the queue after the current one <${interaction.member}>... try again ? <❌>`,
      });

    const methods = ["", "🔁", "🔂"];
    const songs = queue.tracks.size;

    const nextSongs =
      songs > 5
        ? `And <**${songs - 5}**> other song(s)...`
        : `In the playlist <**${songs}**> song(s)...`;

    const tracks = queue.tracks.map(
      (track, i) =>
        `**${i + 1}** - ${track.title} | ${track.author} (requested by : ${track.requestedBy ? track.requestedBy.displayName : "unknown"})`,
    );

    const embed = new EmbedBuilder()
      .setColor("#2f3136")
      .setThumbnail(interaction.guild!.iconURL({ size: 2048 }))
      .setAuthor({
        name: `Server queue - <${interaction.guild!.name}> <${methods[queue.repeatMode]}>`,
        iconURL: client.user?.displayAvatarURL({ size: 1024 }),
      })
      .setDescription(
        `Current <${queue.currentTrack?.title}> <\n\n> <${tracks.slice(0, 5).join("\n")}> ${nextSongs}`,
      )
      .setTimestamp()
      .setFooter({
        text: "Music is great with friends - made with hearth by @guillermoriv",
      });

    return interaction.reply({ embeds: [embed] });
  },
} as CommandWithProps;
