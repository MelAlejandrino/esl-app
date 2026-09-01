import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, keys, type ClassNote, type NoteInput } from "../lib/api";
import { cn, formatDate, today } from "../lib/format";
import { useToast } from "../lib/toast";
import {
  Button,
  ConfirmDialog,
  Dropdown,
  EmptyState,
  Field,
  Input,
  Skeleton,
  Textarea,
} from "../lib/ui";

const EXTRA_KEYS = ["performance", "difficulties", "additionalNotes"] as const;

const emptyNote = (studentId: number, date: string): NoteInput => ({
  studentId,
  classDate: date,
  topic: "",
  lessonContent: "",
  performance: "",
  difficulties: "",
  homework: "",
  nextLesson: "",
  additionalNotes: "",
});

const fromNote = (n: ClassNote): NoteInput => ({
  id: n.id,
  studentId: n.studentId,
  classDate: n.classDate,
  topic: n.topic ?? "",
  lessonContent: n.lessonContent ?? "",
  performance: n.performance ?? "",
  difficulties: n.difficulties ?? "",
  homework: n.homework ?? "",
  nextLesson: n.nextLesson ?? "",
  additionalNotes: n.additionalNotes ?? "",
});

/**
 * One screen for writing and re-reading a class. Context stays on the left,
 * the writing area gets the space, and Ctrl+S saves from anywhere in the form.
 */
