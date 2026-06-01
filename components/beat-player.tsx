"use client";

import { useState, useRef, useEffect } from "react";
import { formatDuration, cn } from "@/lib/utils";
import type { BeatDTO } from "@/lib/types";

const WAVEFORM = [30,55,40,75,50,85,35,65,45,80,60,40,90,55,70,35,80,50,75,42,88,60,38,72,48,82,55,38,68,45,85,52];

interface BeatPlayerProps {
  beat: BeatDTO;
}

export function BeatPlayer({ beat }: BeatPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(beat.durationSec ?? 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
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
        // Autoplay blocked or audio file missing
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
            <span className="text-xs text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
              🔁 LOOP
            </span>
          </div>
        </div>

        {/* Play / pause button */}
        <button
          onClick={togglePlay}
          className="w-11 h-11 rounded-full bg-violet-600 hover:bg-violet-500 active:scale-90 transition-all flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-900/40"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          <span className="text-sm leading-none">{isPlaying ? "⏸" : "▶"}</span>
        </button>
      </div>

      {/* Waveform + seek */}
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
            className="absolute inset-0 w-full h-8 opacity-0 cursor-pointer"
            aria-label="Seek"
          />
        </div>

        {/* Time stamps */}
        <div className="flex justify-between">
          <span className="text-xs font-mono text-zinc-600">
            {formatDuration(Math.floor(currentTime))}
          </span>
          <span className="text-xs font-mono text-zinc-600">
            {formatDuration(Math.floor(duration))}
          </span>
        </div>
      </div>
    </div>
  );
}
