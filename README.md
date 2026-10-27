# Cabane – Eli's modified panel

Modified build of the Cabane Home Assistant panel, based on the official
**v0.3.18** HACS release (frontend source commit `0c92d4e7`).

## What it changes

| Before (official) | After (modified) |
|---|---|
| An object only accepts its own entity type (a lamp takes lights, a speaker takes media players). | Any object accepts **any** entity. Matching types are listed first; everything else is under **"Any other entity · any type"**, grouped by HA area. |
| A room's objects only list entities from the HA area mapped to that room, and nothing at all if the room has no area. | Every picker lists entities from **all areas**, with the area shown next to each entity. Rooms without an HA area work. |
| Sensor-type objects also demand a device class (temperature, motion…). | That only applies to entities of the same type. Window/door contact sensors stay strict. |
| Connecting an entity from another area is shown as an error and disables its control. | Allowed, no error. |

Automatic matching is unchanged: Cabane still only auto-connects exact type matches in the room's own area.

Controls follow the **entity's** real type, not the object's. A pump `switch` on any object gets an on/off toggle; a `cover` gets open/stop/close and position.

## Install

1. **Back up** the current folder: in Studio Code Server (or Samba), rename
   `/config/custom_components/cabane` to `/config/cabane-official-backup`.
   (Keep it outside `custom_components`, or HA will try to load it too.)
2. Upload `cabane-modified.zip` to `/config/`, then in the Studio Code Server terminal:
   ```
   cd /config
   unzip cabane-modified.zip -d custom_components/
   rm cabane-modified.zip
   ```
   You should now have `/config/custom_components/cabane/` again.
3. **Restart Home Assistant** (Settings → System → Restart).
4. Hard-refresh the browser, and fully close/reopen the HA phone app.

Your saved homes stay where they are. They live in HA storage, not in this folder.

## Shutters and the pool pump

- **Shutters:** in Arrange → My models → Import model, import `roller-shutter-window.glb`
  or `roller-shutter-door.glb`. Choose **Support: Wall** and **Profile: Cover**, and place it over the
  window or door. Then connect it in Connect to your `cover.*` entity. Use **Width** in the import
  preview to set the real size (scaling is uniform).
- **Pool pump:** import your pump model with **Profile: Switch** (or Furniture), place it at the
  pool, and connect it to the pump entity. Objects outside any room already see every area.

## Important

- **HACS updates overwrite this mod.** Don't install Cabane updates from HACS unless you want the
  official version back, or ask me to re-apply the patch to the new version first.
  `tools/patch_bundle.py` refuses to patch a bundle it doesn't recognise, so it can't half-apply.
- **cabane.my compatibility:** if you connect an entity of a *different* type (e.g. a switch on a
  speaker object), the official editor at cabane.my will reject that saved home as invalid. Make
  those connections and edits in the HA panel. Connections where the types match stay compatible.

## Roll back

Delete `/config/custom_components/cabane`, rename `/config/cabane-official-backup` back to
`/config/custom_components/cabane`, then restart HA. Or redownload Cabane in HACS.

## Files

- `cabane-modified.zip`: the patched integration folder to install
- `roller-shutter-window.glb`, `roller-shutter-door.glb`: shutter models (Wall, Cover)
- `tools/patch_bundle.py`: re-applies the patch to an official release folder and rebuilds its checksums
- `source-patches/*.patch`: the same changes against the Cabane TypeScript source (git `am`-able)
