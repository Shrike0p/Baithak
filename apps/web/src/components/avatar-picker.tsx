"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { uploadImage } from "@/lib/upload";
import { Avatar } from "@/components/person-card";

/**
 * Your face, with a camera button over it.
 *
 * Saves immediately rather than waiting for the profile form's Save — a photo
 * is a single decision, and leaving it in an unsaved form is how people end up
 * thinking they uploaded one when they didn't.
 */
export function AvatarPicker({ name, image }: { name: string; image: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { objectKey } = await uploadImage(file, "avatar");
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: objectKey }),
      });
      if (!res.ok) throw new Error("could not save that photo");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "something went wrong");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <div className="group relative w-fit">
        <Avatar name={name} image={image} size="lg" />
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          aria-label={image ? "Change your photo" : "Add a photo"}
          className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-foreground bg-primary text-primary-foreground shadow-stamp-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
        >
          <Camera className="size-3.5" />
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => void pick(e.target.files?.[0])}
        />
      </div>
      {busy && <p className="meta-label mt-2 text-muted-foreground">Uploading…</p>}
      {error && <p className="mt-2 text-sm font-bold text-primary">{error}</p>}
    </div>
  );
}
