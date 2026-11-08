# LineRunner Version 9 — Android update

LineRunner is a free, offline-friendly Progressive Web App (PWA), not an APK. This ZIP includes the site files for your existing GitHub Pages site.

## Protect your existing recordings

Before updating Version 8, open the **⋯** menu for each play and choose **Export backup**. Keep the downloaded JSON files somewhere safe. Any important standalone scenes should also be moved into a temporary play and exported before updating, as standalone-scene export has not yet been added. You can move them back after importing/restoring if necessary. Exported backups are separate from the app's local auto-save.

## Install Version 9 on your existing GitHub Pages site

1. Download and extract `LineRunner-Android-v9.zip` on a computer.
2. Open the extracted **linerunner** directory and copy its **contents** (not the surrounding folder) into the root of the same repository that hosts your current LineRunner installation.
3. Replace `index.html`, `app.js`, `styles.css`, `sw.js`, and other matching files. GitHub Desktop is recommended for reliably replacing existing filenames. Commit and push to `main`.
4. Confirm the GitHub Pages deployment succeeded under **Actions**.
5. Close and reopen LineRunner on Android. If the old version is cached, open your existing HTTPS Pages URL in Chrome and refresh it, then reopen the installed PWA.

**Keep the identical Pages URL. Do not uninstall LineRunner, clear browsing data, or clear Chrome/site storage.** Version 9 continues using the original local IndexedDB database and audio recording blobs.

## What's new

- Play folders display `N scenes · MM:SS` based on the sum of recorded, trimmed dialogue and sound-effect durations.
- Character Settings show a compact, right-aligned `N scenes · N lines · MM:SS` below the name for play characters; standalone characters omit scenes.
- Scene timeline has **＋ Add Sound Effect** beside **＋ Add Next Line**.
- Sound Effect tiles are compact with a subtle dashed outline and waveform symbol. They do not include a mute control. They do include Record/Stop, Play/Pause, Replay, Import Audio and reorder controls.
- Select a sound from the global library or create one with a name. New sounds can be recorded with the device microphone or imported from an existing audio file. A sound selected in another scene is the same library asset; replacing its recorded audio affects all scenes referencing that sound.
- Each sound-effect tile keeps its own trim boundaries. Trimming one use does not change the original library recording or other tiles. Tap its duration to enter the waveform trim editor.
- Sound effects play sequentially in scene playback, and their effective durations count toward each scene and play runtime. Overlapping effects are not supported in this version.
- Folder backups include all referenced sound effects and their audio, including effects originally created in another play. Import creates a separate play without overwriting other projects and reuses byte-identical audio where possible.
- Characters remain isolated to a play or standalone scene. Sound effects are global across all plays/scenes.

## Suggested Android tests

1. Confirm your earlier scenes, character profiles and recordings still work.
2. Add a phone-ringing effect, record/import audio, and play it in a scene. Check that it adds to the scene duration.
3. Add that existing sound to a second play or standalone scene; verify it plays and the original recording is not duplicated.
4. Trim the sound in one scene, then verify that another use still plays its full length.
5. Export the first play backup and import it under **＋ New Folder → Import Backup**. Confirm the imported sound still works.
6. Confirm a folder's scene/runtime statistics and a character's compact statistics match recorded content.

## Limitations and safety

All app data and sound recordings live in browser-local IndexedDB. Backups are recommended in case of browser data loss. Imported audio must be a format supported by your device's browser. Browser/Android microphone and playback tests have not been completed in this release environment; verify before relying on it during rehearsal.
