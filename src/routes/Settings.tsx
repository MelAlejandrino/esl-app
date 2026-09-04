import { open as openFileDialog, save as saveFileDialog } from "@tauri-apps/plugin-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Download, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import { useState } from "react";
import { PageBody, PageHeader } from "../app/Shell";
import { api } from "../lib/api";
import { today } from "../lib/format";
import { shortcut } from "../lib/platform";
import { useToast } from "../lib/toast";
import { Button, ConfirmDialog, Kbd } from "../lib/ui";

const REPO = "MelAlejandrino/esl-app";
const RELEASES_URL = `https://github.com/${REPO}/releases/latest`;

const SHORTCUTS: [string, string][] = [
  [shortcut("K"), "Search everything"],
  [shortcut("N"), "New item on this page"],
  [shortcut("S"), "Save the class note you're writing"],
  [shortcut("B"), "Collapse or expand the sidebar"],
  [shortcut(","), "Open settings"],
  ["Esc", "Close a dialog or clear a search"],
];

export function Settings() {
  const [pendingRestore, setPendingRestore] = useState<string>();
  const toast = useToast();
  const qc = useQueryClient();

  const backup = useMutation({
    mutationFn: async () => {
      const dest = await saveFileDialog({
        title: "Save backup",
        defaultPath: `esl-app-backup-${today()}.db`,
        filters: [{ name: "ESL App backup", extensions: ["db"] }],
      });
      if (!dest) return false;
      await api.backup(dest);
      return true;
    },
    onSuccess: (done) => done && toast("Backup saved"),
    onError: (e: Error) => toast(e.message, "error"),
  });

  const restore = useMutation({
    mutationFn: (src: string) => api.restore(src),
    onSuccess: () => {
      qc.invalidateQueries();
      toast("Backup restored");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  // Only ever runs when the teacher presses the button — nothing checks in the
  // background. GitHub sees the request itself (IP and the webview's user agent),
  // but nothing about them or their students is sent.
  const updates = useMutation({
    mutationFn: async () => {
      let res: Response;
      try {
        // An unreachable host rejects rather than returning !ok, and a captive
        // portal can hang forever — both land here as one friendly message.
        res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        throw new Error("Couldn't reach GitHub. Check your connection and try again.");
      }
      if (res.status === 404) throw new Error("No versions have been published yet.");
      if (!res.ok) {
        throw new Error(`GitHub couldn't answer just now (${res.status}). Try again later.`);
      }
      const { tag_name } = await res.json();
      const tag = String(tag_name ?? "").replace(/^v/, "");
      if (!tag) throw new Error("GitHub didn't say which version is newest.");
      return tag;
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  // Pick the file first, then confirm — so the teacher sees which backup they
  // are about to swap in before agreeing to replace everything.
  const pickRestore = async () => {
    const src = await openFileDialog({
      multiple: false,
      title: "Choose a backup to restore",
      filters: [{ name: "ESL App backup", extensions: ["db"] }],
    });
    if (typeof src === "string") setPendingRestore(src);
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="How ESL App keeps and protects your work." />
      <PageBody>
        <div className="max-w-2xl divide-y divide-line">
          <Group
            title="Your data"
            description="Everything lives in a single SQLite file on this computer. A backup is a copy of that file — keep one somewhere safe."
          >
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => backup.mutate()} disabled={backup.isPending}>
                <Download />
                Save a backup…
              </Button>
              <Button onClick={pickRestore} disabled={restore.isPending}>
                <Upload />
                Restore a backup…
              </Button>
            </div>
          </Group>

          <Group title="Keyboard" description="The shortcuts worth learning.">
            <dl className="divide-y divide-line border-y border-line text-xs">
              {SHORTCUTS.map(([keys, label]) => (
                <div key={keys} className="flex items-center justify-between gap-6 py-2.5">
                  <dt className="text-ink-2">{label}</dt>
                  <dd>
                    <Kbd>{keys}</Kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </Group>

          <Group title="Privacy">
            <div className="flex gap-3.5 rounded-panel border border-line bg-surface px-4 py-4">
              <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-good" />
              <p className="text-xs leading-relaxed text-ink-2">
                <span className="font-semibold text-ink">Private by default.</span> ESL App works
                offline, has no account, and never contacts anything on its own — only the update
                check below reaches the internet, and only when you press it. Your students'
                details, class notes and materials never leave this machine.
              </p>
            </div>
          </Group>

          <Group title="About" description="Worth quoting if you report something that looks wrong.">
            <p data-selectable className="num text-xs leading-relaxed text-ink-2">
              ESL App {__APP_VERSION__}
              <br />
              {navigator.userAgent}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button onClick={() => updates.mutate()} disabled={updates.isPending}>
                <RefreshCw />
                {updates.isPending ? "Checking…" : "Check for updates"}
              </Button>
              {/* ponytail: GitHub's "latest" is the newest published release, so a plain
                  string mismatch is enough — no semver parsing. It reads any mismatch as
                  "newer", so a dev build ahead of the last release, or a tag not shaped
                  like the version in package.json, both show as an available update.
                  Compare version numbers properly if either starts to matter. */}
              {updates.data &&
                (updates.data === __APP_VERSION__ ? (
                  <span className="num text-xs text-ink-3">You're on the latest version.</span>
                ) : (
                  <span className="num text-xs text-ink-2">
                    Version {updates.data} is available.{" "}
                    <button
                      onClick={() =>
                        openUrl(RELEASES_URL).catch((e: Error) => toast(e.message, "error"))
                      }
                      className="font-semibold text-ink underline underline-offset-2"
                    >
                      Open the download page
                    </button>
                  </span>
                ))}
            </div>
          </Group>
        </div>
      </PageBody>

      <ConfirmDialog
        open={Boolean(pendingRestore)}
        onOpenChange={(o) => !o && setPendingRestore(undefined)}
        title="Replace everything with this backup?"
        consequence={`Every student, class note and material currently in ESL App will be replaced by the contents of ${pendingRestore?.split(/[\\/]/).pop()}. Save a backup of what you have now if you might want it back.`}
        confirmLabel="Replace my data"
        onConfirm={() => pendingRestore && restore.mutate(pendingRestore)}
      />
    </>
  );
}

function Group({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-8 first:pt-0 last:pb-0">
      <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
      {description && (
        <p className="mt-1.5 max-w-prose text-xs leading-relaxed text-ink-3">{description}</p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}
