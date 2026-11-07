# LineRunner v3 — Android update instructions

LineRunner is a free installable web app (PWA). This ZIP contains its static code, not an Android APK. It uses the same GitHub Pages address and same IndexedDB storage format as your earlier installation.

## Before updating: back up your projects

1. On your Android phone, open the **existing LineRunner app**.
2. Select **Settings → Export complete backup**.
3. Save the downloaded `LineRunner-backup-YYYY-MM-DD.json` file somewhere safe outside the browser (for example, Android Downloads and a second copy elsewhere). This file contains your recordings and may be large; treat it as private.

Do not uninstall the existing app, clear Chrome site data, or change the GitHub Pages address.

## Update GitHub Pages

1. On your PC, download `LineRunner-Android-v3.zip` and extract it.
2. Open the extracted **linerunner** folder. Select the **files inside** that folder, not the folder itself. There is a new file called `emoji-data.json` that must be uploaded with the others.
3. Sign in to GitHub and open **the same** repository you used for Version 2 (normally named `linerunner`).
4. Under **Code**, choose **Add file → Upload files**. Drag the extracted files onto the upload area. Keep their file names and replace any matching older files when committing. Make sure `index.html`, `app.js`, `styles.css`, `sw.js`, `emoji-data.json`, and `manifest.webmanifest` end up at the **repository root**.
5. Click **Commit changes** to the `main` branch.
6. Open **Actions** and look for the successful GitHub Pages deployment (green checkmark). Then visit **Settings → Pages** or open your existing website address.
7. On Android, open the same `https://USERNAME.github.io/linerunner/` address in Chrome; reload it. Close and reopen the installed app. If the old UI remains, close the app and reload the website in Chrome once more so the updated service worker can activate. Do **not** clear site data.

If your GitHub upload interface refuses to overwrite same-name files, use the repository's file editor for the changed files, or GitHub Desktop to commit the folder contents. Do not create a new repository or change the public URL just to upgrade.

## Confirm Version 3 has loaded

- Scene header and cast list appear above the playback bar.
- The playback bar includes **Add dialogue**, **Loop** and **↑ Top**.
- The toolbar stays visible when scrolling into the dialogue tiles.
- Tiles use **🔴** to start recording and **⏹** to stop. Record and Edit settings expand **inside** each tile.
- Tiles show a **⚙** settings button, plus ↑ and ↓ reorder buttons; there is no nonworking grip.
- Character settings have **Audio settings** first and **Avatar** last. Tap **Choose emoji** for a categorized, searchable emoji browser.

## Key limitations

- **Transcription:** This release attempts automatic Web Speech recognition while recording, but Android Chrome may deny simultaneous microphone access. The app now displays a clear transcription status. Recording still works even if no transcript is returned. In that case, tap the transcript field and use your Android keyboard's microphone, or type the line manually. This cannot be guaranteed without adding an offline speech-recognition model or Android-native speech recognition integration.
- **Pitch:** Recorded lines can be adjusted in semitone increments while maintaining approximate duration using an experimental free browser-side processor. Results vary by phone and pitch amount.
- **Emoji:** The app bundles a broad offline library of approximately 1,700 emoji choices and sequences, including people, animals, objects, symbols and flags. Exact rendering and newer emoji support depend on your Android OS/fonts; not every possible Unicode ZWJ variant is bundled.
- **Storage:** Data remains in the local browser storage for the original site address. Backups are essential before site-data clearing or changing devices.
- **Offline use:** App shell and emoji library are cached after the first successful HTTPS visit. Browser speech recognition and some TTS voices may still require connectivity.

## Quick test

1. Open an existing scene and verify its recordings still appear.
2. Tap any character avatar, then **Choose emoji**. Browse a category, search for an emoji and save.
3. Tap the **⚙** tile button. Confirm the settings open *inside* that tile.
4. Tap **🔴** and allow microphone access. Confirm it becomes **⏹**. Speak, tap Stop, and review the transcription status. Save the recording.
5. Tap **Play scene** and scroll down. Check the playback bar sticks below the application header, and **↑ Top** scrolls back without stopping playback.
6. Toggle Loop, add a new dialogue tile from the sticky bar, and reorder with ↑ and ↓.
7. Close and reopen the app to check that the edits were retained.
