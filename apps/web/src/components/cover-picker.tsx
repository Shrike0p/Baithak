"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { uploadImage } from "@/lib/upload";

/**
 * Replaces a plan's flyer art with the host's own photo. Sits over the hero
 * image and only renders for the host — see the PATCH in
 * apps/api/src/app/api/plans/[id]/route.ts, which enforces that server-side.
 */
export function CoverPicker({ planId }: { planId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { objectKey } = await uploadImage(file, "cover", planId);
      const res = await fetch(`/api/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectKey }),
      });
      if (!res.ok) throw new Error("could not save that cover");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "something went wrong");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="absolute right-4 top-4 text-right md:right-8 md:top-8">
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="inline-flex h-10 items-center gap-2 border-2 border-foreground bg-background px-4 font-bold uppercase shadow-stamp-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
      >
        <ImagePlus className="size-4" />
        {busy ? "Uploading…" : "Change cover"}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      {error && (
        <p className="mt-2 rounded-sm bg-background px-2 py-1 text-sm font-bold text-primary">
          {error}
        </p>
      )}
    </div>
  );
}
