import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  FolderPlus,
  FolderSymlink,
  LayoutGrid,
  Library,
  Link2,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Presentation,
  SquareArrowOutUpRight,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../app/Shell";
import { api, isLink, keys, type Material, type MaterialQuery } from "../lib/api";
import { categoryOf, cn, formatBytes, relativeDate, truncateMiddle } from "../lib/format";
import { FILE_MANAGER } from "../lib/platform";
import { useToast } from "../lib/toast";
import {
  Badge,
  Button,
  ConfirmDialog,
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  Dialog,
  EmptyState,
  Field,
  IconButton,
  Input,
  Menu,
  MenuItem,
  MenuSeparator,
  Dropdown,
  SearchInput,
  Skeleton,
  Tooltip,
} from "../lib/ui";

/** Kept in sync with `SUPPORTED` in src-tauri/src/materials.rs. */
const EXTENSIONS = [
  "pdf", "docx", "pptx", "ppt", "xlsx", "xls",
  "png", "jpg", "jpeg", "webp", "mp3", "wav", "m4a", "mp4",
];

const ICONS = {
  doc: FileText,
  slides: Presentation,
  sheet: FileSpreadsheet,
  image: FileImage,
  audio: FileAudio,
  video: FileVideo,
  link: Link2,
} as const;

