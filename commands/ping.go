package commands

import (
	"fmt"
	"log"
	"time"

	"github.com/bwmarrin/discordgo"
)

var PingCommand *discordgo.ApplicationCommand = &discordgo.ApplicationCommand{
	Name:        "ping",
	Description: "Ping the latency of the bot.",
}

func PingHandler(s *discordgo.Session, i *discordgo.InteractionCreate) {
	latency := s.HeartbeatLatency()

	embed := &discordgo.MessageEmbed{
		Title:       "🏓 Pong!",
		Description: fmt.Sprintf("Latency: `%dms`", latency.Milliseconds()),
		Color:       0x00ffcc, // cyan-like color
		Timestamp:   time.Now().Format(time.RFC3339),
		Footer: &discordgo.MessageEmbedFooter{
			Text: "Woofer Bot",
		},
	}

	response := &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Embeds: []*discordgo.MessageEmbed{embed},
		},
	}

	err := s.InteractionRespond(i.Interaction, response)
	if err != nil {
		log.Println("[error]: while sending ping embed; ", err)
	}
}
