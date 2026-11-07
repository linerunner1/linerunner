# LineRunner v5 — update your existing Android app

LineRunner remains a free, locally stored Progressive Web App (PWA). It is **not** a Play Store APK. Use the **same** GitHub Pages repository and website URL you used for previous versions.

## Before updating: protect your work

1. Open your installed LineRunner v4 app on Android.
2. Tap **Settings** and choose **Export complete backup**. Save the `.json` file somewhere safe (for example, your phone's Downloads folder, then a second copy in your own secure storage).
3. Do not clear Chrome site data, delete the existing installed app, or change the GitHub Pages URL.

Version 5 reads the existing `LineRunnerDB` local database. Existing scenes, recordings, and characters should remain available at the same website origin. Backing up is important because browser storage can be lost.

## Install Version 5 through your existing GitHub Pages site

1. Download and extract **LineRunner-Android-v5.zip** on your computer.
2. Open the `linerunner` folder in the extracted ZIP.
3. Open the **same** GitHub repository where your existing LineRunner is hosted.
4. Replace the old contents of the repository root with the new files inside `linerunner`: `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, the icon files, and documents. GitHub's web Upload Files page does **not reliably overwrite** existing files with the same name. To update in the browser, open each existing file and use **Edit** to replace its contents, or use GitHub Desktop to copy the extracted files over the local repository and commit the changes. The latter is easier for a multi-file update.
5. Commit changes to `main`. In **Actions**, confirm the GitHub Pages deployment succeeded.
6. On Android, close LineRunner fully and relaunch it. A service-worker update may require another close/reopen cycle or opening the GitHub Pages URL in Chrome and refreshing it. Do **not** clear storage to force the update.
7. The Settings button should be gone. The home screen's **+ New folder** button should offer **Create new folder** and **Import folder backup**.

## Important: migration and backup formats

- Folder settings (⋯) now has **Export backup**. The export contains the chosen folder, its scenes, referenced characters, and all referenced recording audio as one JSON file.
- On the home screen, tap **+ New folder → Import folder backup**. Import creates a separate folder with **(Imported)** in its name. Existing data is not replaced.
- Version 5 can also recognize a Version 4 **whole-library** JSON backup and import its scenes as a new folder, without replacing other data. It does not reconstruct the original multi-folder layout from that older backup.
- Backups may be large because they include audio. Keep them private.
- Backup files are separate from local automatic saves. No internet connection is needed for creating scenes or editing recordings once the PWA's files are cached.

## Version 5 highlights

- One **+ New scene** control per home-screen folder; each scene has its own ⋯ menu to rename, move, or delete it.
- Folder settings has one close (×) control, not a duplicate Cancel button.
- Sticky scene player includes **Top**, **Bottom**, and a line number field. When playback is paused or stopped, enter a number from 1 to the scene's total and confirm to move the playhead there. Playback stays stopped until you press Play.
- Tap a tile's **timestamp** to replace the tile's contents with a non-destructive trim editor. Touch-drag the waveform's left/right handles to adjust In and Out points, view the second readouts, preview the selection, reset, or tap Done. Trim view retains the tile's previous screen height.
- Tile controls use a consistent minimal icon style; red circle for Record and square for Stop.

## Quick test checklist

1. Create a new folder and scene; check only one New scene button is displayed.
2. On the home screen, open that scene's ⋯ menu and rename or move it.
3. Record a line and tap its timestamp. Drag both trim handles and tap Done.
4. Replay the line to hear only the selected portion. Reopen Trim and tap Reset if needed.
5. Tap Top and Bottom in the sticky playback bar.
6. Pause scene playback; edit the current line number to jump to another line, then press Play.
7. Export a folder backup; import it via New folder and verify the duplicate folder appears without removing the existing one.

## Limitations

- Microphone access requires HTTPS and Chrome permission. Android browser audio formats, decoding, pitch effects, and waveform generation vary by device.
- Trim adjustments are rounded to tenths of a second and do not modify the source recording. Audio playback may have small seek latency.
- Automatic transcription and text-to-speech remain removed.
- The current pitch shifting and voice effects are experimental. Pitch shifting of very long clips can consume significant memory on a phone.
- Export a backup before every substantial update.
