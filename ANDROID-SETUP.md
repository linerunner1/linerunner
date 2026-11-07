# LineRunner Version 6 — Android update

LineRunner is a **free Android Progressive Web App (PWA)**, not an APK. It uses the same GitHub Pages address as previous versions and stores project data in local browser storage.

## Update your existing installation

1. **Make a backup before updating.** Open the existing LineRunner app on your phone. On its home screen, open the folder settings (`⋯`) for each play or folder and choose **Export backup**. Save the downloaded `.json` files somewhere safe. Do not clear browser data or uninstall LineRunner.
2. On your computer, download and extract `LineRunner-Android-v6.zip`. Open the extracted `linerunner` folder.
3. Update **your existing GitHub repository** with the contents of that folder, in the same repository root as `index.html`. For multiple same-named files, **GitHub Desktop** is the simplest option: copy the extracted files into your local repository, then commit and push to `main`. GitHub's browser uploader does not always overwrite existing files cleanly; use file editing or GitHub Desktop if needed.
4. In GitHub, open **Actions** and confirm that the latest Pages deployment succeeded.
5. On Android, close LineRunner and reopen it. If the previous version persists, open your normal GitHub Pages website address directly in Chrome, refresh, then reopen the installed app. Service-worker updates can require another restart.
6. **Do not change the site address, uninstall the PWA, or clear Chrome site data** to force the update. The new version uses the same `LineRunnerDB` IndexedDB database and storage format.

## What changed in Version 6

- **Trim editor:** Tap a tile's timestamp. The tile flips to an in-place trim editor without changing its outer dimensions. The waveform includes left/right trim handles and a separate amber **playhead** you can drag to inspect a position, with readouts rounded to tenths of a second. Tap the waveform to move the playhead. **Play/Pause** starts or pauses the selected recording segment, **Replay** starts again from the trim's beginning, **Reset trim** restores the original range, and **Done** saves trim points non-destructively.
- **Mute:** A monochrome speaker icon means audible; a crossed speaker icon means muted. If you toggle a tile back to the character's default mute state, the override and its message disappear. You can still explicitly restore the character's default from the override message.
- **Recording:** The recording button is a red circle when idle and a streamlined square when recording. Tap the square to stop and save automatically. Re-recording prompts before replacing the existing take.
- **Master playback:** The separate Stop button has been removed. The Play button changes to Pause while playing. Previous/Next, Loop, editable paused line number, Top, and Bottom controls remain.
- The folder-based home screen, character settings, effects, scene management, backups, and local autosaving are retained.

## Android test checklist

1. Verify your existing folders, scenes, and recordings are still present.
2. Record a short disposable line. Confirm its recording button changes from a red circle to a square, and the audio automatically saves when stopped.
3. Tap that tile's duration. Confirm the **tile keeps the same height** and displays the waveform, two trim handles, and amber playhead.
4. Drag the amber marker. Press Play/Pause and confirm it moves while audio plays and stays in position when paused. Press Replay to restart at the chosen trim's beginning.
5. Move both trim handles, press Done, and check the trimmed line plays as expected. Reopen and Reset trim to ensure the original audio remains available.
6. Set a character's default mute state, then mute/unmute an individual tile. Confirm the override message disappears when the tile returns to the character default.
7. Confirm the master player has **no separate Stop button** and still handles play/pause, previous/next, looping, and navigation.

## Limitations and privacy

Android recording requires the app to be opened over **HTTPS** and microphone permission to be granted. The trimming editor's playback and pitch effects depend on browser audio-decoding support. Pitch shifting is experimental. Recordings, scripts, and settings are stored in the browser on your device; keep exported folder backups because browser storage can be cleared or evicted. No paid API, account, or server-side project storage is required.
