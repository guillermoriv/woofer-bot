import { SlashCommandBuilder } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { commands } from "../../index";
import type { Command } from "../../types/command";

export default {
  name: "help",
  description: "All the commands this bot has!",
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("All the commands this bot has!"),
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setColor("#ff0000")
      .setAuthor({
        name: client.user!.username,
        iconURL: client.user!.displayAvatarURL({ size: 1024 }),
      })
      .setDescription("Here are all the commands this bot has!")
      .addFields([
        {
          name: `Enabled - ${commands.size}`,
          value: commands.map((x) => `\`${x.name}\``).join(" | "),
        },
      ])
      .setTimestamp()
      .setFooter({
        text: "Music comes first - Made with heart by the Community <❤️>",
      });

    return interaction.reply({ embeds: [embed] });
  },
} as Command;
