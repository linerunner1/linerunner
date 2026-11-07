# LineRunner — Android test edition

LineRunner is a free Android-first **Progressive Web App** (PWA), not an APK. It installs to your Android home screen using Google Chrome after being served from HTTPS. No app store, payment, subscription, server-side database, or API key is required.

## Install and test on Android (recommended: free GitHub Pages)

1. On a computer, extract `LineRunner-Android-Test.zip`. The web app is in the `linerunner` folder.
2. Create a free GitHub account if you don't have one, and create a **public** repository named `linerunner` (or another name). A public repo means the source code is visible; **your projects and recordings are not uploaded to it**, because they are created and saved locally in your phone's browser.
3. Upload **the contents** of the `linerunner` folder into the repository root: `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, the icons and this README. Do **not** upload recordings or exported backups.
4. Go to repository **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, `main`, `/ (root)`, then Save.
5. Once GitHub Pages shows the site address, open `https://YOUR-USERNAME.github.io/linerunner/` on your Android phone in **Chrome**. (The path will use the actual repository name.)
6. Open Chrome's ⋮ menu and choose **Install app** or **Add to Home screen** if offered. Open the installed LineRunner icon.
7. Create a standalone scene, add a character, choose Record, and allow microphone access. Record and Save. Add a second text-to-speech character and test Play scene, Mute, Reveal and reordering.

GitHub Pages is free for public repositories. It hosts only the application's static code; recordings and script projects are stored in your phone's browser, not on GitHub. This is not completely private **source-code hosting**, but your data remains local unless you export and share a backup. If you require a private code repository and hosting, choose another HTTPS static host that supports your requirements.

## Important Android details

- **Recording requires HTTPS** and microphone permission. Opening the HTML as a `file://` document may show the editor but generally won't allow recording or installability.
- **Dictation**: tap the editable transcript/text field and use Gboard's microphone icon. Optional browser speech recognition support varies, and may use online services. Recordings are saved separately from transcripts.
- **TTS**: uses free voices made available by Android/Chrome. Available voices, gender presentation, quality and offline availability depend on the device, browser and voice packages.
- **Offline**: after a successful HTTPS visit and service-worker caching, the app shell can work offline. Some Android TTS/dictation voices may still need internet.
- **Persistence**: app data is stored in Chrome's local IndexedDB for that exact site address. Clearing site data or switching to a different URL can make projects inaccessible. Use **Backup** frequently, and keep the backup file in a safe location.
- **Audio effects**: basic Warm, Bright, Telephone tone filters and playback speed; this is not realistic voice conversion.
- **Reordering**: use the up/down buttons on each tile for reliable touchscreen ordering.
- **Rehearsal**: muted lines preserve their recorded or estimated time, plus an optional 0–30 seconds of extra time in Edit. The flashcard reveal stays on each tile.
- **No APK included**: generating a native Android APK would require a separate Android build/signing pipeline. A home-screen PWA is the simplest free testable option.

## Local desktop-only quick preview

Run a server from the `linerunner` folder, such as `python -m http.server 8000`, and visit `http://localhost:8000`. The Android phone generally cannot record from an unsecured `http://COMPUTER-LAN-IP:8000` address; use HTTPS for phone testing.

## Checklist

- [ ] Scene and play creation
- [ ] New/existing character selection and custom image upload
- [ ] Individual recorded line and Save/Delete
- [ ] Manual transcript corrections or Gboard dictation
- [ ] Typed lines with Android system TTS
- [ ] Scene playback highlights the current tile
- [ ] Per-tile and per-character mute
- [ ] Extra silence up to 30 seconds
- [ ] Individual text reveal, Show all, Hide all
- [ ] Tile reordering using up/down arrows
- [ ] Backup and Restore

## Current limitations

This is a test release. Browser microphone, local storage, Android TTS voice selection, and installation need testing on your particular phone. There is no guaranteed automatic transcription of every recording, no audio MP3 export, and no cloud synchronization. These limitations do not require any paid feature to use the core app.
