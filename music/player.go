package music

import (
	"container/list"
	"context"
	"sync"

	"github.com/bwmarrin/discordgo"
)

type Track struct {
	Title    string
	Duration int
	AudioURL string
}

type GuildMusicPlayer struct {
	Queue      *list.List
	NowPlaying *Track
	Playing    bool
	VoiceConn  *discordgo.VoiceConnection
	CancelFunc context.CancelFunc
	Mutex      sync.Mutex
}

var GuildPlayers = make(map[string]*GuildMusicPlayer)

func GetOrCreatePlayer(guildID string) *GuildMusicPlayer {
	player, ok := GuildPlayers[guildID]

	if !ok {
		player = &GuildMusicPlayer{Queue: list.New(), Mutex: sync.Mutex{}, NowPlaying: nil, VoiceConn: nil}
		GuildPlayers[guildID] = player
	}

	return player
}
