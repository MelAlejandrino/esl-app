import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, type Student, type StudentInput } from "../lib/api";
import { LEVELS, STUDENT_COLORS, studentColor } from "../lib/format";
import { useToast } from "../lib/toast";
import { Button, Dialog, Dropdown, Field, Input, Textarea } from "../lib/ui";

const blank: StudentInput = {
  name: "",
  preferredName: "",
  age: null,
  email: "",
  phone: "",
  englishLevel: "",
  goals: "",
  generalNotes: "",
};

const from = (s: Student): StudentInput => ({
  id: s.id,
  name: s.name,
  preferredName: s.preferredName ?? "",
  age: s.age,
  email: s.email ?? "",
  phone: s.phone ?? "",
  englishLevel: s.englishLevel ?? "",
  goals: s.goals ?? "",
  generalNotes: s.generalNotes ?? "",
  color: s.color,
});

/**
 * Add and edit share one form: same fields, same validation, same shortcuts.
 * Only the name is required — a teacher can fill in the rest whenever.
 */
export function StudentDialog({
  open,
  onOpenChange,
  student,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student;
  onSaved?: (id: number) => void;
}) {
  const [form, setForm] = useState<StudentInput>(() => (student ? from(student) : blank));
  const [error, setError] = useState<string>();
  const toast = useToast();
  const qc = useQueryClient();

  // Remount-free reset: the dialog is keyed by student id at the call site.
  const set = <K extends keyof StudentInput>(key: K, value: StudentInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(undefined);
  };

  const save = useMutation({
    mutationFn: () => api.saveStudent(form),
    onSuccess: async (id) => {
      await qc.invalidateQueries();
      toast(student ? "Student updated" : `${form.name.trim()} added`);
      onOpenChange(false);
      onSaved?.(id);
    },
    onError: (e: Error) => setError(e.message),
  });

  const isCustom = Boolean(form.color) && !(STUDENT_COLORS as readonly string[]).includes(form.color!);

  const submit = () => {
    if (!form.name.trim()) {
      setError("A student needs a name.");
      return;
    }
    save.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={student ? `Edit ${student.preferredName || student.name}` : "Add student"}
      width={620}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={save.isPending}>
            {student ? "Save changes" : "Add student"}
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
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
            e.preventDefault();
            submit();
          }
        }}
      >
        <div className="grid grid-cols-2 gap-5">
          <Field label="Full name" error={error} className="col-span-2">
            {(p) => (
              <Input
                {...p}
                autoFocus
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Maria Santos"
              />
            )}
          </Field>

          <Field label="Preferred name" optional hint="What you actually call them in class">
            {(p) => (
              <Input
                {...p}
                value={form.preferredName ?? ""}
                onChange={(e) => set("preferredName", e.target.value)}
                placeholder="Maria"
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-5">
            <Field label="Level" optional>
              {(p) => (
                <Dropdown
                  {...p}
                  value={form.englishLevel || "none"}
                  onValueChange={(v) => set("englishLevel", v === "none" ? "" : v)}
                  items={[
                    { value: "none", label: "Not set" },
                    ...LEVELS.map((l) => ({ value: l, label: l })),
                  ]}
                />
              )}
            </Field>
            <Field label="Age" optional>
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  min={1}
                  max={120}
                  value={form.age ?? ""}
                  onChange={(e) =>
                    set("age", e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              )}
            </Field>
          </div>

          <Field label="Email" optional>
            {(p) => (
              <Input
                {...p}
                type="email"
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
                placeholder="maria@example.com"
              />
            )}
          </Field>

          <Field label="Phone" optional>
            {(p) => (
              <Input
                {...p}
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
              />
            )}
          </Field>
        </div>

        <div>
          <div className="mb-2 text-xs font-medium text-ink-2">Colour</div>
          <div className="flex gap-2.5" role="radiogroup" aria-label="Student colour">
            {STUDENT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={(form.color || studentColor({ name: form.name, color: null })) === c}
                aria-label={c}
                onClick={() => set("color", c)}
                style={{ background: c }}
                className="size-7 rounded-full ring-offset-2 ring-offset-surface aria-checked:ring-2 aria-checked:ring-ink"
              />
            ))}
            {/* Native colour wheel for when the presets are all taken. */}
            <label
              title="Custom colour"
              aria-checked={isCustom}
              role="radio"
              style={{
                background: isCustom
                  ? form.color!
                  : "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
              }}
              className="relative size-7 cursor-pointer rounded-full ring-offset-2 ring-offset-surface aria-checked:ring-2 aria-checked:ring-ink"
            >
              <input
                type="color"
                aria-label="Custom colour"
                value={form.color || "#888888"}
                onChange={(e) => set("color", e.target.value)}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>

        <Field label="Learning goals" optional>
          {(p) => (
            <Textarea
              {...p}
              rows={4}
              value={form.goals ?? ""}
              onChange={(e) => set("goals", e.target.value)}
              placeholder="Speak confidently in work meetings"
            />
          )}
        </Field>

        <Field label="General notes" optional hint="Anything worth remembering between classes">
          {(p) => (
            <Textarea
              {...p}
              rows={4}
              value={form.generalNotes ?? ""}
              onChange={(e) => set("generalNotes", e.target.value)}
            />
          )}
        </Field>

        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  );
}
