package commands

import (
	"bufio"
	"bytes"
	"encoding/binary"
	"encoding/json"
	"errors"
	"io"
	"log"
	"os"
	"os/exec"
	"time"

	"github.com/bwmarrin/discordgo"
	"gopkg.in/hraban/opus.v2"
)

type YtFormat struct {
	FormatID string  `json:"format_id"`
	Height   int     `json:"height"` // for video
	Acodec   string  `json:"acodec"` // "none" if no audio
	Vcodec   string  `json:"vcodec"` // "none" if no video
	URL      string  `json:"url"`
	Tbr      float64 `json:"tbr"`      // total bitrate
	Filesize int64   `json:"filesize"` // optional
}

type YtEntry struct {
	Title    string     `json:"title"`
	Duration int        `json:"duration"`
	Formats  []YtFormat `json:"formats"`
}

type YtPlaylist struct {
	Entries []YtEntry `json:"entries"`
}

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

	// Find the user's voice channel
	var voiceChannelID string
	guild, err := s.State.Guild(guildID)
	if err != nil {
		log.Println("guild fetch error:", err)
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

	// Join voice
	vc, err := s.ChannelVoiceJoin(guildID, voiceChannelID, false, true)
	if err != nil {
		content := "❌ Failed to join voice channel."
		s.InteractionResponseEdit(i.Interaction, &discordgo.WebhookEdit{
			Content: &content,
		})
		log.Println("voice join error:", err)
		return
	}

	audioURL, _, err := getAudioURLAndInfo(query)
	if err != nil {
		content := "❌ Could not fetch stream URL."
		s.InteractionResponseEdit(i.Interaction, &discordgo.WebhookEdit{
			Content: &content,
		})
		vc.Disconnect()
		log.Println("yt-dlp error:", err)
		return
	}

	embed := &discordgo.MessageEmbed{
		Title:     "🏓 Pong!",
		Color:     0x00ffcc, // cyan-like color
		Timestamp: time.Now().Format(time.RFC3339),
		Footer:    &discordgo.MessageEmbedFooter{},
		Text:      "Woofer Bot",
	}

	s.InteractionResponseEdit(i.Interaction, &discordgo.WebhookEdit{
		Embeds: &[]*discordgo.MessageEmbed{},
	})

	go func() {
		defer vc.Disconnect()
		if err := streamAudio(vc, audioURL); err != nil {
			log.Println("streaming error:", err)
		}
	}()
}

// not exposed functions
func getAudioURLAndInfo(query string) (string, *YtEntry, error) {
	cmd := exec.Command("yt-dlp", "--default-search", "ytsearch1", "-J", query)
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return "", nil, err
	}

	var playlist YtPlaylist
	if err := json.Unmarshal(out.Bytes(), &playlist); err != nil {
		return "", nil, err
	}

	if len(playlist.Entries) == 0 {
		return "", nil, errors.New("no results found")
	}

	entry := playlist.Entries[0]

	var best *YtFormat

	for _, f := range entry.Formats {
		if f.Acodec != "none" && f.Vcodec == "none" { // audio only
			if best == nil || f.Tbr > best.Tbr {
				best = &f
			}
		}
	}

	if best == nil {
		return "", nil, errors.New("no audio-only format found")
	}

	return best.URL, &entry, nil
}

func streamAudio(vc *discordgo.VoiceConnection, audioURL string) error {
	cmd := exec.Command("ffmpeg", "-i", audioURL,
		"-filter:a", "volume=1.5",
		"-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1")

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}
	go io.Copy(os.Stderr, stderr)

	if err := cmd.Start(); err != nil {
		return err
	}

	const sampleRate = 48000
	const frameSize = 960                       // 20ms
	const channels = 2                          // stereo
	const frameBytes = frameSize * channels * 2 // 2 bytes per sample

	reader := bufio.NewReaderSize(stdout, frameBytes*4)
	encoder, err := opus.NewEncoder(sampleRate, channels, opus.AppVoIP)
	if err != nil {
		return err
	}

	ticker := time.NewTicker(20 * time.Millisecond)
	defer ticker.Stop()

	buf := make([]byte, frameBytes)
	for {
		_, err := io.ReadFull(reader, buf)
		if err != nil {
			// could be io.EOF try to understand why does this happen and this check doesn't work err == EOF
			log.Println("[error] audio read error; ", err)
			break
		}

		// Convert to int16 samples
		samples := make([]int16, frameSize*channels)
		for i := range samples {
			samples[i] = int16(binary.LittleEndian.Uint16(buf[i*2 : i*2+2]))
		}

		// Encode with Opus
		opusBuf := make([]byte, 1000)
		n, err := encoder.Encode(samples, opusBuf)
		if err != nil {
			log.Println("[error]: opus encode error; ", err)
			break
		}

		select {
		case vc.OpusSend <- opusBuf[:n]:
		default:
			log.Println("[warning]: dropped audio frame (OpusSend blocked)")
		}

		<-ticker.C
	}

	close(vc.OpusSend)
	return cmd.Wait()
}
