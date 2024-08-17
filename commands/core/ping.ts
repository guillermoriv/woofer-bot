import { SlashCommandBuilder } from "discord.js";
import type { CommandWithProps } from "../../types/command";
import ms from "ms";

export default {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  async execute(interaction, client) {
    return interaction.reply(
      `Pong! API Latency is <${Math.round(client.ws.ping)}ms 🛰️>, last heartbeat calculated <${ms(Date.now() - (client.ws.shards.first()?.lastPingTimestamp ?? 0), { long: true })}> ago`,
    );
  },
} as CommandWithProps;
