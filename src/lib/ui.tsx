import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Check, ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "./format";

/* ============================ Button ============================ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-ink border-transparent shadow-[0_1px_2px_rgba(20,101,90,0.24)] hover:bg-accent-hover active:brightness-95",
  secondary: "bg-raised text-ink border-line-strong hover:bg-sunken active:bg-sunken/80",
  ghost: "bg-transparent text-ink-2 border-transparent hover:bg-sunken hover:text-ink",
  danger: "bg-transparent text-bad border-line-strong hover:bg-bad-soft hover:border-bad/40",
};

/**
 * `md` is the app's real button: 44px tall, wide enough to hit without aiming.
 * `sm` exists only for controls that sit inside an already-dense row.
 */
export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-ctl border font-medium",
        "transition-[background-color,border-color,color,box-shadow] duration-150 ease-out",
        "disabled:pointer-events-none disabled:opacity-45",
        "[&_svg]:size-[18px] [&_svg]:shrink-0",
        size === "sm" ? "h-9 px-3.5 text-xs [&_svg]:size-4" : "h-ctl px-5 text-base",
        BUTTON[variant],
        className,
      )}
      {...props}
    />
  );
}

/** Icon-only control. `label` is mandatory: it becomes the tooltip and the a11y name. */
export function IconButton({
  label,
  className,
  side,
  ...props
}: ComponentProps<"button"> & { label: string; side?: "top" | "right" | "bottom" | "left" }) {
  return (
    <Tooltip label={label} side={side}>
      <button
        type="button"
        aria-label={label}
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-ctl",
          "text-ink-3 transition-colors duration-150 hover:bg-sunken hover:text-ink",
          "disabled:pointer-events-none disabled:opacity-40",
          "[&_svg]:size-[18px]",
          className,
        )}
        {...props}
      />
    </Tooltip>
  );
}

/* ============================ Tooltip ============================ */

