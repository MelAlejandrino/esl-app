# ESL App

A small, local-first desktop app for an ESL teacher. Three things, done fast:

- **Students** — who am I teaching?
- **Class notes** — what happened last class?
- **Materials** — what am I teaching with?

Tauri v2 · React · TypeScript · Rust · SQLite · Tailwind CSS. No account, no cloud, no network.

## Run it

```sh
npm install
npm run tauri dev      # dev window with hot reload
npm run tauri build    # installable build
```

Checks:

```sh
npx tsc --noEmit                    # frontend types
cd src-tauri && cargo test          # database, validation, search, import
```

## Where things live

```
src/
  lib/        api.ts (typed invoke wrappers), ui.tsx (primitives), toast.tsx, format.ts
  app/        Titlebar.tsx (custom window toolbar), Shell.tsx (sidebar, shortcuts), CommandPalette.tsx
  routes/     Dashboard, Students, StudentProfile, StudentDialog, Notes, NoteEditor, Materials, Settings
src-tauri/src/
  db.rs       connection, schema, migrations (PRAGMA user_version)
  students.rs notes.rs materials.rs search.rs   commands + validation
  error.rs    one error type; teacher-readable message out, detail to `tracing`
```

All database and filesystem work happens in Rust. The frontend only calls named commands
(`src/lib/api.ts`); it has no SQL and no filesystem access. Tauri permissions are limited to
`core:default` plus the two file-dialog calls — opening and revealing files is done Rust-side.

`src/app/Titlebar.tsx` is the app's toolbar — identity, back/forward, global search — and on
Windows it is also the window's title bar, drawing the window controls itself with the bare areas
acting as the drag region. See **Platforms** below.

## Keyboard

`Ctrl K` search everything · `Ctrl N` new item for the current page · `Ctrl S` save a class note ·
`Ctrl B` sidebar · `Ctrl ,` settings · `Esc` close.

## Data

One SQLite file in the OS app-data directory — `%APPDATA%\com.carlo.esl-app\esl.db` on Windows,
`~/Library/Application Support/com.carlo.esl-app/esl.db` on macOS,
`~/.local/share/com.carlo.esl-app/esl.db` on Linux.
Settings → *Save a backup* writes a consistent copy with `VACUUM INTO`; *Restore a backup* swaps
it back in. A restore is refused unless the file is an ESL App database at this schema version, and
the copy runs in one transaction — a rejected or failed restore leaves existing data untouched.

Materials are **referenced, never copied** — the library stores the path, so importing 4 GB of
worksheets costs kilobytes. If a file moves, its row shows *Unavailable* with **Locate file…** to
reconnect it; removing a material never deletes the file on disk.

## Platforms

Windows, macOS and Linux. Tauri cannot cross-compile, so each build happens on its own OS.
**Only the Windows build has been run.** For handing it to someone on another OS, see
[TESTING.md](TESTING.md) — prerequisites, what to exercise, and what to report.

Window chrome is the one place platforms diverge, and it is deliberately conservative: the
custom title bar is enabled only where it has actually been used.

| | Windows | macOS / Linux |
| --- | --- | --- |
| Window chrome | `decorations: false`; the toolbar draws minimise/maximise/close | native title bar; the toolbar is just an app toolbar |
| Resize border | `ResizeEdges` supplies it | native, so `ResizeEdges` renders nothing |
| Shortcut labels | `Ctrl K` | `⌘K` on macOS |
| Reveal action | "Reveal in File Explorer" | "Reveal in Finder" / "Files" |

One switch controls this: `hasCustomChrome` in `src/lib/platform.ts`, plus `decorations` in
`src-tauri/tauri.windows.conf.json`. Tauri merges platform config over the base with JSON Merge
Patch, which **replaces** arrays, so that file repeats the whole `windows[0]` object — change one
and change both.

macOS is not opted in because `titleBarStyle: "Overlay"` has an upstream bug where a custom drag
region cannot move an unfocused window ([tauri#4316](https://github.com/tauri-apps/tauri/issues/4316));
Linux is not, because undecorated dragging and resizing are unreliable under Wayland. Both are a
one-line change once someone has confirmed they behave.

`Ctrl`/`Cmd` were always both handled in code; only the labels needed platform awareness.

Known degradation: the class-note text areas grow with their content via CSS `field-sizing`,
which is Chromium-only. On macOS (WKWebView) and Linux (WebKitGTK) they keep their initial
height and stay manually resizable.

## Deliberate omissions

Marked in code with `ponytail:` comments, with the upgrade path:

- Search is `LIKE` with AND-ed tokens, not FTS5 or Tantivy — instant for a personal library.
- Missing-file detection is one `stat()` per row at read time, not a `notify` watcher.
- Migrations are an array of SQL strings keyed off `user_version`, not a migration crate.

Also skipped, and why: React Hook Form + Zod (two small forms; validation lives in Rust where it
has to be anyway), a searchable student combobox (the note editor is usually reached from a
student's profile with the student pre-filled), autosave for class notes (explicit save plus an
unsaved-changes guard is harder to get wrong).

shadcn/ui is not used: its primitives are Radix, so the wrappers in `src/lib/ui.tsx` sit directly
on Radix instead — less generated code to customise away from the template look.
