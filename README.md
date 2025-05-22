Discord Audio Bot (Go)

A simple Discord bot written in Go using discordgo for interactions and voice. It streams audio from YouTube using yt-dlp, processes the audio with ffmpeg, and encodes it to little endian PCM to be transmitted over Discord voice channels.

This project was mainly created to experiment with:

    sync.Mutex for safe concurrent access

    context.Context to control goroutines

    Streaming and encoding audio in real time

    Building a basic queue system for song requests

Features

    Streams audio from YouTube links

    Encodes and sends audio using Opus format to Discord voice channels

    Supports a simple in-memory song queue

    Demonstrates proper use of concurrency in Go

Requirements

    Go

    ffmpeg (installed and in your PATH)

    yt-dlp (installed and in your PATH)

    A Discord bot token