export function TooltipRoot({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={420} skipDelayDuration={200}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function Tooltip({
  label,
  side = "top",
  children,
}: {
  label: string;
  side?: "top" | "right" | "bottom" | "left";
  children: ReactNode;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={8}
          className="anim-pop z-50 max-w-80 rounded-ctl border border-line bg-raised px-2.5 py-1.5 text-2xs font-medium text-ink-2 shadow-md shadow-black/10"
        >
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/* ============================ Form fields ============================ */

const CONTROL =
  "w-full rounded-input border border-line-strong bg-raised px-3.5 text-base text-ink " +
  "transition-[border-color,box-shadow] duration-150 placeholder:text-ink-3 " +
  "focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent/20 " +
  "disabled:bg-sunken disabled:text-ink-3 aria-[invalid=true]:border-bad";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(CONTROL, "h-ctl", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea className={cn(CONTROL, "resize-y py-3 leading-relaxed", className)} {...props} />
  );
}

export type DropdownItem = { value: string; label: string; hint?: string };

/**
 * The app's dropdown. Built on Radix Select so it keeps listbox semantics,
 * keyboard navigation and type-ahead, but is styled like the rest of the app
 * instead of inheriting whatever the OS draws for a native select.
 *
 * Values are strings — Radix reserves the empty string for "nothing selected",
 * so a caller that needs an "any / none" row gives it a real value like "all".
 */
export function Dropdown({
  value,
  onValueChange,
  items,
  label,
  placeholder = "Select…",
  className,
  id,
  disabled,
  ...aria
}: {
  value: string;
  onValueChange: (value: string) => void;
  items: DropdownItem[];
  /** Accessible name when there is no visible <Field> label. */
  label?: string;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const selected = items.find((i) => i.value === value);
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        id={id}
        aria-label={label}
        {...aria}
        className={cn(
          CONTROL,
          "flex h-ctl items-center justify-between gap-2 pr-3 text-left",
          "data-[placeholder]:text-ink-3 data-[state=open]:border-accent data-[state=open]:ring-[3px] data-[state=open]:ring-accent/20",
          className,
        )}
      >
        <span className="flex min-w-0 flex-1 items-baseline gap-2 truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
          {selected?.hint && <span className="shrink-0 text-2xs text-ink-3">{selected.hint}</span>}
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="size-4 shrink-0 text-ink-3" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="anim-pop z-50 max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-panel border border-line bg-raised shadow-xl shadow-black/12"
        >
          <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-ink-3">
            <ChevronUp className="size-4" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1.5">
            {items.map((item) => (
              <SelectPrimitive.Item
                key={item.value}
                value={item.value}
                className={cn(
                  "flex h-9 cursor-default items-center gap-2.5 rounded-ctl pr-3 pl-2 text-base text-ink outline-none",
                  "data-highlighted:bg-sunken data-disabled:pointer-events-none data-disabled:opacity-40",
                )}
              >
                <span className="grid size-4 shrink-0 place-items-center text-accent">
                  <SelectPrimitive.ItemIndicator>
                    <Check className="size-4" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{item.label}</SelectPrimitive.ItemText>
                {item.hint && (
                  <span className="ml-auto shrink-0 pl-4 text-2xs text-ink-3">{item.hint}</span>
                )}
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-ink-3">
            <ChevronDown className="size-4" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/** Label + control + hint/error. The label is always real, never a placeholder. */
export function Field({
  label,
  hint,
  error,
  optional,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }) => ReactNode;
}) {
  const id = useId();
  const descId = `${id}-desc`;
  const message = error ?? hint;
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="flex items-baseline gap-2 text-xs font-medium text-ink">
        {label}
        {optional && <span className="text-2xs font-normal text-ink-3">optional</span>}
      </label>
      {children({
        id,
        "aria-describedby": message ? descId : undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {message && (
        <p id={descId} className={cn("text-2xs", error ? "text-bad" : "text-ink-3")}>
          {message}
        </p>
      )}
    </div>
  );
}

/** Search is a first-class control here: taller than an input, never tucked away. */
export function SearchInput({
  value,
  onValueChange,
  placeholder = "Search…",
  className,
  ...props
}: Omit<ComponentProps<"input">, "value" | "onChange"> & {
  value: string;
  onValueChange: (v: string) => void;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-ink-3"
      />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.stopPropagation();
            onValueChange("");
          }
        }}
        className={cn(
          CONTROL,
          "h-[46px] pl-11",
          value && "pr-11",
          "[&::-webkit-search-cancel-button]:hidden",
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onValueChange("")}
          className="absolute top-1/2 right-2.5 grid size-7 -translate-y-1/2 place-items-center rounded-ctl text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

/* ============================ Display ============================ */

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "neutral" | "accent" | "warn" | "bad";
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    neutral: "border-line bg-sunken text-ink-2",
    accent: "border-accent/15 bg-accent-soft text-accent",
    warn: "border-transparent bg-warn-soft text-warn",
    bad: "border-transparent bg-bad-soft text-bad",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-2xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({
  name,
  tone,
  color,
  size = 36,
  className,
}: {
  name: string;
  tone?: string;
  /** Solid fill (hex) with white initials; wins over `tone`. */
  color?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.36, background: color }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold tracking-tight",
        color ? "text-white" : tone,
        className,
      )}
    >
      {name}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="num inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-md border border-line bg-sunken px-1.5 font-sans text-2xs font-medium text-ink-3">
      {children}
    </kbd>
  );
}

export function Panel({ className, ...props }: ComponentProps<"section">) {
  return (
    <section className={cn("rounded-panel border border-line bg-surface", className)} {...props} />
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-8 py-20 text-center", className)}>
      {icon && (
        <div className="mb-5 grid size-14 place-items-center rounded-full border border-line bg-surface text-ink-3 [&_svg]:size-6">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold tracking-tight text-ink">{title}</h3>
      {body && <p className="mt-2 max-w-[42ch] text-xs leading-relaxed text-ink-3">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-panel bg-sunken", className)} />;
}

/* ============================ Dialog ============================ */

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  width = 580,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  width?: number;
  children?: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="anim-overlay fixed inset-0 z-40 bg-[#1c1813]/30 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          style={{ width, maxWidth: "calc(100vw - 4rem)" }}
          className="anim-pop fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-5rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/20"
        >
          <header className="flex items-start justify-between gap-6 border-b border-line px-6 py-5">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-lg font-semibold tracking-tight text-ink">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-1 text-xs leading-relaxed text-ink-3">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <IconButton label="Close" className="-mt-1 -mr-2" />
            </DialogPrimitive.Close>
          </header>
          <div data-selectable className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            {children}
          </div>
          {footer && (
            <footer className="flex items-center justify-end gap-3 border-t border-line bg-canvas px-6 py-4">
              {footer}
            </footer>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Confirmation for destructive work only. `consequence` must spell out what is
 * lost — "Are you sure?" tells a teacher nothing.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  consequence,
  confirmLabel,
  onConfirm,
  tone = "danger",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  consequence: string;
  confirmLabel: string;
  onConfirm: () => void;
  tone?: "danger" | "primary";
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      width={460}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            className={
              tone === "danger"
                ? "bg-bad text-white shadow-[0_1px_2px_rgba(166,51,41,0.24)] hover:bg-bad/90"
                : undefined
            }
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-base leading-relaxed text-ink-2">{consequence}</p>
    </Dialog>
  );
}

/* ============================ Menus ============================ */

const MENU_CONTENT =
  "anim-pop z-50 min-w-56 overflow-hidden rounded-panel border border-line bg-raised p-1.5 shadow-xl shadow-black/12";

const MENU_ITEM =
  "flex h-9 cursor-default items-center gap-2.5 rounded-ctl px-2.5 text-base text-ink outline-none " +
  "data-highlighted:bg-sunken data-disabled:pointer-events-none data-disabled:opacity-40 " +
  "[&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-ink-3";

export function Menu({
  trigger,
  children,
  align = "end",
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
}) {
  return (
    <DropdownPrimitive.Root>
      <DropdownPrimitive.Trigger asChild>{trigger}</DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content align={align} sideOffset={6} className={MENU_CONTENT}>
          {children}
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
}

export function MenuItem({
  danger,
  className,
  ...props
}: ComponentProps<typeof DropdownPrimitive.Item> & { danger?: boolean }) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        MENU_ITEM,
        danger && "text-bad data-highlighted:bg-bad-soft [&_svg]:text-bad",
        className,
      )}
      {...props}
    />
  );
}

export function MenuSeparator() {
  return <DropdownPrimitive.Separator className="my-1.5 h-px bg-line" />;
}

export function ContextMenu({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger asChild>{trigger}</ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content className={MENU_CONTENT}>
          {children}
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
}

export function ContextMenuItem({
  danger,
  className,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Item> & { danger?: boolean }) {
  return (
    <ContextMenuPrimitive.Item
      className={cn(
        MENU_ITEM,
        danger && "text-bad data-highlighted:bg-bad-soft [&_svg]:text-bad",
        className,
      )}
      {...props}
    />
  );
}

export function ContextMenuSeparator() {
  return <ContextMenuPrimitive.Separator className="my-1.5 h-px bg-line" />;
}
