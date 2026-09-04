import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  FilePlus2,
  Link2,
  Upload,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { PageBody } from "../app/Shell";
import { api, keys } from "../lib/api";
import { avatarTone, categoryOf, formatDate, initials, relativeDate } from "../lib/format";
import { Avatar, Badge, Button, EmptyState, Skeleton } from "../lib/ui";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

/** Who am I teaching, what happened last class, what am I teaching with. */
export function Dashboard() {
  const navigate = useNavigate();
  const { data, isPending } = useQuery({ queryKey: keys.dashboard, queryFn: api.dashboard });

  if (isPending) {
    return (
      <PageBody>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-8 h-28" />
        <div className="mt-10 grid gap-10 xl:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </PageBody>
    );
  }

  const empty =
    data && data.studentCount === 0 && data.noteCount === 0 && data.materialCount === 0;

  return (
    <PageBody>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{greeting()}</h1>
        <p className="mt-1.5 text-xs text-ink-2">
          {new Intl.DateTimeFormat(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          }).format(new Date())}
          {data && !empty && (
            <>
              {" · "}
              <span className="num">{data.studentCount}</span> student
              {data.studentCount === 1 ? "" : "s"}
              {" · "}
              <span className="num">{data.noteCount}</span> class note
              {data.noteCount === 1 ? "" : "s"}
              {" · "}
              <span className="num">{data.materialCount}</span> material
              {data.materialCount === 1 ? "" : "s"}
            </>
          )}
        </p>
      </header>

      {empty ? (
        <EmptyState
          icon={<Users />}
          title="Welcome to ESL App"
          body="Keep your students, class notes and teaching materials in one place. Start by adding the first student — everything else follows from there."
          action={
            <Button variant="primary" onClick={() => navigate("/students?new=1")}>
              <UserPlus />
              Add your first student
            </Button>
          }
        />
      ) : (
        <>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <QuickAction
              icon={FilePlus2}
              label="Add class note"
              hint="Record what you just taught"
              primary
              onClick={() => navigate("/notes/new")}
            />
            <QuickAction
              icon={UserPlus}
              label="Add student"
              hint="Name, level, goals"
              onClick={() => navigate("/students?new=1")}
            />
            <QuickAction
              icon={Upload}
              label="Add material"
              hint="Point at files on this computer"
              onClick={() => navigate("/materials?new=1")}
            />
          </div>

          <div className="mt-11 grid gap-11 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <Section
              title="Recent class notes"
              to="/notes"
              count={data?.recentNotes.length ?? 0}
              empty="No classes recorded yet."
            >
              <ul className="-mx-3">
                {data?.recentNotes.map((n) => (
                  <li key={n.id}>
                    <Link
                      to={`/notes/${n.id}`}
                      className="flex gap-3.5 rounded-panel px-3 py-3.5 transition-colors hover:bg-surface"
                    >
                      <Avatar
                        name={initials(n.studentName)}
                        tone={avatarTone(n.studentName)}
                        size={34}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-base font-medium text-ink">
                            {n.topic || "Untitled class"}
                          </span>
                          <span className="num shrink-0 text-2xs text-ink-3">
                            {formatDate(n.classDate)}
                          </span>
                        </div>
                        <p className="truncate text-2xs text-ink-3">{n.studentName}</p>
                        {n.nextLesson && (
                          <p className="mt-1.5 truncate text-2xs text-ink-2">
                            <span className="font-medium text-ink-3">Next: </span>
                            {n.nextLesson}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>

            <div className="space-y-11">
              <Section
                title="Recently viewed students"
                to="/students"
                count={data?.recentStudents.length ?? 0}
                empty="Open a student and they'll show up here."
              >
                <ul className="-mx-3">
                  {data?.recentStudents.map((s) => (
                    <li key={s.id}>
                      <Link
                        to={`/students/${s.id}`}
                        className="flex items-center gap-3 rounded-panel px-3 py-3 transition-colors hover:bg-surface"
                      >
                        <Avatar name={initials(s.name)} tone={avatarTone(s.name)} size={34} />
                        <span className="min-w-0 flex-1 truncate text-base font-medium text-ink">
                          {s.name}
                        </span>
                        {s.englishLevel && <Badge tone="accent">{s.englishLevel}</Badge>}
                        <span className="num w-24 shrink-0 text-right text-2xs text-ink-3">
                          {s.lastClass ? relativeDate(s.lastClass) : "No classes"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section
                title="Recent materials"
                to="/materials"
                count={data?.recentMaterials.length ?? 0}
                empty="Drag teaching files into Materials to build your library."
              >
                <ul className="-mx-3">
                  {data?.recentMaterials.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => api.openMaterial(m.id).catch(() => navigate("/materials"))}
                        className="flex w-full items-center gap-3 rounded-panel px-3 py-3 text-left transition-colors hover:bg-surface"
                      >
                        <MaterialIcon kind={m.kind} exists={m.exists} />
                        <span className="min-w-0 flex-1 truncate text-base font-medium text-ink">
                          {m.name}
                        </span>
                        <span className="num shrink-0 text-2xs text-ink-3">{m.kind}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Section>
            </div>
          </div>
        </>
      )}
    </PageBody>
  );
}

/** A quick action is a target, not a toolbar button — it says what it does. */
function QuickAction({
  icon: Icon,
  label,
  hint,
  primary,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? "group flex items-center gap-3.5 rounded-panel border border-accent bg-accent px-4 py-4 text-left text-accent-ink shadow-[0_1px_2px_rgba(20,101,90,0.24)] transition-colors duration-150 hover:bg-accent-hover"
          : "group flex items-center gap-3.5 rounded-panel border border-line bg-surface px-4 py-4 text-left transition-colors duration-150 hover:border-line-strong hover:bg-raised"
      }
    >
      <span
        className={
          primary
            ? "grid size-10 shrink-0 place-items-center rounded-ctl bg-white/15"
            : "grid size-10 shrink-0 place-items-center rounded-ctl bg-accent-soft text-accent"
        }
      >
        <Icon className="size-[20px]" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-base font-semibold">{label}</span>
        <span className={primary ? "block truncate text-2xs text-white/70" : "block truncate text-2xs text-ink-3"}>
          {hint}
        </span>
      </span>
    </button>
  );
}

function MaterialIcon({ kind, exists }: { kind: string; exists: boolean }) {
  return (
    <span
      aria-hidden
      title={categoryOf(kind)}
      className={`num grid size-8 shrink-0 place-items-center rounded-ctl text-2xs font-semibold ${
        exists ? "bg-sunken text-ink-3" : "bg-bad-soft text-bad"
      }`}
    >
      {kind === "LINK" ? <Link2 className="size-4" /> : kind.slice(0, 2)}
    </span>
  );
}

function Section({
  title,
  to,
  count,
  empty,
  children,
}: {
  title: string;
  to: string;
  count: number;
  empty: string;
  children?: React.ReactNode;
}) {
  return (
    <section>
      <header className="mb-2 flex items-baseline justify-between gap-3 border-b border-line pb-3">
        <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
        <Link
          to={to}
          className="inline-flex items-center gap-1 rounded-ctl text-2xs font-medium text-ink-3 transition-colors hover:text-accent"
        >
          View all
          <ArrowRight className="size-4" />
        </Link>
      </header>
      {count > 0 ? children : <p className="px-1 py-8 text-xs text-ink-3">{empty}</p>}
    </section>
  );
}
