import { EmbedBuilder, GuildMember, SlashCommandBuilder } from "discord.js";
import type { CommandWithProps } from "../../types/command";
import { QueryType, useMainPlayer } from "discord-player";

export default {
  data: new SlashCommandBuilder()
    .addStringOption((option) =>
      option
        .setName("song")
        .setDescription("The song you want to search")
        .setRequired(true),
    )
    .setName("search")
    .setDescription("Search a song"),
  voiceChannel: true,
  async execute(interaction, client) {
    const player = useMainPlayer();
    const song = interaction.options.getString("song");

    if (!song) {
      return interaction.reply(
        "The value is not correct, please try again...?",
      );
    }

    const res = await player.search(song, {
      requestedBy: interaction.member as GuildMember,
      searchEngine: QueryType.AUTO,
    });

    if (!res.hasTracks())
      return interaction.reply({
        content: `No results found <${interaction.member}>... try again ? <❌>`,
      });

    const queue = player.nodes.create(interaction.guild!, {
      metadata: {
        channel: interaction.channel,
      },
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
      selfDeaf: true,
    });

    const maxTracks = res.tracks.slice(0, 10);

    const embed = new EmbedBuilder()
      .setColor("#2f3136")
      .setAuthor({
        name: `Results for <${song}>`,
        iconURL: client.user?.displayAvatarURL({ size: 1024 }),
      })
      .setDescription(
        `${maxTracks.map((track, i) => `**${i + 1}**. ${track.title} | ${track.author}`).join("\n")}\n\n> Select choice between <**1**> and <**${maxTracks.length}**> or <**cancel** ⬇️>`,
      )
      .setTimestamp()
      .setFooter({
        text: "Music is great with friends - made with hearth by @guillermoriv",
      });

    interaction.reply({ embeds: [embed] });

    const collector = interaction.channel!.createMessageCollector({
      time: 15000,
      max: 1,
      filter: (m) => m.author.id === interaction.member?.user.id,
    });

    collector.on("collect", async (query) => {
      collector.stop();
      if (query.content.toLowerCase() === "cancel") {
        return interaction.followUp({
          content: "Search cancelled <✅>",
          ephemeral: true,
        });
      }

      const value = parseInt(query.toString());

      if (!value || value <= 0 || value > maxTracks.length) {
        return interaction.followUp({
          content: `Invalid response, try a value between <**1**> and <**${maxTracks.length}**> or <**cancel**>... try again ? <❌>`,
          ephemeral: true,
        });
      }

      try {
        if (!queue.connection)
          await queue.connect(
            (interaction.member as GuildMember).voice.channel!,
          );
      } catch {
        return interaction.followUp({
          content: `I can't join the voice channel <${interaction.member}>... try again ? <❌>`,
          ephemeral: true,
        });
      }

      await interaction.followUp({
        content: "Loading your search... <🎧>",
        ephemeral: true,
      });

      queue.addTrack(res.tracks[value - 1]);

      if (!queue.isPlaying()) await queue.node.play();
    });

    collector.on("end", async (_, reason) => {
      if (reason === "time")
        return interaction.followUp({
          content: `Search timed out <${interaction.member}>... try again ? <❌>`,
          ephemeral: true,
        });
    });
  },
} as CommandWithProps;
