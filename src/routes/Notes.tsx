import { useQuery } from "@tanstack/react-query";
import { BookOpen, FilePlus2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageBody, PageHeader } from "../app/Shell";
import { api, keys, type ClassNote } from "../lib/api";
import { avatarTone, formatDate, initials } from "../lib/format";
import { Avatar, Button, Dropdown, EmptyState, SearchInput, Skeleton } from "../lib/ui";

const monthOf = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
    new Date(`${iso.slice(0, 10)}T12:00:00`),
  );

/** Every class, newest first — for "what did I teach last week?" */
export function Notes() {
  const [query, setQuery] = useState("");
  const [studentId, setStudentId] = useState("");
  const navigate = useNavigate();

  const { data: students } = useQuery({
    queryKey: keys.students({ sort: "name" }),
    queryFn: () => api.students({ sort: "name" }),
  });

  const filters = { query, studentId: studentId ? Number(studentId) : null };
  const { data: notes, isPending } = useQuery({
    queryKey: keys.notes(filters),
    queryFn: () => api.notes(filters),
    placeholderData: (prev) => prev,
  });

  const rows = notes ?? [];
  const groups: [string, ClassNote[]][] = [];
  for (const note of rows) {
    const month = monthOf(note.classDate);
    const last = groups.at(-1);
    if (last && last[0] === month) last[1].push(note);
    else groups.push([month, [note]]);
  }

  return (
    <>
      <PageHeader
        title="Class notes"
        subtitle="Every class you've recorded, newest first."
        count={rows.length}
        actions={
          <Button variant="primary" onClick={() => navigate("/notes/new")}>
            <FilePlus2 />
            Add class note
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search topics, homework, what you covered…"
            className="w-full max-w-[28rem]"
            autoFocus
          />
          <Dropdown
            label="Filter by student"
            value={studentId || "all"}
            onValueChange={(v) => setStudentId(v === "all" ? "" : v)}
            className="w-60"
            items={[
              { value: "all", label: "All students" },
              ...(students ?? []).map((s) => ({
                value: String(s.id),
                label: s.name,
                hint: s.englishLevel ?? undefined,
              })),
            ]}
          />
        </div>
      </PageHeader>

      <PageBody>
        {isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          query || studentId ? (
            <EmptyState
              icon={<BookOpen />}
              title="No class notes match that"
              body="Try a different word, or clear the student filter."
            />
          ) : (
            <EmptyState
              icon={<BookOpen />}
              title="No class notes yet"
              body="After a lesson, record what you covered so next time you know exactly where to pick up."
              action={
                <Button variant="primary" onClick={() => navigate("/notes/new")}>
                  <FilePlus2 />
                  Add class note
                </Button>
              }
            />
          )
        ) : (
          <div className="space-y-10">
            {groups.map(([month, items]) => (
              <section key={month}>
                <h2 className="mb-4 border-b border-line pb-2.5 text-2xs font-semibold tracking-wide text-ink-3 uppercase">
                  {month}
                </h2>
                <ol className="space-y-3">
                  {items.map((note) => (
                    <li key={note.id}>
                      <Link
                        to={`/notes/${note.id}`}
                        className="flex gap-4 rounded-panel border border-line bg-surface px-5 py-4 transition-colors duration-150 hover:border-line-strong hover:bg-raised"
                      >
                        <Avatar
                          name={initials(note.studentName)}
                          tone={avatarTone(note.studentName)}
                          size={38}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-4">
                            <h3 className="truncate text-lg font-semibold tracking-tight text-ink">
                              {note.topic || "Untitled class"}
                            </h3>
                            <span className="num shrink-0 text-2xs text-ink-3">
                              {formatDate(note.classDate)}
                            </span>
                          </div>
                          <p className="text-2xs text-ink-3">{note.studentName}</p>
                          {note.lessonContent && (
                            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-2">
                              {note.lessonContent}
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}
