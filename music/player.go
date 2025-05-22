package music

import "github.com/bwmarrin/discordgo"

type Track struct{}

type GuildMusicPlayer struct {
	Queue      []Track
	NowPlaying *Track
	VoiceConn  *discordgo.VoiceConnection
	StopChan   chan struct{}
}

var GuildPlayers = make(map[string]*GuildMusicPlayer)

func GetOrCreatePlayer(guildID string) *GuildMusicPlayer {
	player, ok := GuildPlayers[guildID]

	if !ok {
		player = &GuildMusicPlayer{}
		GuildPlayers[guildID] = player
	}

	return player
}
