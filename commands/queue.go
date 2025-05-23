package commands

import (
	"fmt"
	"log"
	"strings"

	"github.com/bwmarrin/discordgo"
	"github.com/guillermoriv/woofer-bot/music"
)

var QueueCommand *discordgo.ApplicationCommand = &discordgo.ApplicationCommand{
	Name:        "queue",
	Description: "List all the songs in the queue.",
}

func QueueHandler(s *discordgo.Session, i *discordgo.InteractionCreate) {
	guildID := i.GuildID
	playerGuild := music.GetOrCreatePlayer(guildID)

	playerGuild.Mutex.Lock()
	defer playerGuild.Mutex.Unlock()

	if playerGuild.Queue.Len() == 0 {
		err := s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Content: "🎵 The queue is currently empty.",
			},
		})
		if err != nil {
			log.Println("[error]: sending empty queue response:", err)
		}
		return
	}

	var sb strings.Builder
	elem := playerGuild.Queue.Front()
	index := 1
	for elem != nil {
		if song, ok := elem.Value.(*music.Track); ok {
			sb.WriteString(fmt.Sprintf("`%d.` **%s**\n", index, song.Title))
			index++
		}
		elem = elem.Next()
	}

	embed := &discordgo.MessageEmbed{
		Title:       "🎶 Current Queue",
		Description: sb.String(),
		Color:       0x1DB954, // Spotify green
	}

	response := &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Embeds: []*discordgo.MessageEmbed{embed},
		},
	}

	err := s.InteractionRespond(i.Interaction, response)
	if err != nil {
		log.Println("[error]: while sending queue embed; ", err)
	}
}
