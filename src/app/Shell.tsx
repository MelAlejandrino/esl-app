import { BookOpen, Library, LayoutGrid, Settings as SettingsIcon, Users } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn } from "../lib/format";
import { Tooltip } from "../lib/ui";
import { CommandPalette } from "./CommandPalette";
import { Mark, ResizeEdges, Titlebar } from "./Titlebar";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutGrid },
  { to: "/students", label: "Students", icon: Users },
  { to: "/notes", label: "Class notes", icon: BookOpen },
  { to: "/materials", label: "Materials", icon: Library },
];

/** Where `Ctrl+N` goes, based on where the teacher already is. */
function newItemPath(pathname: string): string {
  if (pathname.startsWith("/materials")) return "/materials?new=1";
  if (pathname.startsWith("/students")) return "/students?new=1";
  return "/notes/new";
}

export function Shell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebar") === "collapsed",
  );
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setCollapsed((c) => {
      localStorage.setItem("sidebar", c ? "open" : "collapsed");
      return !c;
    });
  };

  // Global shortcuts. Anything typed into a field is left alone, except the
  // combinations that are meaningless there anyway (search, settings).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (key === ",") {
        e.preventDefault();
        navigate("/settings");
      } else if (key === "b") {
        e.preventDefault();
        toggleSidebar();
      } else if (key === "n") {
        const el = document.activeElement;
        const typing =
          el instanceof HTMLElement &&
          (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
        if (typing) return;
        e.preventDefault();
        navigate(newItemPath(pathname));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, pathname]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Titlebar
        collapsed={collapsed}
        onToggleSidebar={toggleSidebar}
        onSearch={() => setPaletteOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="Main"
          className={cn(
            "flex shrink-0 flex-col border-r border-line bg-canvas transition-[width] duration-150 ease-out",
            collapsed ? "w-[4.5rem]" : "w-60",
          )}
        >
          {/* App identity lives with the navigation, not floating in the toolbar. */}
          <div
            className={cn(
              "flex h-16 shrink-0 items-center gap-2.5",
              collapsed ? "justify-center px-3" : "px-4",
            )}
          >
            <Mark />
            {!collapsed && (
              <span className="truncate text-sm font-semibold tracking-tight text-ink">
                ESL App
              </span>
            )}
          </div>

          <ul className={cn("space-y-1", collapsed ? "px-3" : "px-3")}>
            {NAV.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <SidebarLink to={to} label={label} collapsed={collapsed}>
                  <Icon className="size-[18px] shrink-0" />
                </SidebarLink>
              </li>
            ))}
          </ul>

          <div className="flex-1" />

          <div className={cn("border-t border-line py-3", collapsed ? "px-3" : "px-3")}>
            <SidebarLink to="/settings" label="Settings" collapsed={collapsed}>
              <SettingsIcon className="size-[18px] shrink-0" />
            </SidebarLink>
          </div>
        </nav>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <ResizeEdges />
    </div>
  );
}

function SidebarLink({
  to,
  label,
  collapsed,
  children,
}: {
  to: string;
  label: string;
  collapsed: boolean;
  children: ReactNode;
}) {
  const link = (
    <NavLink
      to={to}
      end={to === "/"}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          "flex h-11 items-center gap-3 rounded-ctl text-base font-medium transition-colors duration-150",
          collapsed ? "w-11 justify-center" : "px-3",
          isActive
            ? "bg-accent-soft text-accent"
            : "text-ink-2 hover:bg-sunken hover:text-ink",
        )
      }
    >
      {children}
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
  return collapsed ? (
    <Tooltip label={label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

/**
 * Every page opens the same way: what this is, then the one action that matters.
 * Header and body share a max width so their content lines up on a wide monitor.
 */
export function PageHeader({
  title,
  subtitle,
  count,
  meta,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="shrink-0 border-b border-line bg-canvas px-8 pt-8 pb-6 xl:px-10">
      <div className="mx-auto w-full max-w-[1180px]">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="flex items-baseline gap-2.5 text-3xl font-semibold tracking-tight text-ink">
              {title}
              {count !== undefined && (
                <span className="num text-xs font-normal text-ink-3">{count}</span>
              )}
            </h1>
            {subtitle && <p className="mt-1.5 text-xs text-ink-2">{subtitle}</p>}
            {meta && <div className="mt-1.5 text-2xs text-ink-3">{meta}</div>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
        </div>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </header>
  );
}

/** The scrolling body of a page. Text inside is selectable. */
export function PageBody({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div data-selectable className="min-h-0 flex-1 overflow-y-auto">
      <div className={cn("mx-auto w-full max-w-[1180px] px-8 py-8 xl:px-10", className)}>
        {children}
      </div>
    </div>
  );
}
