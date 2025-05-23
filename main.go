package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"

	"github.com/guillermoriv/woofer-bot/commands"
	"github.com/joho/godotenv"

	"github.com/bwmarrin/discordgo"
)

type Pair struct {
	command        *discordgo.ApplicationCommand
	commandHandler func(s *discordgo.Session, i *discordgo.InteractionCreate)
}

var usedCommands []Pair = []Pair{
	{command: commands.PingCommand, commandHandler: commands.PingHandler},
	{command: commands.PlayCommand, commandHandler: commands.PlayHandler},
	{command: commands.StopCommand, commandHandler: commands.StopHandler},
	{command: commands.QueueCommand, commandHandler: commands.QueueHandler},
	{command: commands.SkipCommand, commandHandler: commands.SkipHandler},
}

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("[error]: no .env file found, falling back to system environment; ", err)
	}

	token := os.Getenv("TOKEN")

	if token == "" {
		log.Fatal("[error]: TOKEN evironment variable is required")
	}

	dg, err := discordgo.New("Bot " + token)
	if err != nil {
		log.Println("[error]: creating discord session; ", err)
	}

	for _, currentCommand := range usedCommands {
		cmd := currentCommand

		dg.AddHandler(func(s *discordgo.Session, r *discordgo.Ready) {
			_, err := s.ApplicationCommandCreate(s.State.User.ID, "", cmd.command)
			if err != nil {
				log.Fatal("[error] cannot create slash command; ", err)
			}
		})

		dg.AddHandler(func(s *discordgo.Session, i *discordgo.InteractionCreate) {
			if i.ApplicationCommandData().Name == cmd.command.Name {
				cmd.commandHandler(s, i)
			}
		})
	}

	dg.Identify.Intents = discordgo.IntentsGuilds |
		discordgo.IntentsGuildMembers |
		discordgo.IntentsGuildMessages |
		discordgo.IntentsGuildVoiceStates |
		discordgo.IntentsMessageContent

	err = dg.Open()
	if err != nil {
		log.Fatal("[error]: opening the connection to discord; ", err)
	}

	fmt.Println("Woofer bot is now running. Press CTRL+C to exit the execution.")
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt)
	<-stop

	dg.Close()
}
