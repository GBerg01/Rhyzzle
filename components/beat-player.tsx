"use client";

import { useState, useRef, useEffect } from "react";
import { formatDuration, cn } from "@/lib/utils";
import type { BeatDTO } from "@/lib/types";

const WAVEFORM = [30,55,40,75,50,85,35,65,45,80,60,40,90,55,70,35,80,50,75,42,88,60,38,72,48,82,55,38,68,45,85,52];

type AudioState = "idle" | "loading" | "ready" | "error";

interface BeatPlayerProps {
  beat: BeatDTO;
}

export function BeatPlayer({ beat }: BeatPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(beat.durationSec ?? 0);
  const [audioState, setAudioState] = useState<AudioState>("idle");

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadStart = () => setAudioState("loading");
    const onLoadedMetadata = () => {
      setAudioState("ready");
      setDuration(audio.duration);
    };
    const onCanPlay = () => setAudioState("ready");
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => setIsPlaying(false);
    const onError = () => {
      setAudioState("error");
      setIsPlaying(false);
    };

    audio.addEventListener("loadstart", onLoadStart);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    // Catch files that already errored before listeners attached
    if (audio.error) setAudioState("error");

    return () => {
      audio.removeEventListener("loadstart", onLoadStart);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, []);

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio || audioState === "error" || audioState === "loading") return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setAudioState("error");
      }
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio || audioState !== "ready") return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  // Filename extracted from URL for the missing-file message
  const audioFilename = beat.audioUrl.split("/").pop() ?? "beat.mp3";
  const isDisabled = audioState === "error" || audioState === "loading";

  return (
    <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/60 rounded-2xl overflow-hidden">
      <audio ref={audioRef} src={beat.audioUrl} preload="metadata" />

      {/* Track info row */}
      <div className="flex items-center gap-3 p-4">
        {/* Artwork placeholder */}
        <div className="w-14 h-14 rounded-xl flex-shrink-0 bg-gradient-to-br from-violet-700 to-indigo-900 flex items-center justify-center text-2xl shadow-lg select-none">
          🎵
        </div>

        {/* Track metadata */}
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-sm leading-tight truncate">
            {beat.title}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5 truncate">
            {beat.artist ?? "Unknown Producer"}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {beat.bpm && (
              <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                {beat.bpm} BPM
              </span>
            )}
            {beat.genre && (
              <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                {beat.genre}
              </span>
            )}
            {audioState === "loading" && (
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                Loading…
              </span>
            )}
            {audioState === "ready" && (
              <span className="text-xs text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                🔁 LOOP
              </span>
            )}
            {audioState === "error" && (
              <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                Unavailable
              </span>
            )}
          </div>
        </div>

        {/* Play / pause button */}
        <button
          onClick={togglePlay}
          disabled={isDisabled}
          className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg transition-all active:scale-90",
            isDisabled
              ? "bg-zinc-800 cursor-not-allowed opacity-50"
              : "bg-violet-600 hover:bg-violet-500 shadow-violet-900/40"
          )}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          <span className="text-sm leading-none">
            {audioState === "loading" ? "⏳" : isPlaying ? "⏸" : "▶"}
          </span>
        </button>
      </div>

      {/* Waveform / error state */}
      {audioState === "error" ? (
        <div className="px-4 pb-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-3 space-y-1">
            <p className="text-xs font-semibold text-red-400">Beat file missing</p>
            <p className="text-xs text-zinc-500 font-mono">
              Add: public/beats/{audioFilename}
            </p>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-4">
          <div className="relative mb-1">
            {/* Visual bars */}
            <div className="flex items-end gap-px h-8 pointer-events-none" aria-hidden>
              {WAVEFORM.map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-sm transition-colors duration-75",
                    progress > (i / WAVEFORM.length) * 100
                      ? "bg-violet-500"
                      : "bg-zinc-700"
                  )}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            {/* Invisible seek overlay */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              disabled={audioState !== "ready"}
              className="absolute inset-0 w-full h-8 opacity-0 cursor-pointer disabled:cursor-default"
              aria-label="Seek"
            />
          </div>

          {/* Timestamps */}
          <div className="flex justify-between">
            <span className="text-xs font-mono text-zinc-600">
              {formatDuration(Math.floor(currentTime))}
            </span>
            <span className="text-xs font-mono text-zinc-600">
              {audioState === "loading" ? "—:——" : formatDuration(Math.floor(duration))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
