# /public/beats/

Place beat audio files here. They are served as static assets at `/beats/<filename>`.

## Current placeholder

| File | Note |
|---|---|
| `brooklyn-bounce.wav` | **Synthetic placeholder** — generated with Python stdlib (sine sweep kick, noise snare, hi-hat). 24 s, 92 BPM, 44100 Hz / 16-bit mono / ~2 MB. |

Referenced in `lib/daily-challenge.ts` → `DAILY_BEAT.audioUrl`.

## To replace with a real beat

1. Drop a licensed mp3 at `public/beats/brooklyn-bounce.mp3`
2. In `lib/daily-challenge.ts` update:
   ```ts
   audioUrl: "/beats/brooklyn-bounce.mp3",
   durationSec: <actual length in seconds>,
   ```
3. Restart `pnpm dev` (or it picks up immediately).
4. Delete `brooklyn-bounce.wav` once the mp3 is confirmed working.

## Rules

- Do NOT commit copyrighted audio.
- Files > 10 MB should be hosted on a CDN (Vercel Blob, S3, R2) and referenced by full URL.
- Cover art goes in `public/beats/covers/<filename>.jpg` (optional).
