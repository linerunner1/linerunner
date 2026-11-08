# LineRunner v10

Android-first offline-friendly line-rehearsal PWA, updated from v9.

## What's new
- Scene rows in the library show **dialogue lines and total duration**, including sound effects in time but not in the line count.
- Every dialogue or effect tile has a `+` button alongside its Up and Down controls. Choose **Add Dialogue** or **Add Sound Effect** to insert immediately after that tile.
- Sound Effect tiles are created immediately, with an empty sound selector inside the tile. Tap **Choose sound effect** to choose from the global library or create a new one.
- Dialogue Timeline separately reports line and effect counts, plus total duration.
- Playback follows stable tile IDs and remains in sequence if tiles are inserted while a scene plays.
- The transport counter is labeled **Tile**, as it navigates every dialogue and effect tile, not just dialogue lines.

## Storage and updating
Use the same GitHub Pages address and retain browser site data to preserve the existing IndexedDB projects. **Export folder backups before updating.** Do not uninstall the PWA or clear Chrome storage. See `ANDROID-SETUP.md` for deployment steps.

## Testing notes
Syntax and ZIP checks can be performed without Android, but live microphone recording, audio playback, and service-worker update behavior need validation on an Android device.


## Version 11
- Character Settings: Delete Character replaces Cancel; the × closes settings. Deletion confirms the number of dialogue tiles and recordings to remove across the character's play (or standalone scene).
- Sound effect selection now uses the same in-tile dropdown design as characters, including `＋ New sound effect` at the bottom. New opens the device's audio file picker, followed by an editable suggested sound name. The tile's extra Upload button was removed.
- Sound effects use the simple speaker icon.
- The bottom Add Tile buttons have been removed. An empty scene shows Add First Tile; subsequent insertions use each tile's + button.
