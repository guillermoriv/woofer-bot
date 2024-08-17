import { CommandInteraction, SlashCommandBuilder, Client } from "discord.js";
import type { SlashCommandProps } from "commandkit";

type InteractionType = SlashCommandProps["interaction"];

export interface Command {
  data: SlashCommandBuilder;
  voiceChannel?: boolean;
  execute: (interaction: CommandInteraction, client: Client) => Promise<any>;
}

export interface CommandWithProps {
  data: SlashCommandBuilder;
  voiceChannel?: boolean;
  execute: (interaction: InteractionType, client: Client) => Promise<any>;
}
