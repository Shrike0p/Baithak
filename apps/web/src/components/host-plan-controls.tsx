"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Trash2, XCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

/**
 * What a host can do to their own party once it exists.
 *
 * Wrapping up is the moment a party becomes history — it opens the archive
 * entry and the host's proof. Cancelling keeps the plan visible to the people
 * who were accepted, so nobody turns up to a dead address. Deleting is only
 * offered while nobody else is committed; after that the API refuses, because
 * the plan is part of other people's history too.
 */
export function HostPlanControls({
  planId,
  status,
  hasStarted,
  confirmedGuests,
}: {
  planId: string;
  status: string;
  hasStarted: boolean;
  confirmedGuests: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState<"cancel" | "delete" | null>(null);

  async function act(body: object) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    setAsking(null);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "that didn't work");
      return;
    }
    router.refresh();
  }

  async function destroy() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/plans/${planId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setAsking(null);
      setError((await res.json().catch(() => ({}))).error ?? "that didn't work");
      return;
    }
    router.push("/plans");
  }

  if (status === "CANCELLED") {
    return (
      <p className="border-2 border-foreground bg-muted p-4 font-bold">
        You cancelled this plan. Everyone who was accepted can still see it.
      </p>
    );
  }

  // Wrapped up: nothing left to do, so say where it went rather than render an
  // empty box under a heading.
  if (status === "COMPLETED") {
    return (
      <div className="space-y-2">
        <p className="font-bold">This night is wrapped.</p>
        <p className="text-sm text-muted-foreground">
          It&apos;s in your history and in &ldquo;Already happened&rdquo;. Photos you publish from
          the album show there too.
        </p>
      </div>
    );
  }

  const button =
    "inline-flex h-11 items-center gap-2 border-2 border-foreground px-5 font-bold uppercase shadow-stamp-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {status !== "COMPLETED" && hasStarted && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act({ status: "COMPLETED" })}
            className={`${button} bg-accent text-accent-foreground`}
          >
            <CheckCircle2 className="size-4" /> Wrap up the night
          </button>
        )}

        {status !== "COMPLETED" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setAsking("cancel")}
            className={`${button} bg-background`}
          >
            <XCircle className="size-4" /> Cancel plan
          </button>
        )}

        {confirmedGuests === 0 && status !== "COMPLETED" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setAsking("delete")}
            className={`${button} bg-background text-muted-foreground`}
          >
            <Trash2 className="size-4" /> Delete
          </button>
        )}
      </div>

      {status !== "COMPLETED" && !hasStarted && (
        <p className="text-sm text-muted-foreground">
          You can wrap this up once it&apos;s started — that&apos;s what puts it in your history.
        </p>
      )}

      {error && <p className="font-bold text-primary">{error}</p>}

      <ConfirmDialog
        open={asking === "cancel"}
        onClose={() => setAsking(null)}
        onConfirm={() => void act({ status: "CANCELLED" })}
        title="Cancel this plan?"
        confirmLabel="Cancel the plan"
        danger
        busy={busy}
      >
        {confirmedGuests > 0
          ? `${confirmedGuests} ${confirmedGuests === 1 ? "person has" : "people have"} been accepted. They'll still see the plan, marked as off — so nobody turns up to a dark flat.`
          : "Nobody's been accepted yet. The plan stays up, marked as cancelled."}
      </ConfirmDialog>

      <ConfirmDialog
        open={asking === "delete"}
        onClose={() => setAsking(null)}
        onConfirm={() => void destroy()}
        title="Delete for good?"
        confirmLabel="Delete it"
        danger
        typeToConfirm="delete"
        busy={busy}
      >
        The plan, its requests and its chat are gone, and this can&apos;t be undone. If you
        might run it another time, cancel it instead.
      </ConfirmDialog>
    </div>
  );
}
