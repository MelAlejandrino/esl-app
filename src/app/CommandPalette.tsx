import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  FileText,
  FolderOpen,
  Library,
  Search,
  Settings as SettingsIcon,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api, keys } from "../lib/api";
import { cn } from "../lib/format";
import { Kbd } from "../lib/ui";

type Item = {
  id: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  run: () => void;
};

type Group = { heading: string; items: Item[] };

/**
 * One search box over students, class notes, materials and the app's own
 * actions. Arrow keys move, Enter opens, Escape closes — the mouse is optional.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const go = (to: string) => () => {
    onOpenChange(false);
    navigate(to);
  };

  const actions: Item[] = [
    { id: "a-student", label: "Add student", icon: <UserPlus />, run: go("/students?new=1") },
    { id: "a-note", label: "Add class note", icon: <FileText />, run: go("/notes/new") },
    { id: "a-material", label: "Add material", icon: <FolderOpen />, run: go("/materials?new=1") },
    { id: "n-students", label: "Students", icon: <Users />, run: go("/students") },
    { id: "n-notes", label: "Class notes", icon: <BookOpen />, run: go("/notes") },
    { id: "n-materials", label: "Materials", icon: <Library />, run: go("/materials") },
    { id: "n-settings", label: "Settings", icon: <SettingsIcon />, run: go("/settings") },
  ];

  const trimmed = query.trim();
  const { data: hits } = useQuery({
    queryKey: keys.search(trimmed),
    queryFn: () => api.search(trimmed),
    enabled: open && trimmed.length > 0,
    placeholderData: (prev) => prev,
  });

  const { data: recents } = useQuery({
    queryKey: keys.students({ sort: "recent" }),
    queryFn: () => api.students({ sort: "recent" }),
    enabled: open,
  });

  const groups: Group[] = useMemo(() => {
    if (!trimmed) {
      const recent = (recents ?? []).filter((s) => s.viewedAt).slice(0, 4);
      return [
        { heading: "Actions", items: actions },
        ...(recent.length
          ? [
              {
                heading: "Recently viewed",
                items: recent.map((s) => ({
                  id: `s${s.id}`,
                  label: s.name,
                  hint: s.englishLevel ?? undefined,
                  icon: <Users />,
                  run: go(`/students/${s.id}`),
                })),
              },
            ]
          : []),
      ];
    }

    const lower = trimmed.toLowerCase();
    const matchedActions = actions.filter((a) => a.label.toLowerCase().includes(lower));
    return [
      ...(hits?.students.length
        ? [
            {
              heading: "Students",
              items: hits.students.map((h) => ({
                id: `s${h.id}`,
                label: h.title,
                hint: h.subtitle,
                icon: <Users />,
                run: go(`/students/${h.id}`),
              })),
            },
          ]
        : []),
      ...(hits?.notes.length
        ? [
            {
              heading: "Class notes",
              items: hits.notes.map((h) => ({
                id: `n${h.id}`,
                label: h.title,
                hint: h.subtitle,
                icon: <FileText />,
                run: go(`/notes/${h.id}`),
              })),
            },
          ]
        : []),
      ...(hits?.materials.length
        ? [
            {
              heading: "Materials",
              items: hits.materials.map((h) => ({
                id: `m${h.id}`,
                label: h.title,
                hint: h.subtitle,
                icon: <Library />,
                run: () => {
                  onOpenChange(false);
                  navigate(`/materials?open=${h.id}`);
                },
              })),
            },
          ]
        : []),
      ...(matchedActions.length ? [{ heading: "Actions", items: matchedActions }] : []),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, hits, recents]);

  const flat = groups.flatMap((g) => g.items);
  const current = Math.min(active, Math.max(flat.length - 1, 0));

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${current}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [current]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="anim-overlay fixed inset-0 z-40 bg-[#1c1813]/30 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          aria-label="Search everything"
          className="anim-pop fixed top-[11vh] left-1/2 z-50 flex max-h-[68vh] w-[min(44rem,calc(100vw-4rem))] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/25"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => (flat.length ? (i + 1) % flat.length : 0));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              flat[current]?.run();
            }
          }}
        >
          <div className="flex items-center gap-3 border-b border-line px-5">
            <Search aria-hidden className="size-5 shrink-0 text-ink-3" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              placeholder="Search students, class notes, materials…"
              aria-label="Search"
              className="h-16 w-full bg-transparent text-lg text-ink outline-none placeholder:text-ink-3"
            />
            <Kbd>Esc</Kbd>
          </div>

          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2">
            {flat.length === 0 ? (
              <p className="px-5 py-14 text-center text-xs text-ink-3">
                Nothing matches “{trimmed}”.
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.heading} className="mb-2 last:mb-0">
                  <p className="px-3 pt-3 pb-1.5 text-2xs font-semibold tracking-wide text-ink-3 uppercase">
                    {group.heading}
                  </p>
                  {group.items.map((item) => {
                    const index = flat.indexOf(item);
                    const isActive = index === current;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-index={index}
                        onPointerMove={() => setActive(index)}
                        onClick={item.run}
                        className={cn(
                          "flex h-11 w-full items-center gap-3 rounded-ctl px-3 text-left text-base transition-colors",
                          isActive ? "bg-accent-soft text-ink" : "text-ink-2",
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-5 shrink-0 place-items-center [&_svg]:size-[18px]",
                            isActive ? "text-accent" : "text-ink-3",
                          )}
                        >
                          {item.icon}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                        {item.hint && (
                          <span className="shrink-0 truncate text-2xs text-ink-3">{item.hint}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
