package commands

import (
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"time"

	"github.com/bwmarrin/discordgo"
	"github.com/guillermoriv/woofer-bot/music"
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

	track, err := getAudioURLAndInfo(query)
	if err != nil {
		content := "❌ Could not fetch stream URL."
		s.InteractionResponseEdit(i.Interaction, &discordgo.WebhookEdit{
			Content: &content,
		})
		log.Println("[error]: yt-dlp error; ", err)
		return
	}

	playerGuild := music.GetOrCreatePlayer(guildID)

	playerGuild.Mutex.Lock()

	// Cancel previous stream if any
	if playerGuild.CancelFunc != nil {
		playerGuild.CancelFunc()
		playerGuild.CancelFunc = nil
	}

	ctx, cancel := context.WithCancel(context.Background())
	playerGuild.CancelFunc = cancel
	playerGuild.Queue.PushBack(track)

	shouldStartStream := !playerGuild.Playing && playerGuild.NowPlaying == nil
	playerGuild.Playing = true
	playerGuild.Mutex.Unlock()

	if !shouldStartStream {
		// Song added to queue, streaming already happening
		content := fmt.Sprintf("🎶 Added to queue: %s", track.Title)
		s.InteractionResponseEdit(i.Interaction, &discordgo.WebhookEdit{Content: &content})
		return
	}

	playerGuild.Playing = true
	playerGuild.Mutex.Unlock()

	var vc *discordgo.VoiceConnection

	if playerGuild.VoiceConn == nil {
		vc, err = s.ChannelVoiceJoin(guildID, voiceChannelID, false, true)
		if err != nil {
			playerGuild.Mutex.Lock()
			playerGuild.Playing = false
			playerGuild.Mutex.Unlock()

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

	go func(ctx context.Context) {
		defer func() {
			playerGuild.Mutex.Lock()
			playerGuild.Playing = false
			playerGuild.CancelFunc = nil
			playerGuild.Mutex.Unlock()

			if vc != nil {
				vc.Disconnect()
			}
		}()

		for {
			playerGuild.Mutex.Lock()
			if playerGuild.Queue.Len() == 0 {
				playerGuild.Mutex.Unlock()
				break
			}

			element := playerGuild.Queue.Front()
			track := element.Value.(*music.Track)
			playerGuild.NowPlaying = track
			playerGuild.Mutex.Unlock()

			select {
			case <-ctx.Done():
				log.Println("[info]: Stream cancelled.")
				return
			default:
				// Safe to continue
			}

			s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
				Type: discordgo.InteractionResponseChannelMessageWithSource,
				Data: &discordgo.InteractionResponseData{
					Content: fmt.Sprintf("🎵 Now playing: %s", track.Title),
				},
			})

			err := streamAudio(vc, track.AudioURL)

			playerGuild.Mutex.Lock()
			playerGuild.Queue.Remove(element)
			playerGuild.NowPlaying = nil
			playerGuild.Mutex.Unlock()

			if err != nil {
				log.Println("[error]: streamAudio failed: ", err)
			}
		}
	}(ctx)
}

// not exposed functions
func getAudioURLAndInfo(query string) (*music.Track, error) {
	cmd := exec.Command("yt-dlp", "--default-search", "ytsearch1", "-J", query)
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return nil, err
	}

	var playlist YtPlaylist
	if err := json.Unmarshal(out.Bytes(), &playlist); err != nil {
		return nil, err
	}

	if len(playlist.Entries) == 0 {
		return nil, errors.New("no results found")
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
		return nil, errors.New("no audio-only format found")
	}

	return &music.Track{AudioURL: best.URL, Title: entry.Title, Duration: entry.Duration}, nil
}

func streamAudio(vc *discordgo.VoiceConnection, audioURL string) error {
	const sampleRate = 48000
	const frameSize = 960
	const channels = 2
	const frameBytes = frameSize * channels * 2

	cmd := exec.Command("ffmpeg", "-i", audioURL,
		"-filter:a", "volume=1.5",
		"-f", "s16le", "-ar", "48000", "-ac", fmt.Sprintf("%d", channels), "pipe:1")

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

	encoder, err := opus.NewEncoder(sampleRate, channels, opus.AppVoIP)
	if err != nil {
		return err
	}

	buf := make([]byte, frameBytes)
	opusBuf := make([]byte, 1000) // reuse buffer every iteration

	for {
		_, err := io.ReadFull(stdout, buf)
		if err != nil {
			if err == io.EOF || err == io.ErrUnexpectedEOF {
				break
			}
			log.Println("[error] reading ffmpeg stdout:", err)
			break
		}

		samples := bytesToInt16Samples(buf)

		n, err := encoder.Encode(samples, opusBuf)
		if err != nil {
			log.Println("[error] encoding opus:", err)
			break
		}

		select {
		case vc.OpusSend <- opusBuf[:n]:
		default:
			log.Println("[warn] dropped frame (OpusSend blocked)")
		}

		time.Sleep(20 * time.Millisecond)
	}

	return cmd.Wait()
}

func bytesToInt16Samples(buf []byte) []int16 {
	samples := make([]int16, len(buf)/2)
	for i := range samples {
		samples[i] = int16(binary.LittleEndian.Uint16(buf[i*2 : i*2+2]))
	}
	return samples
}
