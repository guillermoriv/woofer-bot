import { EmbedBuilder, GuildMember, SlashCommandBuilder } from "discord.js";
import type { CommandWithProps } from "../../types/command";
import { QueryType, useMainPlayer } from "discord-player";

export default {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song from YouTube!")
    .addStringOption((option) =>
      option
        .setName("song")
        .setDescription("The song you want to play...")
        .setRequired(true),
    ),
  voiceChannel: true,
  async execute(interaction, client) {
    await interaction.deferReply();

    const player = useMainPlayer();

    const song = interaction.options.getString("song");

    if (!song) {
      return interaction.editReply(
        "The value is not correct, please try again...?",
      );
    }

    const member = interaction.member as GuildMember;
    const channel = member.voice.channel!;

    const result = await player.search(song, {
      requestedBy: member,
      searchEngine: QueryType.AUTO,
    });

    let defaultEmbed = new EmbedBuilder().setColor("#2f3136");

    if (!result.hasTracks()) {
      defaultEmbed.setAuthor({
        name: "No results found... try again ? <❌>",
      });
      return interaction.editReply({ embeds: [defaultEmbed] });
    }

    try {
      const { track } = await player.play(channel, result, {
        nodeOptions: {
          metadata: interaction,
          repeatMode: 0,
          noEmitInsert: true,
          leaveOnStop: false,
          leaveOnEmpty: true,
          leaveOnEmptyCooldown: 60000,
          leaveOnEnd: true,
          leaveOnEndCooldown: 60000,
          pauseOnEmpty: true,
          preferBridgedMetadata: true,
          disableBiquad: true,
        },
        requestedBy: member,
        connectionOptions: {
          deaf: true,
        },
      });

      defaultEmbed.setAuthor({
        name: `Loading <${track.title}> to the queue... <✅>`,
      });

      return interaction.editReply({ embeds: [defaultEmbed] });
    } catch (error) {
      console.log(`Play error: ${error}`);
      defaultEmbed.setAuthor({
        name: "I can't join the voice channel... try again ? <❌>",
      });
      return interaction.editReply({ embeds: [defaultEmbed] });
    }
  },
} as CommandWithProps;
