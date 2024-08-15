import {
  CommandInteraction,
  SlashCommandBuilder,
  Client,
  type ApplicationCommandOption,
} from "discord.js";

export interface Command {
  name: string;
  description: string;
  data: SlashCommandBuilder;
  voiceChannel?: boolean;
  options?: ApplicationCommandOption[];
  execute: (interaction: CommandInteraction, client: Client) => Promise<any>;
}
