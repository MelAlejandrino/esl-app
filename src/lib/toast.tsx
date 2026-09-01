import { AlertTriangle, Check, X } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { cn } from "./format";

type Tone = "ok" | "error";
type Toast = { id: number; message: string; tone: Tone };

const ToastContext = createContext<{
  toast: (message: string, tone?: Tone) => void;
}>({ toast: () => {} });

/** `toast("Class note saved")` for confirmations, `toast(msg, "error")` for failures. */
export const useToast = () => useContext(ToastContext).toast;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: Tone = "ok") => {
      const id = next.current++;
      // Only one toast at a time: a queue of five stacked confirmations is noise.
      setItems([{ id, message, tone }]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 6000 : 2800);
    },
    [dismiss],
  );

  return (
    <ToastContext value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "anim-pop pointer-events-auto flex items-center gap-2.5 rounded-panel border py-3 pr-3 pl-4 text-base shadow-lg shadow-black/12",
              t.tone === "error"
                ? "border-bad/30 bg-bad-soft text-bad"
                : "border-line bg-raised text-ink",
            )}
          >
            {t.tone === "error" ? (
              <AlertTriangle aria-hidden className="size-[18px] shrink-0" />
            ) : (
              <Check aria-hidden className="size-[18px] shrink-0 text-good" />
            )}
            <span className="max-w-[46ch]">{t.message}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="grid size-7 shrink-0 place-items-center rounded-ctl text-current opacity-50 transition hover:bg-black/5 hover:opacity-100"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
