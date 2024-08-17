import {
  CommandInteractionOptionResolver,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import type { CommandWithProps } from "../../types/command";
import { QueryType, useMainPlayer, useQueue } from "discord-player";

export default {
  data: new SlashCommandBuilder()
    .addStringOption((option) =>
      option
        .setName("song")
        .setDescription("The song to play next")
        .setRequired(true),
    )
    .setName("playnext")
    .setDescription("Play a song right after the current one"),
  voiceChannel: true,
  async execute(interaction, client) {
    const player = useMainPlayer();
    const queue = useQueue(interaction.guild!);

    if (!queue)
      return interaction.reply({
        content: `No music currently playing <${interaction.member}>... try again ? <❌>`,
      });

    const song = (
      interaction.options as CommandInteractionOptionResolver
    ).getString("song");

    if (!song) {
      return interaction.reply({
        content: `The value is not correct, please try again...? <❌>`,
      });
    }

    const res = await player.search(song, {
      requestedBy: interaction.member as GuildMember,
      searchEngine: QueryType.AUTO,
    });

    if (!res?.tracks.length)
      return interaction.reply({
        content: `No results found <${interaction.member}>... try again ? <❌>`,
      });

    if (res.playlist)
      return interaction.reply({
        content: `This command dose not support playlist's <${interaction.member}>... try again ? <❌>`,
      });

    queue.insertTrack(res.tracks[0], 0);

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `Track has been inserted into the queue... it will play next <🎧>`,
      })
      .setColor("#2f3136");

    return interaction.reply({ embeds: [embed] });
  },
} as CommandWithProps;
