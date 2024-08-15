import {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
  EmbedBuilder,
  InteractionType,
} from "discord.js";
import { readdirSync } from "node:fs";
import { CLIENT_ID, TOKEN } from "./constants";
import { GuildQueueEvent, Player, useQueue } from "discord-player";
import type { Command } from "./types/command";

const rest = new REST({ version: "10" }).setToken(TOKEN);

export const commands = new Collection<string, Command>();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

const commandsArray: Command[] = [];

const player = new Player(client, {
  ytdlOptions: {
    quality: "highestaudio",
    highWaterMark: 1 << 25,
  },
});

const playerEvents = readdirSync("./events/player/").filter((file) =>
  file.endsWith(".ts"),
);

player.extractors.loadDefault();

for (const file of playerEvents) {
  const eventName = file.split(".")[0] as GuildQueueEvent;
  const eventModulePath = `./events/player/${file}`;

  try {
    const { default: playerEvent } = await import(eventModulePath);
    console.log(`< -> > [Loaded Player Event] <${eventName}>`);

    player.events.on(eventName, async (...args: any[]) => {
      try {
        await playerEvent(...args);
      } catch (error) {
        console.error(`Error handling ${eventName}:`, error);
      }
    });
  } catch (error) {
    console.error(`Failed to load event module ${eventModulePath}:`, error);
  }
}

const commandDirs = readdirSync("./commands/");

for (const dir of commandDirs) {
  const commandFiles = readdirSync(`./commands/${dir}`).filter((file) =>
    file.endsWith(".ts"),
  );

  for (const file of commandFiles) {
    const commandModulePath = `./commands/${dir}/${file}`;

    try {
      const { default: command } = await import(commandModulePath);

      if (command.name && command.description) {
        commandsArray.push(command);
        console.log(`< -> > [Loaded Command] <${command.name.toLowerCase()}>`);
        commands.set(command.name.toLowerCase(), command);
      } else {
        console.log(`< -> > [Failed Command] <${file}>`);
      }
    } catch (error) {
      console.error(
        `Failed to load command module ${commandModulePath}:`,
        error,
      );
    }
  }
}

try {
  console.log("Started refreshing application (/) commands.");
  await rest.put(Routes.applicationCommands(CLIENT_ID), {
    body: commandsArray.map((c) => ({
      name: c.name,
      description: c.description,
      options: c.options,
    })),
  });
  console.log("Successfully reloaded application (/) commands.");
} catch (error) {
  console.error(error);
}

client.on("ready", (client) => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity("Playing some cool music!");
});

client.on("interactionCreate", async (interaction) => {
  const errorEmbed = new EmbedBuilder().setColor("#ff0000");

  if (interaction.type === InteractionType.MessageComponent) {
    const customId = interaction.customId;
    if (!customId) return;

    const queue = useQueue(interaction.guild!);
    const buttonModulePath = `./buttons/${customId}.ts`;
    const { default: buttonEvent } = await import(buttonModulePath);

    if (buttonEvent) return buttonEvent(interaction, client, queue);
  } else if (interaction.type === InteractionType.ApplicationCommand) {
    const command = commands.get(interaction.commandName);

    if (!command) {
      errorEmbed.setDescription("<❌> | Error! Please contact Developers!");
      return interaction.reply({ embeds: [errorEmbed] });
    }

    command.execute(interaction, client);
  }
});

client.login(TOKEN);
