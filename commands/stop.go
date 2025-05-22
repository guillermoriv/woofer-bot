package commands

import (
	"log"

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

	player.Mutex.Lock()
	defer player.Mutex.Unlock()

	// Cancel the running playback goroutine
	if player.CancelFunc != nil {
		player.CancelFunc()
		player.CancelFunc = nil
	}

	// Clear the queue and reset state
	player.Queue.Init()
	player.NowPlaying = nil
	player.Playing = false

	// Disconnect from voice if connected
	if player.VoiceConn != nil {
		err := player.VoiceConn.Disconnect()
		if err != nil {
			log.Println("[error]: voice disconnect error; ", err)
		}
		player.VoiceConn = nil
	}

	// Respond to user
	content := "🛑 Stopped music and cleared the queue."
	s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: content,
		},
	})
}
