# LineRunner — Version 1

A free, local-first actor's line rehearsal app. No account, subscription, or paid API is required.

## Quick start

1. Extract the ZIP into a folder.
2. **Windows:** double-click `start-windows.bat` (requires free Python installed). Alternatively, open a terminal in the folder and run `python -m http.server 8000` (Windows may require `py -m http.server 8000`).
3. Open **http://localhost:8000** in Chrome or Edge.
4. Create a play or standalone scene, then add dialogue. On Chrome/Edge, you can use the browser's Install app option if offered.

**Important:** Microphone access requires `localhost` or an HTTPS website. Simply double-clicking `index.html` can prevent recording or offline installation. A local server runs on your computer; it is not a paid service and does not upload your recordings.

## What works

- Organize standalone scenes and scenes under plays.
- Create character profiles; reuse characters; upload a selfie/icon; set TTS voice, pitch, speed and volume.
- Add dialogue tiles with typed text or individual microphone recordings.
- Record, stop, review, **Save**, or **Delete** audio. One saved recording per tile.
- Edit each line's text independently of recorded audio.
- Dictate using Windows **Win + H** or your device keyboard microphone. An optional in-app dictation control works when browser speech recognition is available.
- Choose free text-to-speech voices installed in your browser/device.
- Play a scene sequentially with active tile highlighting, or play a single line.
- Mute individual lines or entire characters for rehearsal. Muted lines keep their original duration plus **0–30 seconds** of optional extra time.
- Reveal/hide individual dialogue tiles like flashcards; show/hide all text.
- Listen, Rehearsal, Memorization and looping scene playback.
- Reorder by dragging the grip (desktop) or move controls (desktop); edit, delete, and add dialogue.
- Save data locally in IndexedDB and export/import a JSON backup including audio and avatars.
- Offline app shell after a successful visit through localhost/HTTPS, subject to browser support.

## Limitations of this first version

- **Speech recognition:** Browser support varies. Web Speech recognition may require internet access and may send audio to a browser vendor. Use device dictation or manually correct transcripts if unavailable. Recording does **not** automatically guarantee transcription.
- **TTS voices:** Choice and quality depend on voices supplied by your operating system/browser. TTS plays through the browser and is not exported as a standalone sound file.
- **Voice effects:** Basic tone filters (Warm, Bright, Telephone) and playback-rate adjustment are included. Changing playback rate generally affects both pitch and speed; realistic voice conversion is not included.
- **Playback timing:** Recording lengths are measured when possible. Some browser audio formats may only allow an estimated fallback. TTS duration and silent slots without recordings use word-count estimates, not precise synthesis timings.
- **Recording:** Recording is supported where MediaRecorder and microphone permission are available. Transcription is a separate optional step. Video, cloud sync, collaborative editing, automatic cue recognition and WAV/MP3 export are not part of version 1.
- **Local storage:** Clearing browser site data may permanently delete projects. Export backups regularly and keep them safe. Backups contain voice recordings and should be treated as private files.
- **Mobile ordering:** Use the up/down controls to reorder on a phone; desktop browsers additionally support dragging a tile by its grip.

## Privacy

LineRunner does not have its own server, analytics, sign-in or paid services. Scene data, avatars and captured recordings are stored locally in the current browser profile. Browser-provided text-to-speech and speech recognition can have their own OS/browser privacy and networking behavior.

## Technical files

- `index.html` — app structure
- `styles.css` — responsive styling
- `app.js` — app state, editor, audio, rehearsal and local storage
- `sw.js` — offline app-shell cache
- `manifest.webmanifest` and `icon.svg` — installable PWA metadata
