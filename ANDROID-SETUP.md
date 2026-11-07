# LineRunner Version 4 — Android update

LineRunner is a free Android-first Progressive Web App (PWA). This is a **GitHub Pages update, not an APK**. Your previous installation can be updated without changing its URL.

## Important: Back up first

1. On your phone, open your **current** LineRunner app.
2. Open **Settings → Export complete backup** and save the downloaded JSON file somewhere safe, ideally Google Drive or a separate computer.
3. Check that you can find the JSON file before updating. The JSON backup contains your voice recordings. Keep it private.

## Update your existing GitHub Pages installation

1. Download `LineRunner-Android-v4.zip` on a computer and extract it.
2. Open the extracted `linerunner` folder.
3. Sign into GitHub and open the **same repository** you used for LineRunner before.
4. In your repository's main **Code** page, use **Add file → Upload files**. Upload the **contents** of the new `linerunner` folder. The files such as `index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, and `sw.js` should be at the repository root (not inside a new nested folder).
5. Commit the updated files to the existing `main` branch. If GitHub's web uploader won't overwrite a file, open that file in the repository, click Edit and replace its contents, or use GitHub Desktop to commit the updated folder.
6. Go to **Actions** and confirm that `pages build and deployment` has completed successfully.
7. On Android, open LineRunner from its home screen. Fully close/reopen it. If an older interface still appears, open the same HTTPS URL in Chrome and refresh, then reopen the installed app. **Do not clear browser site data.**
8. The Version 4 home screen should show folder cards including **Miscellaneous**, with **New folder** at the top. Tap the LR icon to return home.

GitHub Pages serves the application code over HTTPS; it does **not** receive the recorded dialogue or saved scenes. Recordings remain in Chrome's IndexedDB for the existing URL and browser profile.

## Version 4 checklist

- [ ] Home screen opens with folders and existing scenes.
- [ ] Old standalone scenes are placed in **Miscellaneous**.
- [ ] Create a folder and a scene inside it; rename/move scene using **⋯ Scene**.
- [ ] Tap **＋ Add Next Line**; a blank tile appears immediately.
- [ ] Choose an existing character or create a new one from the tile's character dropdown.
- [ ] Tap a character's cast button; edit its name, mute, pitch and effect.
- [ ] Tap 🔴 to record, then ⏹ to stop; recording saves automatically.
- [ ] Record over an existing clip and verify the overwrite warning.
- [ ] Use ▶/Ⅱ, ↻ and 🔊/🔇 on a tile.
- [ ] Tap Reveal dialogue, then tap into the visible text area and type; text saves automatically.
- [ ] Use ↑/↓ to reorder tiles, or × to delete a tile.
- [ ] Start scene playback; scroll to test the sticky master bar, Loop and ↑ Top.
- [ ] Export and, if necessary, restore a backup under Settings.

## Notes and limitations

- There is **no speech-to-text, text-to-speech, or avatar editor** in Version 4. Emoji can be typed in a character's name.
- Pitch uses a local, experimental duration-preserving processing method. Large pitch changes or long recordings may cause distortion, processing delay, or a fallback to original pitch on some Android devices.
- Echo, reverb, telephone, robot, deep and bright effects are basic local Web Audio effects. Voice quality varies by device.
- Muting a line during scene playback preserves the line's recorded duration; a line with no recording gets a short silent interval.
- A tile's mute button sets an individual override of the character-wide default. The tile includes a small **Reset to character setting** control when an override exists.
- Local recordings rely on browser storage. Clearing Chrome data, using a new website address, or reinstalling in a different browser profile may lose access. Back up often.
- Microphone recording requires HTTPS and permission; the app is intended to be served from GitHub Pages in Chrome for Android.
- The current build has been syntax-checked and packaged, but real Android microphone and audio-effect behavior must be tested on your device.