export function NoteEditor() {
  const routeId = useParams().id;
  const noteId = routeId ? Number(routeId) : undefined;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();

  const { data: students } = useQuery({
    queryKey: keys.students({ sort: "name" }),
    queryFn: () => api.students({ sort: "name" }),
  });

  const { data: note, isPending } = useQuery({
    queryKey: keys.note(noteId!),
    queryFn: () => api.note(noteId!),
    enabled: noteId !== undefined,
  });

  const [form, setForm] = useState<NoteInput | null>(null);
  const [baseline, setBaseline] = useState("");
  const [savedAt, setSavedAt] = useState<Date>();
  const [error, setError] = useState<string>();
  const [showExtras, setShowExtras] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const topicRef = useRef<HTMLInputElement>(null);

  // Seed the form once: from the note being edited, or from the URL for a new one.
  useEffect(() => {
    if (form) return;
    if (noteId !== undefined) {
      if (!note) return;
      const seeded = fromNote(note);
      setForm(seeded);
      setBaseline(JSON.stringify(seeded));
      setShowExtras(EXTRA_KEYS.some((k) => seeded[k]));
    } else if (students) {
      const preferred = Number(params.get("student"));
      const studentId = students.some((s) => s.id === preferred)
        ? preferred
        : (students[0]?.id ?? 0);
      const seeded = emptyNote(studentId, params.get("date") ?? today());
      setForm(seeded);
      setBaseline(JSON.stringify(seeded));
    }
  }, [form, note, noteId, params, students]);

  const dirty = Boolean(form) && JSON.stringify(form) !== baseline;

  const save = useMutation({
    mutationFn: () => api.saveNote(form!),
    onSuccess: async (id) => {
      setBaseline(JSON.stringify({ ...form, id }));
      setForm((f) => (f ? { ...f, id } : f));
      setSavedAt(new Date());
      setError(undefined);
      await qc.invalidateQueries();
      if (noteId === undefined) navigate(`/notes/${id}`, { replace: true });
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteNote(noteId!),
    onSuccess: async () => {
      setBaseline(JSON.stringify(form)); // stop the unsaved-changes prompt
      await qc.invalidateQueries();
      toast("Class note deleted");
      navigate(form?.studentId ? `/students/${form.studentId}` : "/notes", { replace: true });
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  // Leaving with unsaved work asks first — nothing is thrown away silently.
  const blocker = useBlocker(dirty && !save.isPending);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty) save.mutate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, save]);

  const set = <K extends keyof NoteInput>(key: K, value: NoteInput[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setError(undefined);
  };

  const student = useMemo(
    () => students?.find((s) => s.id === form?.studentId),
    [students, form?.studentId],
  );

  if (isPending && noteId !== undefined) {
    return (
      <div className="px-10 py-8">
        <Skeleton className="h-11 w-72" />
        <Skeleton className="mt-8 h-80" />
      </div>
    );
  }

  if (students && students.length === 0) {
    return (
      <EmptyState
        title="Add a student first"
        body="Class notes belong to a student, so there needs to be at least one."
        action={
          <Button variant="primary" onClick={() => navigate("/students?new=1")}>
            Add student
          </Button>
        }
      />
    );
  }

  if (!form) {
    return (
      <div className="px-10 py-8">
        <Skeleton className="h-11 w-72" />
      </div>
    );
  }

  return (
    <>
      <header className="flex shrink-0 items-center justify-between gap-6 border-b border-line bg-canvas px-8 py-4 xl:px-10">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="-ml-1 inline-flex h-6 items-center gap-1.5 rounded-ctl px-1 text-2xs font-medium text-ink-3 transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
          <h1 className="truncate text-xl font-semibold tracking-tight text-ink">
            {noteId === undefined ? "New class note" : form.topic || "Class note"}
            {student && <span className="font-normal text-ink-3"> · {student.name}</span>}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <span aria-live="polite" className={cn("text-2xs", error ? "text-bad" : "text-ink-3")}>
            {error
              ? error
              : dirty
                ? "Unsaved changes"
                : savedAt
                  ? "Saved just now"
                  : noteId !== undefined
                    ? `Saved ${formatDate(form.classDate)}`
                    : ""}
          </span>
          {noteId !== undefined && (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 />
              Delete
            </Button>
          )}
          <Button variant="primary" onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
            Save
          </Button>
        </div>
      </header>

      <div
        data-selectable
        className="min-h-0 flex-1 overflow-y-auto"
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
            e.preventDefault();
            if (dirty) save.mutate();
          }
        }}
      >
        <div className="mx-auto grid w-full max-w-[1100px] gap-10 px-8 py-8 md:grid-cols-[17rem_minmax(0,1fr)] xl:px-10">
          <div className="space-y-6 md:sticky md:top-0 md:self-start">
            <Field label="Student">
              {(p) => (
                <Dropdown
                  {...p}
                  value={String(form.studentId)}
                  onValueChange={(v) => set("studentId", Number(v))}
                  items={(students ?? []).map((s) => ({
                    value: String(s.id),
                    label: s.name,
                    hint: s.englishLevel ?? undefined,
                  }))}
                />
              )}
            </Field>

            <Field label="Date">
              {(p) => (
                <Input
                  {...p}
                  type="date"
                  value={form.classDate}
                  onChange={(e) => set("classDate", e.target.value)}
                  className="num"
                />
              )}
            </Field>

            {student && (
              <div className="space-y-4 border-t border-line pt-5 text-xs">
                <div>
                  <p className="text-2xs font-semibold tracking-wide text-ink-3 uppercase">
                    Last class
                  </p>
                  <p className="mt-1 text-ink-2">
                    {student.lastClass ? formatDate(student.lastClass) : "None yet"}
                  </p>
                </div>
                {student.goals && (
                  <div>
                    <p className="text-2xs font-semibold tracking-wide text-ink-3 uppercase">
                      Goals
                    </p>
                    <p className="mt-1 leading-relaxed text-ink-2">{student.goals}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <Field label="Lesson / topic">
              {(p) => (
                <Input
                  {...p}
                  ref={topicRef}
                  autoFocus={noteId === undefined}
                  value={form.topic ?? ""}
                  onChange={(e) => set("topic", e.target.value)}
                  placeholder="Travel conversation"
                  className="h-13 text-lg font-medium"
                />
              )}
            </Field>

            <Field label="What we covered">
              {(p) => (
                <Textarea
                  {...p}
                  rows={8}
                  value={form.lessonContent ?? ""}
                  onChange={(e) => set("lessonContent", e.target.value)}
                  placeholder="Past tense with travel vocabulary. Practised asking for directions."
                  className="field-sizing-content min-h-48"
                />
              )}
            </Field>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Homework" optional>
                {(p) => (
                  <Textarea
                    {...p}
                    rows={4}
                    value={form.homework ?? ""}
                    onChange={(e) => set("homework", e.target.value)}
                    placeholder="Write 10 sentences about a past trip."
                    className="field-sizing-content min-h-28"
                  />
                )}
              </Field>
              <Field label="Next lesson" optional>
                {(p) => (
                  <Textarea
                    {...p}
                    rows={4}
                    value={form.nextLesson ?? ""}
                    onChange={(e) => set("nextLesson", e.target.value)}
                    placeholder="Review irregular verbs."
                    className="field-sizing-content min-h-28"
                  />
                )}
              </Field>
            </div>

            <div className="border-t border-line pt-5">
              <button
                type="button"
                onClick={() => setShowExtras((s) => !s)}
                aria-expanded={showExtras}
                className="-ml-2 inline-flex h-9 items-center gap-2 rounded-ctl px-2 text-xs font-medium text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
              >
                <ChevronDown
                  className={cn(
                    "size-[18px] transition-transform duration-150",
                    showExtras && "rotate-180",
                  )}
                />
                {showExtras ? "Fewer details" : "More details"}
                {!showExtras && (
                  <span className="font-normal text-ink-3">
                    performance, difficulties, extra notes
                  </span>
                )}
              </button>

              {showExtras && (
                <div className="mt-6 space-y-6">
                  <Field label="Student performance" optional>
                    {(p) => (
                      <Textarea
                        {...p}
                        rows={4}
                        value={form.performance ?? ""}
                        onChange={(e) => set("performance", e.target.value)}
                        className="field-sizing-content min-h-28"
                      />
                    )}
                  </Field>
                  <Field label="Difficulties / mistakes" optional>
                    {(p) => (
                      <Textarea
                        {...p}
                        rows={4}
                        value={form.difficulties ?? ""}
                        onChange={(e) => set("difficulties", e.target.value)}
                        className="field-sizing-content min-h-28"
                      />
                    )}
                  </Field>
                  <Field label="Additional notes" optional>
                    {(p) => (
                      <Textarea
                        {...p}
                        rows={4}
                        value={form.additionalNotes ?? ""}
                        onChange={(e) => set("additionalNotes", e.target.value)}
                        className="field-sizing-content min-h-28"
                      />
                    )}
                  </Field>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open && blocker.state === "blocked") blocker.reset();
        }}
        title="Leave without saving?"
        consequence="This class note has changes that haven't been saved yet."
        confirmLabel="Discard changes"
        onConfirm={() => blocker.state === "blocked" && blocker.proceed()}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this class note?"
        consequence="The note and everything written in it will be removed. This can't be undone."
        confirmLabel="Delete note"
        onConfirm={() => remove.mutate()}
      />
    </>
  );
}
