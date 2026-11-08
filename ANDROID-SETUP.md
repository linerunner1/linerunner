# LineRunner Version 8 — Android update

LineRunner is a free offline-friendly progressive web app (PWA), not an APK. This ZIP contains the site files to replace those in your existing GitHub Pages repository.

## Before updating: back up recordings

In your current Version 7 app, open each play's **⋯** menu and choose **Export backup**. Save the downloaded `.json` backups safely. Because Version 7 stores miscellaneous scenes under a special folder, also export that folder if you use it. Browser storage should carry over when you update the files at the same URL, but a backup is recommended.

## Update the same GitHub Pages site

1. Download and extract `LineRunner-Android-v8.zip` on a computer.
2. Open the extracted `linerunner` folder; copy **its contents**, not the enclosing folder, to the root of the existing LineRunner repository.
3. Replace old `index.html`, `app.js`, `styles.css`, `sw.js`, and other matching files. GitHub Desktop is recommended: clone the repository, replace files, commit, and push to `main`.
4. Confirm a successful deployment in the repository's **Actions** tab.
5. Close/reopen LineRunner on Android. If the previous version is still visible, refresh its existing HTTPS GitHub Pages address in Chrome, then reopen the installed PWA.

**Keep the exact same site URL. Do not uninstall the PWA or clear browser/site data.** The app continues to use the same IndexedDB database and original audio blobs. Updating is intended to preserve your saved projects.

## Version 8 changes

- The home library displays plays/folders and a separate **Standalone Scenes** section. **＋ New scene** on the main screen creates a standalone scene by default; the New Scene dialog can optionally save it in any play.
- Scenes can be moved between a play and the standalone library using **⋯ → Move to**. Moving to a new scope copies or reuses the relevant characters without linking other plays' character profiles.
- A play now shares its character roster and settings across its scenes. Creating a new scene inside a play makes its existing characters available for line assignment. Characters in standalone scenes are always separate, even when names match.
- For older data, characters with identical names within one play are unified automatically. The original dialogue recordings are not moved or modified; they remain attached to their lines. Other plays and standalone scenes are not merged.
- Character Settings shows **Scenes**, **Lines**, and **Duration** for play characters, and **Lines** and **Duration** for standalone characters. Duration is the sum of recorded, trimmed playback time.
- Instruction text reads exactly:
  - Play: "Effects are applied during playback; recordings stay unchanged. Character settings apply only to this play."
  - Standalone scene: "Effects are applied during playback; recordings stay unchanged. Character settings apply only to this scene."
- The old special "Miscellaneous" folder, if present, is converted to truly standalone scenes on upgrade. Scenes retain their audio and their separate character identities.

## Suggested checks on Android

1. Confirm older scenes and recordings remain available after the upgrade.
2. Open a play with characters; create a new scene there and add a line. The play's existing characters should appear in the selector.
3. Open a character's settings: see accurate counts for scenes, lines and recorded duration across that play, plus the appropriate help text.
4. Create a standalone scene with a character named John; verify it is not linked to John in a play.
5. Move a scene into another play or back to the standalone library, and verify the characters are scoped independently.
6. Export/import a play backup and verify that its scenes share the correct imported character profiles.

## Notes

The app requires Chrome microphone permission on an HTTPS origin to record. It stores work locally in IndexedDB, so regular backup exports remain important. This release can be verified statically and in a desktop test browser, but recording and playback behavior should still be tested on your Android device.
