# Releases

Release notes live here. The workflow does the rest.

To ship a version:

1. Add a `## vX.Y.Z` section below, newest first.
2. Set the same version in `package.json` and `src-tauri/tauri.conf.json`.
3. `git tag vX.Y.Z && git push --tags`

`.github/workflows/release.yml` then builds for Windows, macOS and Linux and — only if a
build succeeds — creates a **draft** GitHub release using that section as the body, with
the installers attached. Review it on the Releases page and hit Publish.

The three platforms build in parallel and each attaches its own assets, so if one fails
the draft still appears with the assets from the others. Check all three jobs went green
before publishing.

The run fails early (before building) if the tag doesn't match
`src-tauri/tauri.conf.json` or if there's no matching section below.

To rebuild an existing tag, run the workflow manually from the Actions tab.

## v0.2.0

- **Links are materials too** — save a web page next to your files. Same folders, tags,
  favourites and search; it opens in your browser instead of an app. A link you do not
  name is named after its site.
- **Update check** — Settings, under About: one button that asks GitHub whether a newer
  version exists. Nothing checks in the background, and it is the only request the app
  ever makes.

**Install:** Windows `.msi` · macOS `.dmg` (universal, Intel + Apple Silicon) ·
Linux `.AppImage` / `.deb`. Still unsigned, so Windows SmartScreen and macOS Gatekeeper
will warn on first run.

## v0.1.0

First release.

- **Students** — add, edit, search, and view student profiles.
- **Class notes** — write and review notes per class, per student.
- **Materials** — organize and open teaching materials.
- Local-first: SQLite on disk, no account, no network.

**Install:** Windows `.msi` · macOS `.dmg` (universal, Intel + Apple Silicon) ·
Linux `.AppImage` / `.deb`. The builds are unsigned, so Windows SmartScreen and macOS
Gatekeeper will both warn on first run.
