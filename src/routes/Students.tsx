import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  FilePlus2,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageBody, PageHeader } from "../app/Shell";
import { api, keys, type Student, type StudentQuery } from "../lib/api";
import { avatarTone, cn, initials, isRecent, LEVELS, relativeDate } from "../lib/format";
import { useToast } from "../lib/toast";
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  EmptyState,
  IconButton,
  Menu,
  MenuItem,
  MenuSeparator,
  Dropdown,
  SearchInput,
  Skeleton,
  Tooltip,
} from "../lib/ui";
import { StudentDialog } from "./StudentDialog";

export function Students() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [sort, setSort] = useState<NonNullable<StudentQuery["sort"]>>("name");
  const [archived, setArchived] = useState(false);
  const [editing, setEditing] = useState<Student>();
  const [confirmDelete, setConfirmDelete] = useState<Student>();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();

  // `?new=1` is how the sidebar shortcut and the command palette open this form.
  const adding = params.get("new") === "1";
  const setAdding = (open: boolean) => {
    const next = new URLSearchParams(params);
    if (open) next.set("new", "1");
    else next.delete("new");
    setParams(next, { replace: true });
  };

  const filters: StudentQuery = { query, level: level || null, archived, sort };
  const { data: students, isPending } = useQuery({
    queryKey: keys.students(filters),
    queryFn: () => api.students(filters),
    placeholderData: (prev) => prev,
  });

  const archive = useMutation({
    mutationFn: ({ id, on }: { id: number; on: boolean }) => api.archiveStudent(id, on),
    onSuccess: (_, { on }) => {
      qc.invalidateQueries();
      toast(on ? "Student archived" : "Student restored");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.deleteStudent(id),
    onSuccess: () => {
      qc.invalidateQueries();
      toast("Student deleted");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const open = (s: Student) => {
    api.touchStudent(s.id).catch(() => {});
    navigate(`/students/${s.id}`);
  };

  const filtering = Boolean(query || level);
  const rows = students ?? [];

  return (
    <>
      <PageHeader
        title={archived ? "Archived students" : "Students"}
        subtitle={
          archived
            ? "Archived students keep their class history but stay out of your way."
            : "Manage your students and keep track of their progress."
        }
        count={rows.length}
        actions={
          <>
            <Button onClick={() => setArchived((a) => !a)}>
              {archived ? <Users /> : <Archive />}
              {archived ? "Active students" : "Archived"}
            </Button>
            <Button variant="primary" onClick={() => setAdding(true)}>
              <UserPlus />
              Add student
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search students by name, email or goal…"
            className="w-full max-w-96"
            autoFocus
          />
          <Dropdown
            label="Filter by level"
            value={level || "all"}
            onValueChange={(v) => setLevel(v === "all" ? "" : v)}
            className="w-40"
            items={[
              { value: "all", label: "All levels" },
              ...LEVELS.map((l) => ({ value: l, label: l })),
            ]}
          />
          <Dropdown
            label="Sort students"
            value={sort}
            onValueChange={(v) => setSort(v as NonNullable<StudentQuery["sort"]>)}
            className="w-48"
            items={[
              { value: "name", label: "Name" },
              { value: "recent", label: "Recently viewed" },
              { value: "lastClass", label: "Last class" },
              { value: "level", label: "Level" },
            ]}
          />
        </div>
      </PageHeader>

      <PageBody>
        {isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-15" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          archived ? (
            <EmptyState
              icon={<Archive />}
              title="No archived students"
              body="Archiving keeps a student's history without cluttering your list."
            />
          ) : filtering ? (
            <EmptyState
              icon={<Users />}
              title="No students match that"
              body="Try a shorter search, or clear the level filter."
              action={
                <Button
                  onClick={() => {
                    setQuery("");
                    setLevel("");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Users />}
              title="No students yet"
              body="Add your first student to start keeping track of classes and lesson notes."
              action={
                <Button variant="primary" onClick={() => setAdding(true)}>
                  <UserPlus />
                  Add student
                </Button>
              }
            />
          )
        ) : (
          <table className="w-full border-separate border-spacing-0 text-base">
            <thead>
              <tr className="text-2xs font-medium tracking-wide text-ink-3 uppercase">
                <th scope="col" className="px-4 pb-3 text-left font-medium">
                  Name
                </th>
                <th scope="col" className="w-24 px-4 pb-3 text-left font-medium">
                  Level
                </th>
                <th scope="col" className="w-40 px-4 pb-3 text-left font-medium">
                  Last class
                </th>
                <th scope="col" className="w-28 px-4 pb-3 text-right font-medium">
                  Classes
                </th>
                <th scope="col" className="w-24 pb-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <ContextMenu
                  key={s.id}
                  trigger={
                    <tr
                      onClick={() => open(s)}
                      className="group h-15 cursor-default [&>td]:border-b [&>td]:border-line [&>td]:transition-colors hover:[&>td]:bg-surface"
                    >
                      <td className="px-4">
                        <div className="flex items-center gap-3.5">
                          <Avatar name={initials(s.name)} tone={avatarTone(s.name)} size={38} />
                          {isRecent(s.viewedAt) && (
                            <Tooltip label="You opened this student recently">
                              <span className="-ml-2 size-2 shrink-0 rounded-full bg-accent" />
                            </Tooltip>
                          )}
                          <div className="min-w-0">
                            <Link
                              to={`/students/${s.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                api.touchStudent(s.id).catch(() => {});
                              }}
                              className="block truncate font-medium text-ink hover:underline"
                            >
                              {s.name}
                            </Link>
                            {s.preferredName && s.preferredName !== s.name && (
                              <span className="block truncate text-2xs text-ink-3">
                                “{s.preferredName}”
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4">
                        {s.englishLevel ? (
                          <Badge tone="accent">{s.englishLevel}</Badge>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>
                      <td className={cn("num px-4", s.lastClass ? "text-ink-2" : "text-ink-3")}>
                        {s.lastClass ? relativeDate(s.lastClass) : "No classes yet"}
                      </td>
                      <td className="num px-4 text-right text-ink-2">{s.noteCount}</td>
                      <td className="pr-1">
                        {/* Hover reveals the two actions worth a shortcut; keyboard focus does too. */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
                        >
                          <IconButton
                            label="Add class note"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/notes/new?student=${s.id}`);
                            }}
                          >
                            <FilePlus2 />
                          </IconButton>
                          <Menu
                            trigger={
                              <IconButton label="More actions">
                                <MoreHorizontal />
                              </IconButton>
                            }
                          >
                            <RowActions
                              student={s}
                              Item={MenuItem}
                              Separator={MenuSeparator}
                              onEdit={() => setEditing(s)}
                              onArchive={() => archive.mutate({ id: s.id, on: !s.archivedAt })}
                              onDelete={() => setConfirmDelete(s)}
                              onNote={() => navigate(`/notes/new?student=${s.id}`)}
                              onOpen={() => open(s)}
                            />
                          </Menu>
                        </div>
                      </td>
                    </tr>
                  }
                >
                  <RowActions
                    student={s}
                    Item={ContextMenuItem}
                    Separator={ContextMenuSeparator}
                    onEdit={() => setEditing(s)}
                    onArchive={() => archive.mutate({ id: s.id, on: !s.archivedAt })}
                    onDelete={() => setConfirmDelete(s)}
                    onNote={() => navigate(`/notes/new?student=${s.id}`)}
                    onOpen={() => open(s)}
                  />
                </ContextMenu>
              ))}
            </tbody>
          </table>
        )}
      </PageBody>

      {adding && <StudentDialog open onOpenChange={setAdding} />}
      {editing && (
        <StudentDialog
          key={editing.id}
          open
          onOpenChange={(o) => !o && setEditing(undefined)}
          student={editing}
        />
      )}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(o) => !o && setConfirmDelete(undefined)}
        title={`Delete ${confirmDelete?.name}?`}
        consequence={`This also deletes ${confirmDelete?.noteCount ?? 0} class note${
          confirmDelete?.noteCount === 1 ? "" : "s"
        } and can't be undone. Archiving keeps the history instead.`}
        confirmLabel="Delete permanently"
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete.id)}
      />
    </>
  );
}

/** The same actions in the row menu and the right-click menu. */
function RowActions({
  student,
  Item,
  Separator,
  onOpen,
  onNote,
  onEdit,
  onArchive,
  onDelete,
}: {
  student: Student;
  Item: typeof MenuItem | typeof ContextMenuItem;
  Separator: typeof MenuSeparator | typeof ContextMenuSeparator;
  onOpen: () => void;
  onNote: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const archived = Boolean(student.archivedAt);
  return (
    <>
      <Item onSelect={onOpen}>
        <Users />
        Open student
      </Item>
      <Item onSelect={onNote}>
        <FilePlus2 />
        Add class note
      </Item>
      <Item onSelect={onEdit}>
        <Pencil />
        Edit details
      </Item>
      <Separator />
      <Item onSelect={onArchive}>
        {archived ? <ArchiveRestore /> : <Archive />}
        {archived ? "Restore student" : "Archive student"}
      </Item>
      {archived && (
        <Item danger onSelect={onDelete}>
          <Trash2 />
          Delete permanently
        </Item>
      )}
    </>
  );
}
