import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
import type { Command } from "../../types/command";
import { QueryType, useMainPlayer } from "discord-player";

export default {
  name: "play",
  description: "Play a song from YouTube!",
  voiceChannel: true,
  options: [
    {
      name: "song",
      description: "The song you want to play...",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
  async execute(interaction, client) {
    await interaction.deferReply();

    const player = useMainPlayer();
    const optionSong = interaction.options.get("song", true);

    if (!optionSong) {
      return interaction.editReply("No song provided!");
    }

    if (!optionSong.value) {
      return interaction.editReply(
        "The value is not correct, please try again...?",
      );
    }

    const song = optionSong.value.toString();

    const member = interaction.member as GuildMember;

    const res = await player.search(song, {
      requestedBy: member,
      searchEngine: QueryType.AUTO,
    });

    let defaultEmbed = new EmbedBuilder().setColor("#2f3136");

    if (!res?.tracks.length) {
      defaultEmbed.setAuthor({
        name: "No results found... try again ? <❌>",
      });
      return interaction.editReply({ embeds: [defaultEmbed] });
    }

    try {
      const { track } = await player.play(member.voice.channel!, song, {
        nodeOptions: {
          metadata: interaction,
          volume: 50,
          leaveOnEmpty: true,
          leaveOnEmptyCooldown: 30000,
          leaveOnEnd: true,
          leaveOnEndCooldown: 30000,
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
} as Command;