export function Materials() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [folderId, setFolderId] = useState<number | null>(null);
  const [favorites, setFavorites] = useState(false);
  const [sort, setSort] = useState<NonNullable<MaterialQuery["sort"]>>("name");
  const [view, setView] = useState<"list" | "grid">(() =>
    localStorage.getItem("materialsView") === "grid" ? "grid" : "list",
  );
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState<Material>();
  const [removing, setRemoving] = useState<Material>();
  const [newFolder, setNewFolder] = useState(false);
  const [newLink, setNewLink] = useState(false);
  const toast = useToast();
  const qc = useQueryClient();

  const filters: MaterialQuery = { query, folderId, favorites, sort };
  const { data: materials, isPending } = useQuery({
    queryKey: keys.materials(filters),
    queryFn: () => api.materials(filters),
    placeholderData: (prev) => prev,
  });

  const { data: folders } = useQuery({ queryKey: keys.folders, queryFn: api.folders });

  const doImport = useMutation({
    mutationFn: (paths: string[]) => api.importMaterials(paths, folderId),
    onSuccess: (r) => {
      qc.invalidateQueries();
      const parts: string[] = [];
      if (r.imported) parts.push(`${r.imported} material${r.imported === 1 ? "" : "s"} imported`);
      if (r.duplicates) parts.push(`${r.duplicates} already in your library`);
      if (r.rejected.length) {
        const [name, reason] = r.rejected[0];
        toast(
          r.rejected.length === 1
            ? `${name}: ${reason}`
            : `${r.rejected.length} files skipped — ${name}: ${reason}`,
          "error",
        );
        if (parts.length) toast(parts.join(", "));
      } else {
        toast(parts.join(", ") || "Nothing to import");
      }
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const pickFiles = async () => {
    const picked = await openFileDialog({
      multiple: true,
      title: "Add teaching materials",
      filters: [{ name: "Teaching materials", extensions: EXTENSIONS }],
    });
    const paths = Array.isArray(picked) ? picked : picked ? [picked] : [];
    if (paths.length) doImport.mutate(paths);
  };

  // `?new=1` (sidebar shortcut / command palette) opens the picker straight away.
  useEffect(() => {
    if (params.get("new") !== "1") return;
    const next = new URLSearchParams(params);
    next.delete("new");
    setParams(next, { replace: true });
    void pickFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // `?open=<id>` comes from the command palette.
  useEffect(() => {
    const id = Number(params.get("open"));
    if (!id) return;
    const next = new URLSearchParams(params);
    next.delete("open");
    setParams(next, { replace: true });
    api.openMaterial(id).catch((e: Error) => toast(e.message, "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Native drag and drop: the OS hands us real paths, which the browser never would.
  useEffect(() => {
    let stop = () => {};
    getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type === "over") setDragging(true);
        else if (event.payload.type === "leave") setDragging(false);
        else if (event.payload.type === "drop") {
          setDragging(false);
          if (event.payload.paths.length) doImport.mutate(event.payload.paths);
        }
      })
      .then((unlisten) => {
        stop = unlisten;
      });
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId]);

  const addLink = useMutation({
    mutationFn: ({ url, name }: { url: string; name: string }) =>
      api.addLink(url, name.trim() || null, folderId),
    onSuccess: () => {
      qc.invalidateQueries();
      setNewLink(false);
      toast("Link added");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const openMaterial = useMutation({
    mutationFn: (id: number) => api.openMaterial(id),
    onSuccess: () => qc.invalidateQueries(),
    onError: (e: Error) => toast(e.message, "error"),
  });

  const favorite = useMutation({
    mutationFn: ({ id, on }: { id: number; on: boolean }) => api.favoriteMaterial(id, on),
    onSuccess: () => qc.invalidateQueries(),
    onError: (e: Error) => toast(e.message, "error"),
  });

  const reveal = useMutation({
    mutationFn: (id: number) => api.revealMaterial(id),
    onError: (e: Error) => toast(e.message, "error"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.removeMaterial(id),
    onSuccess: () => {
      qc.invalidateQueries();
      toast("Removed from your library");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const relocate = useMutation({
    mutationFn: async (m: Material) => {
      const picked = await openFileDialog({
        multiple: false,
        title: `Find “${m.name}”`,
        filters: [{ name: "Teaching materials", extensions: EXTENSIONS }],
      });
      if (typeof picked !== "string") return false;
      await api.relocateMaterial(m.id, picked);
      return true;
    },
    onSuccess: (done) => {
      if (!done) return;
      qc.invalidateQueries();
      toast("Material reconnected");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const createFolder = useMutation({
    mutationFn: (name: string) => api.createFolder(name),
    onSuccess: (id) => {
      qc.invalidateQueries();
      setFolderId(id);
      setNewFolder(false);
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const deleteFolder = useMutation({
    mutationFn: (id: number) => api.deleteFolder(id),
    onSuccess: () => {
      qc.invalidateQueries();
      setFolderId(null);
      toast("Folder deleted — its materials are still in your library");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const chooseView = (next: "list" | "grid") => {
    localStorage.setItem("materialsView", next);
    setView(next);
  };

  const rows = materials ?? [];
  const filtering = Boolean(query || favorites || folderId);
  const activeFolder = folders?.find((f) => f.id === folderId);

  const actionsFor = (
    m: Material,
    Item: typeof MenuItem | typeof ContextMenuItem,
    Separator: typeof MenuSeparator | typeof ContextMenuSeparator,
  ) => (
    <>
      {!m.exists ? (
        <Item onSelect={() => relocate.mutate(m)}>
          <FolderSymlink />
          Locate file…
        </Item>
      ) : isLink(m) ? (
        <Item onSelect={() => openMaterial.mutate(m.id)}>
          <SquareArrowOutUpRight />
          Open in browser
        </Item>
      ) : (
        <Item onSelect={() => openMaterial.mutate(m.id)}>
          <FileText />
          Open
        </Item>
      )}
      {!isLink(m) && (
        <Item onSelect={() => reveal.mutate(m.id)}>
          <FolderSymlink />
          Reveal in {FILE_MANAGER}
        </Item>
      )}
      <Separator />
      <Item onSelect={() => setEditing(m)}>
        <Pencil />
        Rename, folder &amp; tags
      </Item>
      <Item onSelect={() => favorite.mutate({ id: m.id, on: !m.isFavorite })}>
        <Star />
        {m.isFavorite ? "Remove favourite" : "Add to favourites"}
      </Item>
      <Separator />
      <Item danger onSelect={() => setRemoving(m)}>
        <Trash2 />
        Remove from library
      </Item>
    </>
  );

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-line px-3 py-5 md:flex">
        <RailButton
          active={!favorites && folderId === null}
          onClick={() => {
            setFavorites(false);
            setFolderId(null);
          }}
        >
          <Library className="size-[18px] shrink-0" />
          All materials
        </RailButton>
        <RailButton
          active={favorites}
          onClick={() => {
            setFavorites(true);
            setFolderId(null);
          }}
        >
          <Star className="size-[18px] shrink-0" />
          Favourites
        </RailButton>

        <div className="mt-7 mb-2 flex items-center justify-between pr-1 pl-3">
          <span className="text-2xs font-semibold tracking-wide text-ink-3 uppercase">Folders</span>
          <IconButton label="New folder" onClick={() => setNewFolder(true)} className="size-7">
            <Plus />
          </IconButton>
        </div>

        {(folders ?? []).map((f) => (
          <ContextMenu
            key={f.id}
            trigger={
              <RailButton
                active={folderId === f.id}
                onClick={() => {
                  setFavorites(false);
                  setFolderId(f.id);
                }}
              >
                <span className="flex-1 truncate">{f.name}</span>
                <span className="num text-2xs text-ink-3">{f.count || ""}</span>
              </RailButton>
            }
          >
            <ContextMenuItem danger onSelect={() => deleteFolder.mutate(f.id)}>
              <Trash2 />
              Delete folder
            </ContextMenuItem>
          </ContextMenu>
        ))}

        {folders?.length === 0 && (
          <p className="px-3 py-2 text-2xs leading-relaxed text-ink-3">
            Folders group materials by theme — grammar, speaking, exam prep.
          </p>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader
          title={activeFolder?.name ?? (favorites ? "Favourites" : "Teaching materials")}
          count={rows.length}
          subtitle={
            folderId
              ? "Files dropped here are added to this folder."
              : "Files stay on disk, links open in your browser — ESL App only remembers them."
          }
          actions={
            <>
              <div
                role="group"
                aria-label="View"
                className="flex gap-1 rounded-ctl border border-line-strong bg-raised p-1"
              >
                <ViewButton
                  active={view === "list"}
                  label="List view"
                  onClick={() => chooseView("list")}
                >
                  <List className="size-[18px]" />
                </ViewButton>
                <ViewButton
                  active={view === "grid"}
                  label="Grid view"
                  onClick={() => chooseView("grid")}
                >
                  <LayoutGrid className="size-[18px]" />
                </ViewButton>
              </div>
              <Button onClick={() => setNewLink(true)}>
                <Link2 />
                Add link
              </Button>
              <Button variant="primary" onClick={pickFiles}>
                <Upload />
                Add material
              </Button>
            </>
          }
        >
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search materials by name, folder, tag or type…"
              className="w-full max-w-[28rem]"
              autoFocus
            />
            <Dropdown
              label="Sort materials"
              value={sort}
              onValueChange={(v) => setSort(v as NonNullable<MaterialQuery["sort"]>)}
              className="w-52"
              items={[
                { value: "name", label: "Name" },
                { value: "recent", label: "Recently opened" },
                { value: "added", label: "Recently added" },
                { value: "kind", label: "File type" },
              ]}
            />
          </div>
        </PageHeader>

        <div
          data-selectable
          className={cn(
            "relative min-h-0 flex-1 overflow-y-auto transition-colors",
            dragging && "bg-accent-soft/50",
          )}
        >
          {dragging && (
            <div className="pointer-events-none absolute inset-4 z-10 grid place-items-center rounded-xl border-2 border-dashed border-accent bg-canvas/85">
              <p className="text-lg font-semibold text-accent">
                Drop to add to {activeFolder?.name ?? "your library"}
              </p>
            </div>
          )}

          <div className="mx-auto w-full max-w-[1180px] px-8 py-8 xl:px-10">
            {isPending ? (
              <div className="space-y-2">
                {Array.from({ length: 7 }, (_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              filtering ? (
                <EmptyState
                  icon={<Library />}
                  title="Nothing here yet"
                  body={
                    query
                      ? "No material matches that search."
                      : "Drop files here, or use Add material."
                  }
                  action={
                    <Button onClick={pickFiles}>
                      <Upload />
                      Add material
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={<Library />}
                  title="Your teaching library is empty"
                  body="Drag files in, add a link to a site you teach from, or import your first teaching material. ESL App references your files, it never copies them."
                  action={
                    <>
                      <Button onClick={() => setNewLink(true)}>
                        <Link2 />
                        Add link
                      </Button>
                      <Button variant="primary" onClick={pickFiles}>
                        <Upload />
                        Add material
                      </Button>
                    </>
                  }
                />
              )
            ) : view === "grid" ? (
              <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(14rem,1fr))]">
                {rows.map((m) => (
                  <ContextMenu
                    key={m.id}
                    trigger={
                      <li>
                        <MaterialCard
                          material={m}
                          onOpen={() => (m.exists ? openMaterial.mutate(m.id) : relocate.mutate(m))}
                          menu={
                            <Menu
                              trigger={
                                <IconButton label="More actions">
                                  <MoreHorizontal />
                                </IconButton>
                              }
                            >
                              {actionsFor(m, MenuItem, MenuSeparator)}
                            </Menu>
                          }
                        />
                      </li>
                    }
                  >
                    {actionsFor(m, ContextMenuItem, ContextMenuSeparator)}
                  </ContextMenu>
                ))}
              </ul>
            ) : (
              <table className="w-full border-separate border-spacing-0 text-base">
                <thead>
                  <tr className="text-2xs font-medium tracking-wide text-ink-3 uppercase">
                    <th scope="col" className="px-4 pb-3 text-left font-medium">
                      Name
                    </th>
                    <th scope="col" className="w-32 px-4 pb-3 text-left font-medium">
                      Type
                    </th>
                    <th scope="col" className="w-40 px-4 pb-3 text-left font-medium">
                      Folder
                    </th>
                    <th scope="col" className="w-36 px-4 pb-3 text-left font-medium">
                      Last opened
                    </th>
                    <th scope="col" className="w-14 pb-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => {
                    const Icon = ICONS[categoryOf(m.kind)];
                    return (
                      <ContextMenu
                        key={m.id}
                        trigger={
                          <tr
                            onDoubleClick={() =>
                              m.exists ? openMaterial.mutate(m.id) : relocate.mutate(m)
                            }
                            className="group h-14 cursor-default [&>td]:border-b [&>td]:border-line [&>td]:transition-colors hover:[&>td]:bg-surface"
                          >
                            <td className="px-4">
                              <div className="flex items-center gap-3">
                                <span
                                  className={cn(
                                    "grid size-9 shrink-0 place-items-center rounded-ctl",
                                    m.exists ? "bg-sunken text-ink-3" : "bg-bad-soft text-bad",
                                  )}
                                >
                                  <Icon aria-hidden className="size-[18px]" />
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    m.exists ? openMaterial.mutate(m.id) : relocate.mutate(m)
                                  }
                                  className="min-w-0 text-left font-medium text-ink hover:underline"
                                >
                                  <Tooltip label={truncateMiddle(m.path, 72)}>
                                    <span className="block truncate">{m.name}</span>
                                  </Tooltip>
                                </button>
                                {m.isFavorite && (
                                  <Star
                                    aria-label="Favourite"
                                    className="size-4 shrink-0 fill-warn text-warn"
                                  />
                                )}
                                {!m.exists && (
                                  <Badge tone="bad">
                                    <AlertTriangle className="size-3" />
                                    Unavailable
                                  </Badge>
                                )}
                                {m.tags.map((t) => (
                                  <Badge key={t}>{t}</Badge>
                                ))}
                              </div>
                            </td>
                            <td className="px-4">
                              <span className="num text-2xs text-ink-3">
                                {m.kind}
                                {m.fileSize != null && ` · ${formatBytes(m.fileSize)}`}
                              </span>
                            </td>
                            <td className="truncate px-4 text-ink-2">
                              {m.folderName ?? <span className="text-ink-3">—</span>}
                            </td>
                            <td className="num px-4 text-ink-2">
                              {m.lastOpenedAt ? (
                                relativeDate(m.lastOpenedAt)
                              ) : (
                                <span className="text-ink-3">Never</span>
                              )}
                            </td>
                            <td className="pr-1">
                              <div className="flex justify-end opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                <Menu
                                  trigger={
                                    <IconButton label="More actions">
                                      <MoreHorizontal />
                                    </IconButton>
                                  }
                                >
                                  {actionsFor(m, MenuItem, MenuSeparator)}
                                </Menu>
                              </div>
                            </td>
                          </tr>
                        }
                      >
                        {actionsFor(m, ContextMenuItem, ContextMenuSeparator)}
                      </ContextMenu>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <MaterialDialog
          key={editing.id}
          material={editing}
          folders={folders ?? []}
          onClose={() => setEditing(undefined)}
        />
      )}

      <NewLinkDialog
        open={newLink}
        onOpenChange={setNewLink}
        folderName={activeFolder?.name}
        pending={addLink.isPending}
        onAdd={(url, name) => addLink.mutate({ url, name })}
      />

      <NewFolderDialog
        open={newFolder}
        onOpenChange={setNewFolder}
        onCreate={(name) => createFolder.mutate(name)}
      />

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(o) => !o && setRemoving(undefined)}
        title={`Remove “${removing?.name}”?`}
        consequence="This removes it from your library only. The file itself stays exactly where it is on disk."
        confirmLabel="Remove from library"
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </div>
  );
}

function ViewButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "grid size-8 place-items-center rounded-[6px] transition-colors",
          active ? "bg-sunken text-ink" : "text-ink-3 hover:text-ink",
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}

/** Grid tile. Same information as a row, arranged for scanning by eye. */
function MaterialCard({
  material: m,
  onOpen,
  menu,
}: {
  material: Material;
  onOpen: () => void;
  menu: ReactNode;
}) {
  const Icon = ICONS[categoryOf(m.kind)];
  return (
    <div className="group relative flex h-full flex-col rounded-panel border border-line bg-surface p-4 transition-colors duration-150 hover:border-line-strong hover:bg-raised">
      <div className="mb-3 flex items-start justify-between gap-2">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-ctl",
            m.exists ? "bg-sunken text-ink-3" : "bg-bad-soft text-bad",
          )}
        >
          <Icon aria-hidden className="size-5" />
        </span>
        <div className="flex items-center gap-1">
          {m.isFavorite && <Star aria-label="Favourite" className="size-4 fill-warn text-warn" />}
          <span className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            {menu}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="line-clamp-2 text-left text-base leading-snug font-medium text-ink hover:underline"
      >
        <Tooltip label={truncateMiddle(m.path, 72)}>
          <span>{m.name}</span>
        </Tooltip>
      </button>

      <div className="mt-auto pt-3">
        <p className="num text-2xs text-ink-3">
          {m.kind}
          {m.fileSize != null && ` · ${formatBytes(m.fileSize)}`}
          {m.folderName && ` · ${m.folderName}`}
        </p>
        {!m.exists && (
          <Badge tone="bad" className="mt-2">
            <AlertTriangle className="size-3" />
            Unavailable
          </Badge>
        )}
        {m.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {m.tags.slice(0, 3).map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
            {m.tags.length > 3 && <Badge>+{m.tags.length - 3}</Badge>}
          </div>
        )}
      </div>
    </div>
  );
}

function RailButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 w-full items-center gap-3 rounded-ctl px-3 text-left text-base transition-colors duration-150",
        active ? "bg-accent-soft font-medium text-accent" : "text-ink-2 hover:bg-sunken hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/** Name, folder and tags in one place — three menu items would be three dialogs. */
function MaterialDialog({
  material,
  folders,
  onClose,
}: {
  material: Material;
  folders: { id: number; name: string }[];
  onClose: () => void;
}) {
  const [name, setName] = useState(material.name);
  const [folderId, setFolderId] = useState(material.folderId ?? "");
  const [tags, setTags] = useState(material.tags.join(", "));
  const [error, setError] = useState<string>();
  const toast = useToast();
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("A material needs a name.");
      const nextFolder = folderId === "" ? null : Number(folderId);
      const nextTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (trimmed !== material.name) await api.renameMaterial(material.id, trimmed);
      if (nextFolder !== material.folderId) await api.moveMaterial(material.id, nextFolder);
      if (nextTags.join(",") !== material.tags.join(","))
        await api.setMaterialTags(material.id, nextTags);
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast("Material updated");
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Edit material"
      description={truncateMiddle(material.path, 80)}
      width={520}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => save.mutate()} disabled={save.isPending}>
            Save changes
          </Button>
        </>
      }
    >
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label="Name" error={error} hint="Only the library name changes, not the file on disk">
          {(p) => <Input {...p} autoFocus value={name} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Field label="Folder" optional>
          {(p) => (
            <Dropdown
              {...p}
              value={folderId === "" ? "none" : String(folderId)}
              onValueChange={(v) => setFolderId(v === "none" ? "" : Number(v))}
              items={[
                { value: "none", label: "No folder" },
                ...folders.map((f) => ({ value: String(f.id), label: f.name })),
              ]}
            />
          )}
        </Field>
        <Field label="Tags" optional hint="Comma separated — travel, b1, speaking">
          {(p) => <Input {...p} value={tags} onChange={(e) => setTags(e.target.value)} />}
        </Field>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  );
}

/** A link is a material whose location is a URL - same folders, tags and search. */
function NewLinkDialog({
  open,
  onOpenChange,
  folderName,
  pending,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderName?: string;
  pending: boolean;
  onAdd: (url: string, name: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  useEffect(() => {
    if (open) {
      setUrl("");
      setName("");
    }
  }, [open]);

  const submit = () => !pending && url.trim() && onAdd(url.trim(), name);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add a link"
      description={
        folderName
          ? `Saved to ${folderName}. It opens in your browser, like any other material.`
          : "A page you teach from - a video, a worksheet, an exercise. It opens in your browser."
      }
      width={480}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" disabled={!url.trim() || pending} onClick={submit}>
            <Link2 />
            Add link
          </Button>
        </>
      }
    >
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Link" hint="Starting with http:// or https://">
          {(p) => (
            <Input
              {...p}
              autoFocus
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://learnenglish.britishcouncil.org/..."
            />
          )}
        </Field>
        <Field label="Name" optional hint="Left empty, the website name is used">
          {(p) => (
            <Input
              {...p}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Present perfect exercises"
            />
          )}
        </Field>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  );
}

function NewFolderDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  useEffect(() => {
    if (open) setName("");
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New folder"
      description="Folders group materials by theme. A material lives in one folder at a time."
      width={440}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" disabled={!name.trim()} onClick={() => onCreate(name)}>
            <FolderPlus />
            Create folder
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onCreate(name);
        }}
      >
        <Field label="Folder name">
          {(p) => (
            <Input
              {...p}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Business English"
            />
          )}
        </Field>
      </form>
    </Dialog>
  );
}
