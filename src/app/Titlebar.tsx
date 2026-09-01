import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Square,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/format";
import { hasCustomChrome, shortcut } from "../lib/platform";
import { Kbd, Tooltip } from "../lib/ui";

const appWindow = getCurrentWindow();

/**
 * The window's own toolbar: navigation, global search, and any bare part of it
 * drags the window.
 *
 * On Windows native decorations are off, so this strip also draws the
 * minimise/maximise/close buttons. Elsewhere the OS title bar sits above it and
 * this is purely an app toolbar — see `hasCustomChrome`.
 */
export function Titlebar({
  collapsed,
  onToggleSidebar,
  onSearch,
}: {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onSearch: () => void;
}) {
  const navigate = useNavigate();
  const [maximized, setMaximized] = useState(false);

  // Keep the maximise glyph honest — the window can also be snapped or
  // restored by the OS, without any click of ours.
  useEffect(() => {
    let stop = () => {};
    appWindow.isMaximized().then(setMaximized).catch(() => {});
    appWindow
      .onResized(() => {
        appWindow.isMaximized().then(setMaximized).catch(() => {});
      })
      .then((unlisten) => {
        stop = unlisten;
      });
    return () => stop();
  }, []);

  return (
    <header
      data-tauri-drag-region
      className="flex h-12 shrink-0 items-center gap-1 border-b border-line bg-canvas pl-2 select-none"
    >
      <ToolbarButton
        label={`${collapsed ? "Show" : "Hide"} sidebar — ${shortcut("B")}`}
        onClick={onToggleSidebar}
      >
        {collapsed ? (
          <PanelLeftOpen className="size-[18px]" />
        ) : (
          <PanelLeftClose className="size-[18px]" />
        )}
      </ToolbarButton>

      <span data-tauri-drag-region aria-hidden className="mx-1.5 h-5 w-px bg-line" />

      <ToolbarButton label="Back" onClick={() => navigate(-1)}>
        <ArrowLeft className="size-[18px]" />
      </ToolbarButton>
      <ToolbarButton label="Forward" onClick={() => navigate(1)}>
        <ArrowRight className="size-[18px]" />
      </ToolbarButton>

      {/* The drag region: everything between the tools and the window controls. */}
      <div
        data-tauri-drag-region
        className="flex h-full min-w-0 flex-1 items-center justify-center px-4"
      >
        <button
          type="button"
          onClick={onSearch}
          className="flex h-8 w-full max-w-96 items-center gap-2.5 rounded-ctl border border-line bg-surface px-3 text-left text-xs text-ink-3 transition-colors hover:border-line-strong hover:bg-raised hover:text-ink-2"
        >
          <Search aria-hidden className="size-4 shrink-0" />
          <span className="flex-1 truncate">Search students, notes, materials</span>
          <Kbd>{shortcut("K")}</Kbd>
        </button>
      </div>

      {hasCustomChrome && (
        <div className="flex h-full shrink-0 items-stretch">
          <WindowButton label="Minimise" onClick={() => appWindow.minimize()}>
            <Minus className="size-4" />
          </WindowButton>
          <WindowButton
            label={maximized ? "Restore" : "Maximise"}
            onClick={() => appWindow.toggleMaximize()}
          >
            {maximized ? <Copy className="size-3.5" /> : <Square className="size-3.5" />}
          </WindowButton>
          <WindowButton label="Close" danger onClick={() => appWindow.close()}>
            <X className="size-4" />
          </WindowButton>
        </div>
      )}
    </header>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip label={label} side="bottom">
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className="grid size-9 shrink-0 place-items-center rounded-ctl text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
      >
        {children}
      </button>
    </Tooltip>
  );
}

/** Window controls follow the platform's shape: full-height, wide, square. */
function WindowButton({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid w-12 place-items-center text-ink-2 transition-colors",
        danger ? "hover:bg-[#c42b1c] hover:text-white" : "hover:bg-sunken hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/** The app's mark. Lives at the top of the sidebar. */
export function Mark() {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-accent">
      <svg viewBox="0 0 20 20" aria-hidden className="size-[18px] text-accent-ink">
        <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none">
          <path d="M4.5 6.5h11" />
          <path d="M4.5 10h7.5" />
          <path d="M4.5 13.5h4" />
        </g>
      </svg>
    </span>
  );
}

/** `ResizeDirection` is a bare string union in the Tauri API, not an enum. */
type Edge = Parameters<ReturnType<typeof getCurrentWindow>["startResizeDragging"]>[0];

const EDGES: [Edge, string][] = [
  ["North", "top-0 right-1.5 left-1.5 h-1 cursor-ns-resize"],
  ["South", "bottom-0 right-1.5 left-1.5 h-1 cursor-ns-resize"],
  ["West", "top-1.5 bottom-1.5 left-0 w-1 cursor-ew-resize"],
  ["East", "top-1.5 right-0 bottom-1.5 w-1 cursor-ew-resize"],
  ["NorthWest", "top-0 left-0 size-1.5 cursor-nwse-resize"],
  ["NorthEast", "top-0 right-0 size-1.5 cursor-nesw-resize"],
  ["SouthWest", "bottom-0 left-0 size-1.5 cursor-nesw-resize"],
  ["SouthEast", "right-0 bottom-0 size-1.5 cursor-nwse-resize"],
];

/**
 * Undecorated windows lose the OS resize border, so we put it back: thin
 * invisible strips on every edge and corner that hand the drag to the window.
 * Platforms that kept their decorations need none of this.
 */
export function ResizeEdges() {
  if (!hasCustomChrome) return null;
  return (
    <>
      {EDGES.map(([direction, position]) => (
        <div
          key={direction}
          aria-hidden
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            appWindow.startResizeDragging(direction).catch(() => {});
          }}
          className={cn("fixed z-[70]", position)}
        />
      ))}
    </>
  );
}
