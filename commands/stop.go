package commands

import (
	"github.com/guillermoriv/woofer-bot/music"

	"github.com/bwmarrin/discordgo"
)

var StopCommand *discordgo.ApplicationCommand = &discordgo.ApplicationCommand{
	Name:        "stop",
	Description: "Stop the bot from playing music.",
}

func StopHandler(s *discordgo.Session, i *discordgo.InteractionCreate) {
	guildID := i.GuildID
	player := music.GetOrCreatePlayer(guildID)

	player.Stop()

	content := "🛑 Stopped music and cleared the queue."
	s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: content,
		},
	})
}
