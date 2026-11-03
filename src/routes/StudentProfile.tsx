import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  BookOpen,
  ChevronRight,
  FilePlus2,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, keys, type ClassNote } from "../lib/api";
import { formatDate, initials, relativeDate, studentColor, tint } from "../lib/format";
import { useToast } from "../lib/toast";
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Menu,
  MenuItem,
  MenuSeparator,
  Skeleton,
} from "../lib/ui";
import { StudentDialog } from "./StudentDialog";

export function StudentProfile() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    data: student,
    isPending,
    error,
  } = useQuery({
    queryKey: keys.student(id),
    queryFn: () => api.student(id),
  });

  const { data: notes } = useQuery({
    queryKey: keys.notes({ studentId: id }),
    queryFn: () => api.notes({ studentId: id }),
  });

  // Opening a profile is what makes it "recently viewed".
  useEffect(() => {
    if (student) api.touchStudent(id).catch(() => {});
  }, [id, student]);

  const archive = useMutation({
    mutationFn: (on: boolean) => api.archiveStudent(id, on),
    onSuccess: (_, on) => {
      qc.invalidateQueries();
      toast(on ? "Student archived" : "Student restored");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteStudent(id),
    onSuccess: () => {
      qc.invalidateQueries();
      toast("Student deleted");
      navigate("/students", { replace: true });
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  if (error) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-10 py-8">
        <EmptyState
          title="That student isn't here"
          body="They may have been deleted."
          action={<Button onClick={() => navigate("/students")}>Back to students</Button>}
        />
      </div>
    );
  }

  if (isPending || !student) {
    return (
      <div className="px-10 py-8">
        <Skeleton className="h-20 w-80" />
        <Skeleton className="mt-8 h-48" />
      </div>
    );
  }

  return (
    <>
      <header
        style={{ background: tint(studentColor(student), 10), borderTop: `4px solid ${studentColor(student)}` }}
        className="shrink-0 border-b border-line px-8 pt-6 pb-7 xl:px-10"
      >
        <div className="mx-auto w-full max-w-[1180px]">
          <Link
            to="/students"
            className="-ml-1 inline-flex h-7 items-center gap-1.5 rounded-ctl px-1 text-2xs font-medium text-ink-3 transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            Students
          </Link>

          <div className="mt-4 flex items-start gap-5">
            <Avatar name={initials(student.name)} color={studentColor(student)} size={64} />

            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-ink">
                <span className="truncate" data-selectable>
                  {student.name}
                </span>
                {student.englishLevel && <Badge tone="accent">{student.englishLevel}</Badge>}
                {student.archivedAt && <Badge tone="warn">Archived</Badge>}
              </h1>

              <div
                data-selectable
                className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ink-2"
              >
                {student.preferredName && student.preferredName !== student.name && (
                  <span>Goes by {student.preferredName}</span>
                )}
                {student.age != null && <span className="num">{student.age} years old</span>}
                {student.email && (
                  <a
                    href={`mailto:${student.email}`}
                    className="inline-flex items-center gap-1.5 rounded-ctl transition-colors hover:text-accent"
                  >
                    <Mail className="size-4 text-ink-3" />
                    {student.email}
                  </a>
                )}
                {student.phone && (
                  <span className="num inline-flex items-center gap-1.5">
                    <Phone className="size-4 text-ink-3" />
                    {student.phone}
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <Button onClick={() => setEditing(true)}>
                <Pencil />
                Edit
              </Button>
              <Button variant="primary" onClick={() => navigate(`/notes/new?student=${id}`)}>
                <FilePlus2 />
                Add class note
              </Button>
              <Menu
                trigger={
                  <IconButton label="More actions">
                    <MoreHorizontal />
                  </IconButton>
                }
              >
                <MenuItem onSelect={() => archive.mutate(!student.archivedAt)}>
                  {student.archivedAt ? <ArchiveRestore /> : <Archive />}
                  {student.archivedAt ? "Restore student" : "Archive student"}
                </MenuItem>
                <MenuSeparator />
                <MenuItem danger onSelect={() => setConfirmDelete(true)}>
                  <Trash2 />
                  Delete student
                </MenuItem>
              </Menu>
            </div>
          </div>
        </div>
      </header>

      <div data-selectable className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-[1180px] gap-10 px-8 py-8 lg:grid-cols-[minmax(0,1fr)_20rem] xl:px-10">
          <section>
            <h2 className="mb-5 flex items-baseline gap-2.5 border-b border-line pb-3 text-xl font-semibold tracking-tight text-ink">
              Class history
              {notes?.length ? (
                <span className="num text-xs font-normal text-ink-3">{notes.length}</span>
              ) : null}
            </h2>
            {notes === undefined ? (
              <Skeleton className="h-40" />
            ) : notes.length === 0 ? (
              <EmptyState
                icon={<BookOpen />}
                title="No classes recorded yet"
                body="After a lesson, jot down what you covered and what to review next time."
                action={
                  <Button variant="primary" onClick={() => navigate(`/notes/new?student=${id}`)}>
                    <FilePlus2 />
                    Add class note
                  </Button>
                }
              />
            ) : (
              <ol className="space-y-3">
                {notes.map((note) => (
                  <TimelineEntry key={note.id} note={note} />
                ))}
              </ol>
            )}
          </section>

          <aside className="space-y-7 lg:sticky lg:top-0 lg:self-start">
            <Detail title="Learning goals" body={student.goals} />
            <Detail title="General notes" body={student.generalNotes} />
            <div>
              <h3 className="mb-3 text-2xs font-semibold tracking-wide text-ink-3 uppercase">
                At a glance
              </h3>
              <dl className="divide-y divide-line border-y border-line text-xs">
                <Stat label="Classes recorded" value={String(student.noteCount)} />
                <Stat
                  label="Last class"
                  value={student.lastClass ? relativeDate(student.lastClass) : "—"}
                />
                <Stat label="Added" value={formatDate(student.createdAt)} />
              </dl>
            </div>
          </aside>
        </div>
      </div>

      {editing && (
        <StudentDialog key={student.updatedAt} open onOpenChange={setEditing} student={student} />
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${student.name}?`}
        consequence={`This also deletes ${student.noteCount} class note${
          student.noteCount === 1 ? "" : "s"
        } and can't be undone. Archiving keeps the history instead.`}
        confirmLabel="Delete permanently"
        onConfirm={() => remove.mutate()}
      />
    </>
  );
}

/** One class in the timeline: when, what, and the two lines that matter next. */
function TimelineEntry({ note }: { note: ClassNote }) {
  return (
    <li>
      <Link
        to={`/notes/${note.id}`}
        className="group block rounded-panel border border-line bg-surface px-5 py-4 transition-colors duration-150 hover:border-line-strong hover:bg-raised"
      >
        <div className="flex items-baseline justify-between gap-4">
          <div className="min-w-0">
            <span className="num text-2xs font-medium text-ink-3">
              {formatDate(note.classDate)}
            </span>
            <h3 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-ink">
              {note.topic || "Untitled class"}
            </h3>
          </div>
          <ChevronRight className="size-[18px] shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        {note.lessonContent && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-2">
            {note.lessonContent}
          </p>
        )}

        {(note.homework || note.nextLesson) && (
          <dl className="mt-4 grid gap-2 border-t border-line pt-3 text-xs sm:grid-cols-2">
            {note.homework && <InlineField label="Homework" value={note.homework} />}
            {note.nextLesson && <InlineField label="Next lesson" value={note.nextLesson} />}
          </dl>
        )}
      </Link>
    </li>
  );
}

function InlineField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-2xs font-medium tracking-wide text-ink-3 uppercase">{label}</dt>
      <dd className="mt-0.5 truncate text-ink-2">{value}</dd>
    </div>
  );
}

function Detail({ title, body }: { title: string; body: string | null }) {
  if (!body) return null;
  return (
    <div>
      <h3 className="mb-2 text-2xs font-semibold tracking-wide text-ink-3 uppercase">{title}</h3>
      <p className="text-xs leading-relaxed whitespace-pre-wrap text-ink-2">{body}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className="text-ink-3">{label}</dt>
      <dd className="num font-medium text-ink">{value}</dd>
    </div>
  );
}
