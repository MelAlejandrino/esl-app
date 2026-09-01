/**
 * Platform facts the UI has to adapt to. Read from the user agent rather than
 * `@tauri-apps/plugin-os`: it's one line, needs no plugin or permission, and
 * the answer can't change while the window is open.
 */
const ua = navigator.userAgent;

export const isMac = /Mac|iPhone|iPad/.test(ua);
export const isWindows = /Win/.test(ua);

/**
 * Does this app draw its own minimise/maximise/close, or does the OS?
 *
 * Only Windows, deliberately: `decorations: false` is set in
 * tauri.windows.conf.json, and that is the only platform the custom chrome has
 * been run on. macOS `titleBarStyle: "Overlay"` has an upstream bug where a
 * custom drag region can't move an unfocused window (tauri-apps/tauri#4316),
 * and undecorated dragging/resizing is unreliable on Wayland — so both keep
 * their native title bar above our toolbar. Flip this to opt a platform in
 * once someone has actually tested it there.
 */
export const hasCustomChrome = isWindows;

/** `⌘K` on macOS, `Ctrl K` elsewhere — shown, not just handled. */
export function shortcut(key: string): string {
  return isMac ? `⌘${key}` : `Ctrl ${key}`;
}

/** What the OS calls the thing that shows a file in its folder. */
export const FILE_MANAGER = isMac ? "Finder" : isWindows ? "File Explorer" : "Files";
