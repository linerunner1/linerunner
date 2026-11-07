# LineRunner Version 7 — Update Instructions (Android)

LineRunner is a free, local-first Android Progressive Web App (PWA). This ZIP is the website source to update your existing GitHub Pages installation; it is not an APK.

## Back up your recordings before updating

On your existing LineRunner app, open each play's **⋯** menu, use **Export backup**, and save each downloaded JSON file somewhere safe. The backup files include the recordings in that folder. These backups are your safety net if the browser's local data is cleared.

## Update your existing GitHub Pages site

1. Download and extract **LineRunner-Android-v7.zip** on your computer.
2. Open the extracted `linerunner` folder. It contains `index.html`, `app.js`, `styles.css`, `sw.js`, the manifest, and app icons.
3. Open the **same GitHub repository** you used for Version 6. Do not create a different repository or change the URL.
4. Replace the corresponding old files in the repository root with these new files. **GitHub Desktop is recommended for replacing files with the same names:** clone your existing repo, copy the new files into its local folder, then commit and push to `main`. If using the GitHub website, verify that existing files were actually replaced (not duplicated or nested in an extra `linerunner` folder).
5. In GitHub's **Actions** tab, confirm that the Pages deployment completed successfully.
6. Open the installed LineRunner app on your Android phone. Close/reopen it, or visit your existing HTTPS GitHub Pages URL in Chrome and refresh if the old interface is still cached.

**Do not uninstall LineRunner or clear Chrome/LineRunner site data** during the update. Version 7 uses the same IndexedDB database name and existing record layout, so locally saved projects are designed to carry over.

## Version 7 changes

- Above a scene title, show only the play/folder name (no extra `/ Scene` text).
- Scene settings now use the same `⋯` icon-only control as the home screen.
- Dialogue Timeline displays both line count and total effective recorded duration. Unrecorded tiles count as zero; trimmed recordings contribute only their included length.
- While the scene is playing, Previous/Next or selecting another tile's Play button starts from that selected line and **continues through the following lines**. Loop remains active if enabled.
- While paused or stopped, entering a line number or using Previous/Next stages that line without starting playback. Press Play to resume from there.

## Suggested Android checks

1. Open a scene in a folder: only the folder name should appear above its title.
2. Tap the scene `⋯` icon: rename/move/delete options should open.
3. Record two short lines and trim one: verify the total duration next to the Dialogue Timeline heading changes.
4. Add an unrecorded tile: it should increase the line count, not the total duration.
5. Play three recorded lines, then tap Previous or the Play button of an earlier tile: playback should continue to subsequent lines rather than stop after that tile.
6. Pause, select a different line number, verify playback does not resume until you tap Play.
7. Reopen the app and confirm your existing scenes and recordings are still available.

## Notes

Recording requires Android Chrome microphone permission on a secure HTTPS address. The app can save projects and recordings locally offline after its app shell is cached, but browser storage can be removed by the OS or user. Keep folder backups.

JavaScript syntax and ZIP integrity were checked; live browser automation was blocked by the testing environment. Android playback and recording must be verified on your phone.
