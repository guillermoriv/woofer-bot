package music

import (
	"bytes"
	"container/list"
	"context"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"os/exec"
	"sync"
	"time"

	"github.com/bwmarrin/discordgo"
	"gopkg.in/hraban/opus.v2"
)

const (
	sampleRate = 48000
	frameSize  = 960
	channels   = 2
	frameBytes = frameSize * channels * 2
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

type Track struct {
	Title       string
	Duration    int
	AudioURL    string
	TrackCancel context.CancelFunc
	TrackCtx    context.Context
}

type GuildMusicPlayer struct {
	Queue      *list.List
	NowPlaying *Track
	Playing    bool
	VoiceConn  *discordgo.VoiceConnection
	Mutex      sync.Mutex
}

var (
	GuildPlayers     = make(map[string]*GuildMusicPlayer)
	GuildPlayersLock sync.RWMutex
)

func GetOrCreatePlayer(guildID string) *GuildMusicPlayer {
	GuildPlayersLock.RLock()
	player, ok := GuildPlayers[guildID]
	GuildPlayersLock.RUnlock()

	if !ok {
		GuildPlayersLock.Lock()
		defer GuildPlayersLock.Unlock()

		player, ok = GuildPlayers[guildID]
		if !ok {
			player = &GuildMusicPlayer{
				Queue: list.New(),
				Mutex: sync.Mutex{},
			}
			GuildPlayers[guildID] = player
		}
	}
	return player
}

func (p *GuildMusicPlayer) Enqueue(track *Track) *Track {
	p.Mutex.Lock()
	defer p.Mutex.Unlock()

	elem := p.Queue.PushBack(track)
	return elem.Value.(*Track)
}

func (p *GuildMusicPlayer) NextTrack() *Track {
	p.Mutex.Lock()
	defer p.Mutex.Unlock()

	elem := p.Queue.Front()
	if elem == nil {
		p.NowPlaying = nil
		return nil
	}

	p.Queue.Remove(elem)
	track := elem.Value.(*Track)
	p.NowPlaying = track
	return track
}

func (p *GuildMusicPlayer) Skip() {
	p.Mutex.Lock()
	defer p.Mutex.Unlock()

	if p.NowPlaying.TrackCancel != nil {
		p.NowPlaying.TrackCancel()
	}
}

func (p *GuildMusicPlayer) Stop() {
	p.Mutex.Lock()
	defer p.Mutex.Unlock()

	p.Queue.Init()
	p.NowPlaying.TrackCancel()
}

func (p *GuildMusicPlayer) StreamAudio(vc *discordgo.VoiceConnection) error {
	cmd := exec.CommandContext(p.NowPlaying.TrackCtx, "ffmpeg", "-i", p.NowPlaying.AudioURL,
		"-filter:a", "volume=1.5",
		"-f", "s16le", "-ar", fmt.Sprintf("%d", sampleRate), "-ac", fmt.Sprintf("%d", channels), "pipe:1")

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}

	cmd.Stderr = io.Discard

	if err := cmd.Start(); err != nil {
		return err
	}

	encoder, err := opus.NewEncoder(sampleRate, channels, opus.AppVoIP)
	if err != nil {
		return err
	}

	buf := make([]byte, frameBytes)
	opusBuf := make([]byte, 1000) // reuse buffer every iteration

	ticker := time.NewTicker(20 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-p.NowPlaying.TrackCtx.Done():
			return p.NowPlaying.TrackCtx.Err()
		default:
			_, err := io.ReadFull(stdout, buf)
			if err != nil {
				if err == io.EOF || err == io.ErrUnexpectedEOF {
					return nil
				}
				log.Println("[error] reading ffmpeg stdout:", err)
				return err
			}

			samples := bytesToInt16Samples(buf)
			n, err := encoder.Encode(samples, opusBuf)
			if err != nil {
				log.Println("[error] encoding opus:", err)
				return err
			}

			select {
			case vc.OpusSend <- opusBuf[:n]:
			default:
				log.Println("[warn] dropped frame (OpusSend blocked) check out logs")
			}
		}

		<-ticker.C
	}
}

func bytesToInt16Samples(buf []byte) []int16 {
	samples := make([]int16, len(buf)/2)
	for i := range samples {
		samples[i] = int16(binary.LittleEndian.Uint16(buf[i*2 : i*2+2]))
	}
	return samples
}

func (p *GuildMusicPlayer) GetAudioURLAndInfo(query string) (*Track, error) {
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

	trackCtx, trackCancel := context.WithCancel(context.Background())

	return &Track{AudioURL: best.URL, Title: entry.Title, Duration: entry.Duration, TrackCtx: trackCtx, TrackCancel: trackCancel}, nil
}
