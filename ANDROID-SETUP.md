# LineRunner Version 2 — Android upgrade and testing

LineRunner is an installable Android web app (PWA), not a native APK. There are no subscriptions, paid APIs, or accounts inside the app. The source files can be hosted for free on GitHub Pages, and recordings and scenes are stored on your phone.

## IMPORTANT: Back up existing LineRunner work before changing files

1. Open the **existing installed LineRunner app** on Android.
2. Tap **Backup** (in the original version, at the top of the page).
3. Save the downloaded JSON backup somewhere safe, such as your phone's Downloads folder. The file includes all projects and recorded audio.
4. Do not uninstall LineRunner, clear Chrome data, or delete site data. Updating the code at the **same GitHub Pages URL** retains your current data in the browser.

## Upgrade the existing GitHub Pages installation (no new repository)

1. Download `LineRunner-Android-v2.zip` on your computer and extract it.
2. Open the extracted `linerunner` folder. The files include `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, and the image icons.
3. On GitHub, go to your **existing** `linerunner` repository. **Do not create a new repository.**
4. Use **Add file → Upload files**, and drag all the contents of the extracted `linerunner` folder onto the upload area, replacing files with matching names if GitHub offers that option. Commit changes to `main`. If the web uploader does not allow replacing existing files, use GitHub's file editor for the text files (or GitHub Desktop) to overwrite the existing files, then commit.
5. Go to **Actions** and verify the Pages deployment completes successfully. Your Pages settings should remain **Deploy from a branch**, `main`, `/ (root)`.
6. Open your **same** URL in Android Chrome, e.g. `https://YOUR-USERNAME.github.io/linerunner/`. If the old version still displays, refresh; fully close the home-screen app and reopen it. The service worker caches code, so an additional reload may be needed after the new worker activates.
7. Check that the header contains **Settings** instead of separate Backup / Restore buttons and that the Library panel contains **New play / folder**.
8. Confirm your existing scenes and recordings are present. If you cannot find them, **do not clear any browser data**. Check that you are using the exact original GitHub Pages URL and Chrome profile. You can restore your exported backup via **Settings → Restore a saved backup**, but note that restoring replaces current project data.

## First-time setup

If you never installed LineRunner: create a free public GitHub repository, upload the files from inside the `linerunner` folder to the repository root, then enable Settings → Pages → Deploy from a branch → `main` → `/ (root)`. Open the resulting HTTPS website on Android Chrome, choose **Install app** or **Add to Home screen** and grant microphone access when prompted.

## Version 2 changes

- The Library drawer has a prominent **New play / folder** control. Scenes can be created inside play folders or moved between standalone and play folders using **Rename → Location**.
- The main bar has one playback behavior: mute, loop, hide/reveal and play controls. Listen/Rehearsal/Memorization dropdown removed.
- Backups and restore moved into **Settings**.
- Microphone recording automatically attempts speech-to-text if supported by Chrome. You can correct the transcript before Save. Recognition can fail or require network access; your audio recording still works independently.
- Recording effect filters removed. Each character has a default pitch in semitones from -6 to +6, with natural pitch at 0. Individual tiles can override the character's pitch.
- Pitch shifts are computed locally by overlapping audio grains and preserve the recorded sample count and nominal playback duration. Audio quality can degrade at large shifts. No online service is used for this processing, but long recordings or slower Android devices may take time to process. If processing fails, unshifted audio is used.
- Character settings apply to all their lines unless a particular tile specifies an override. Shared character default extra silence can also be overridden per line.
- Tap a character avatar on a dialogue tile to edit character-wide defaults. Tap the pencil button to edit the individual tile.
- Individual tiles use one play/pause button (which changes icon) plus Replay.

## Testing checklist

- [ ] Verify old scenes and recordings survive the upgrade
- [ ] Create a play with **Library → New play / folder**
- [ ] Create a scene and choose the new play folder
- [ ] Move an existing standalone scene using **Rename → Location**
- [ ] Edit a character avatar and default pitch
- [ ] Record a new line and check whether transcription appears automatically
- [ ] Correct transcript, save recording, and play it
- [ ] Shift the character pitch to +1 and verify duration seems unchanged
- [ ] Override pitch on one tile and verify other lines inherit the character default
- [ ] Play/pause using the combined button; replay a line
- [ ] Mute a character and adjust extra rehearsal time
- [ ] Reveal/hide a line, loop the scene, and export a new backup via Settings

## Technical limitations and privacy

- **Browser recognition is best effort.** SpeechRecognition can be unavailable on Android Chrome or can fail while MediaRecorder is using the same microphone. It may transmit speech data to your browser vendor; no LineRunner server receives it. Native Gboard voice dictation remains a fallback.
- **Pitch processing is an experimental free effect** based on time-domain overlapping grains, not studio-quality pitch correction. Very long lines are skipped; original recordings remain untouched. It does not change playback speed when successful.
- **Offline:** The app's interface and local recordings are cached/available after first load, but TTS and speech recognition may depend on Android's installed voices and connectivity.
- **Local storage:** Browser data is tied to the original site and browser profile. Export backups regularly.
- **Platform:** PWA, not an APK, and not verified on every Android phone.
