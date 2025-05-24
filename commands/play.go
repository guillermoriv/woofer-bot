package commands

import (
	"fmt"
	"log"
	"time"

	"github.com/bwmarrin/discordgo"
	"github.com/guillermoriv/woofer-bot/music"
)

var PlayCommand = &discordgo.ApplicationCommand{
	Name:        "play",
	Description: "Play a song by name or URL",
	Options: []*discordgo.ApplicationCommandOption{
		{
			Type:        discordgo.ApplicationCommandOptionString,
			Name:        "query",
			Description: "Name or URL of the song to play",
			Required:    true,
		},
	},
}

func PlayHandler(s *discordgo.Session, i *discordgo.InteractionCreate) {
	s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Content: "🔍 Searching...",
		},
	})

	query := i.ApplicationCommandData().Options[0].StringValue()
	guildID := i.GuildID
	userID := i.Member.User.ID

	var voiceChannelID string
	guild, err := s.State.Guild(guildID)
	if err != nil {
		log.Println("[error]: guild fetch error; ", err)
		return
	}

	for _, vs := range guild.VoiceStates {
		if vs.UserID == userID {
			voiceChannelID = vs.ChannelID
			break
		}
	}

	if voiceChannelID == "" {
		content := "❌ You must be in a voice channel."
		s.InteractionResponseEdit(i.Interaction, &discordgo.WebhookEdit{
			Content: &content,
		})
		return
	}

	playerGuild := music.GetOrCreatePlayer(guildID)
	track, err := playerGuild.GetAudioURLAndInfo(query)
	if err != nil {
		content := "❌ Could not fetch stream URL."
		s.InteractionResponseEdit(i.Interaction, &discordgo.WebhookEdit{
			Content: &content,
		})
		log.Println("[error]: yt-dlp error; ", err)
		return
	}

	playerGuild.Enqueue(track)
	shouldStartStream := !playerGuild.Playing && playerGuild.NowPlaying == nil

	if !shouldStartStream {
		content := "Added to the queue!"
		embed := &discordgo.MessageEmbed{
			Title:       track.Title,
			Color:       0x00ffcc,
			Description: fmt.Sprintf("%d:%dm - Duration", track.Duration/60, track.Duration%60),
			Timestamp:   time.Now().Format(time.RFC3339),
			Footer: &discordgo.MessageEmbedFooter{
				Text: "Woofer Bot",
			},
		}

		s.InteractionResponseEdit(i.Interaction, &discordgo.WebhookEdit{
			Content: &content,
			Embeds:  &[]*discordgo.MessageEmbed{embed},
		})
		return
	}

	playerGuild.Mutex.Lock()
	playerGuild.Playing = true
	playerGuild.Mutex.Unlock()

	var vc *discordgo.VoiceConnection

	if playerGuild.VoiceConn == nil {
		vc, err = s.ChannelVoiceJoin(guildID, voiceChannelID, false, true)
		if err != nil {
			content := "❌ Failed to join voice channel."
			s.InteractionResponseEdit(i.Interaction, &discordgo.WebhookEdit{
				Content: &content,
			})
			log.Println("[error]: voice join error; ", err)
			return
		}
		playerGuild.Mutex.Lock()
		playerGuild.VoiceConn = vc
		playerGuild.Mutex.Unlock()
	} else {
		playerGuild.Mutex.Lock()
		vc = playerGuild.VoiceConn
		playerGuild.Mutex.Unlock()
	}

	embed := &discordgo.MessageEmbed{
		Title:       track.Title,
		Color:       0x00ffcc,
		Description: fmt.Sprintf("%d:%dm - Duration", track.Duration/60, track.Duration%60),
		Timestamp:   time.Now().Format(time.RFC3339),
		Footer: &discordgo.MessageEmbedFooter{
			Text: "Woofer Bot",
		},
	}

	content := "🎵 Streaming now!"
	s.InteractionResponseEdit(i.Interaction, &discordgo.WebhookEdit{
		Embeds:  &[]*discordgo.MessageEmbed{embed},
		Content: &content,
	})

	go func() {
		defer func() {
			playerGuild.Mutex.Lock()
			playerGuild.Playing = false
			playerGuild.VoiceConn = nil
			playerGuild.Mutex.Unlock()

			if vc != nil {
				vc.Disconnect()
			}
		}()

		for {
			track := playerGuild.NextTrack()

			if track == nil {
				break
			}

			err := playerGuild.StreamAudio()
			if err != nil {
				log.Println("[error]: streamAudio failed: ", err)
			}
		}
	}()
}
