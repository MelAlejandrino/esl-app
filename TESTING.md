# Testing ESL App on macOS or Linux

This app has only ever been built and run on Windows. The code is written to be
cross-platform and there is no known blocker, but you are the first person to run it on your
OS — so a build failure is a perfectly normal outcome and worth reporting as-is.

## 1. Prerequisites

Both platforms need [Rust](https://rustup.rs) and [Node](https://nodejs.org) 20+.

**macOS**

```sh
xcode-select --install     # C toolchain; SQLite is compiled from source
```

**Linux** (Debian/Ubuntu — see [Tauri's prerequisites](https://tauri.app/start/prerequisites/)
for other distros)

```sh
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

## 2. Run it

```sh
npm install
npm run tauri dev
```

The first run compiles the Rust side and takes a few minutes. A window titled **ESL App**
should open on an empty dashboard saying "Welcome to ESL App".

If it fails to compile, stop here and send the last ~30 lines of output. That's the most useful
thing you can report.

## 3. What to check

Nothing here needs a real student — make things up. Everything is stored locally in one file and
nothing is sent anywhere.

**Window**

- [ ] The window has your OS's normal title bar, with working minimise/maximise/close.
- [ ] Below it is the app's own toolbar: sidebar toggle, "ESL App", back/forward, a search box.
- [ ] Resizing and dragging the window behave normally. Try dragging by the app toolbar too.
- [ ] Resize down to roughly 900×600. Nothing should overlap or get clipped.

**Getting around**

- [ ] The four sidebar items (Overview, Students, Class notes, Materials) all load.
- [ ] `⌘K` / `Ctrl K` opens search. Typing filters it; arrow keys move; Enter opens; Esc closes.
- [ ] The keyboard list in Settings shows the right modifier key for your OS (⌘ on macOS).
- [ ] Back/forward in the toolbar do what you'd expect.

**Students**

- [ ] Add a student — only a name is required.
- [ ] The level dropdown opens, is keyboard-navigable, and shows a tick on the chosen item.
- [ ] Search the list. Edit a student. Archive one, then find it under "Archived".
- [ ] Right-click a row: a context menu appears.

**Class notes**

- [ ] Add a class note from a student's profile. Save with `⌘S` / `Ctrl S`.
- [ ] The header shows "Saved just now".
- [ ] Type something, then try to navigate away — it should ask before discarding.
- [ ] The note appears in the student's class history.
- [ ] *Known difference:* the big text areas grow as you type on Windows but not on
      macOS/Linux (a Chromium-only CSS feature). They stay resizable by hand. Not a bug.

**Materials**

- [ ] Drag a few files onto the Materials page — PDF, an image, whatever. They should import.
- [ ] Drag in something unsupported (a `.zip`): it should be refused with a readable reason.
- [ ] Click a material: it opens in your default app.
- [ ] "Reveal in Finder" / "Reveal in Files" opens the containing folder.
- [ ] Move a file on disk, come back: the row should say **Unavailable** with **Locate file…**.
- [ ] Try the grid/list toggle, favourites, folders, tags.

**Data**

- [ ] Settings → Save a backup. Then Restore it. It should ask before replacing anything.
- [ ] Quit and reopen: everything you entered is still there, and the window reopens at the
      size and position you left it.

## 4. Reporting

Please include, from **Settings → About**, the version line and the browser-engine line — copy
them straight out. Then whatever went wrong, and what you expected instead. Screenshots of
anything that looks misaligned are more useful than a description.

The things I'd most expect to be wrong: window and toolbar alignment, the dropdowns and menus
(they're custom-built), and drag-and-drop of files on Wayland.
