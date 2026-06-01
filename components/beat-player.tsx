"use client";

import { useState, useRef, useEffect } from "react";
import { formatDuration } from "@/lib/utils";
import type { BeatDTO } from "@/lib/types";

interface BeatPlayerProps {
  beat: BeatDTO;
}

export function BeatPlayer({ beat }: BeatPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(beat.durationSec ?? 0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration);
    const onCanPlay = () => setIsLoaded(true);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        // Autoplay blocked or file not found
      }
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <audio ref={audioRef} src={beat.audioUrl} preload="metadata" />

      <div className="flex items-center gap-4">
        {/* Play/Pause button */}
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center font-black text-lg hover:bg-amber-300 active:scale-95 transition-all flex-shrink-0"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white truncate">{beat.title}</p>
          <p className="text-xs text-zinc-500">
            {beat.genre}
            {beat.bpm ? ` · ${beat.bpm} BPM` : ""}
          </p>

          {/* Progress bar */}
          <div className="mt-2 relative">
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
              aria-label="Seek"
            />
          </div>

          {/* Time */}
          <div className="flex justify-between mt-1">
            <span className="text-xs text-zinc-600">
              {formatDuration(Math.floor(currentTime))}
            </span>
            <span className="text-xs text-zinc-600">
              {formatDuration(Math.floor(duration))}
            </span>
          </div>
        </div>
      </div>

      {!isLoaded && !isPlaying && (
        <p className="text-xs text-zinc-600 mt-2 text-center">
          Tap ▶ to load and play the beat
        </p>
      )}
    </div>
  );
}
