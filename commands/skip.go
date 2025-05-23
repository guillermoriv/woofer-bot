package commands

import (
	"log"

	"github.com/bwmarrin/discordgo"
	"github.com/guillermoriv/woofer-bot/music"
)

var SkipCommand *discordgo.ApplicationCommand = &discordgo.ApplicationCommand{
	Name:        "skip",
	Description: "Skip current song.",
}

func SkipHandler(s *discordgo.Session, i *discordgo.InteractionCreate) {
	guildID := i.GuildID
	playerGuild := music.GetOrCreatePlayer(guildID)

	playerGuild.Skip()

	err := s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: "Skipping current song: " + playerGuild.NowPlaying.Title,
		},
	})
	if err != nil {
		log.Println("[error]: sending empty queue response:", err)
	}
}
