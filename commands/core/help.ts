import { SlashCommandBuilder } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { commands } from "../../index";
import type { CommandWithProps } from "../../types/command";

export default {
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
          value: commands.map((x) => `\`${x.data.name}\``).join(" | "),
        },
      ])
      .setTimestamp()
      .setFooter({
        text: "Music is great with friends - made with hearth by @guillermoriv",
      });

    return interaction.reply({ embeds: [embed] });
  },
} as CommandWithProps;
