"use client";

import { useRef, useState, type DragEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ImagePlus, Trash2 } from "lucide-react";
import { uploadImage, takenAt } from "@/lib/upload";
import type { Memory } from "@/lib/api";
import { PaperCard } from "@/components/ui";

const TILTS = ["rotate-[-2deg]", "rotate-2", "rotate-[-1deg]", "rotate-1"];

/**
 * The album, and the way photos get into it.
 *
 * Uploads run one at a time rather than in parallel: a phone on party wifi
 * uploading eight 1.5MB files at once tends to stall them all, and sequential
 * gives an honest "3 of 8" instead of eight spinners that finish together.
 */
export function MemoryGallery({
  planId,
  memories,
  canUpload = true,
  hidden = 0,
}: {
  planId: string;
  memories: Memory[];
  /** Only people who were confirmed in the plan can add to the album. */
  canUpload?: boolean;
  /** Photos the viewer isn't allowed to see. A count, never the files. */
  hidden?: number;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(files: FileList | null) {
    const picked = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (picked.length === 0) return;

    setError(null);
    setBusy({ done: 0, total: picked.length });

    for (const [i, file] of picked.entries()) {
      try {
        const { objectKey } = await uploadImage(file, "memory", planId);
        const res = await fetch(`/api/plans/${planId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objectKey, takenAt: takenAt(file) }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "could not save that photo");
      } catch (e) {
        setError(e instanceof Error ? e.message : "something went wrong");
        break;
      }
      setBusy({ done: i + 1, total: picked.length });
    }

    setBusy(null);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  async function publish(id: string, isPublic: boolean) {
    const res = await fetch(`/api/photos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic }),
    });
    if (res.ok) router.refresh();
    else setError("could not change that photo");
  }

  async function remove(id: string) {
    const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else setError("could not delete that photo");
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    void add(e.dataTransfer.files);
  }

  return (
    <div className="space-y-8">
      {canUpload && (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-primary bg-primary/10" : "border-foreground/40"
        }`}
      >
        <ImagePlus className="mx-auto size-7 text-primary" />
        <p className="mt-3 text-lg font-bold">
          {busy ? `Uploading ${busy.done + 1} of ${busy.total}…` : "Drop photos from the night"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Only the people who were here can see them.
        </p>

        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => input.current?.click()}
          className="mt-4 inline-flex h-10 items-center border-2 border-foreground bg-primary px-5 font-bold uppercase text-primary-foreground shadow-stamp-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
        >
          Choose photos
        </button>

        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => void add(e.target.files)}
        />

        {error && <p className="mt-3 font-bold text-primary">{error}</p>}
      </div>
      )}

      {memories.length === 0 && hidden === 0 ? (
        <PaperCard className="p-10 text-center">
          <h3 className="text-2xl uppercase">Nothing here yet.</h3>
          <p className="mt-2 text-muted-foreground">
            Photos from the night land here afterwards — just for the people who were there.
          </p>
        </PaperCard>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {memories.map((photo, i) => (
            <figure
              key={photo.id}
              className={`group relative ${TILTS[i % TILTS.length]} border-2 border-foreground bg-paper p-3 shadow-stamp transition-transform duration-200 hover:rotate-0`}
            >
              <Image
                src={photo.url}
                alt={photo.caption ?? "Party photo"}
                width={800}
                height={600}
                className="aspect-[4/3] w-full object-cover"
              />

              {photo.canPublish && (
                <button
                  type="button"
                  onClick={() => void publish(photo.id, !photo.isPublic)}
                  aria-label={photo.isPublic ? "Make this photo private" : "Show this photo publicly"}
                  title={
                    photo.isPublic
                      ? "Public — anyone can see this on your history"
                      : "Private — only the people who were here"
                  }
                  className={`absolute left-1 top-1 flex size-8 items-center justify-center border-2 border-foreground transition-opacity ${
                    photo.isPublic
                      ? "bg-accent text-accent-foreground"
                      : "bg-background opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  }`}
                >
                  {photo.isPublic ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </button>
              )}

              {photo.canDelete && (
                <button
                  type="button"
                  onClick={() => void remove(photo.id)}
                  aria-label="Delete photo"
                  className="absolute right-1 top-1 flex size-8 items-center justify-center border-2 border-foreground bg-background opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <Trash2 className="size-4" />
                </button>
              )}

              <figcaption className="mt-3">
                <p className="font-bold">{photo.caption}</p>
                <p className="meta-label mt-1 text-muted-foreground">
                  {photo.takenAt
                    ? new Date(photo.takenAt).toLocaleTimeString("en-IN", {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : ""}{" "}
                  · {photo.uploader}
                </p>
              </figcaption>
            </figure>
          ))}

        </div>
      )}
    </div>
  );
}
