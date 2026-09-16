"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, LockKeyhole } from "lucide-react";
import Image from "next/image";
import { createPlan } from "@/lib/api";
import { COVER_PRESETS } from "@/lib/plan-art";
import { Button, Pill } from "@/components/ui";

const CATEGORIES = [
  { value: "HOUSE_PARTY", label: "House Party" },
  { value: "DRINKS", label: "Drinks" },
  { value: "DINNER", label: "Dinner" },
  { value: "GAME_NIGHT", label: "Game Night" },
  { value: "MOVIE", label: "Screening" },
  { value: "SPORTS", label: "Sports" },
  { value: "TRIP", label: "Trip" },
  { value: "OTHER", label: "Other" },
];

const CAPACITIES = [8, 12, 16];
const VIBES = ["Music", "Drinks", "Dancing", "Chill", "Food", "Games", "Bollywood", "Outdoors"];

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="paper-card p-5">
      <h2 className="mb-5 text-xl uppercase">{title}</h2>
      {children}
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-sm border-2 border-foreground px-4 py-2 font-bold transition-transform duration-150 active:translate-x-0.5 active:translate-y-0.5 ${
        active ? "bg-primary text-primary-foreground shadow-stamp-sm" : "bg-background hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

export default function MakeAPlanPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("HOUSE_PARTY");
  const [startsAt, setStartsAt] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [exactAddress, setExactAddress] = useState("");
  const [capacity, setCapacity] = useState(12);
  const [vibeTags, setVibeTags] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState(COVER_PRESETS[0].url);
  const [ageMin, setAgeMin] = useState(23);
  const [ageMax, setAgeMax] = useState(30);
  const [targetWomen, setTargetWomen] = useState(6);
  const [targetMen, setTargetMen] = useState(6);
  const [connectionPreference, setConnectionPreference] = useState("OPEN");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  const toggleVibe = (v: string) =>
    setVibeTags((tags) => (tags.includes(v) ? tags.filter((t) => t !== v) : [...tags, v]));

  const canSubmit = title.trim() && neighborhood.trim() && startsAt && status !== "saving";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    try {
      const plan = await createPlan({
        title: title.trim(),
        category,
        startsAt: new Date(startsAt).toISOString(),
        neighborhood: neighborhood.trim(),
        exactAddress: exactAddress.trim() || undefined,
        capacity,
        vibeTags,
        imageUrl,
        crowd: { ageMin, ageMax, targetWomen, targetMen, connectionPreference, preferredVibes: vibeTags },
      });
      router.push(`/plans/${plan.id}`);
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl px-5 pb-24 pt-10 md:px-8">
      <p className="meta-label text-primary">Host mode</p>
      <h1 className="mt-3 text-5xl uppercase md:text-7xl">Make a plan</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Put the idea out there. Keep the address private.
      </p>

      <div className="mt-9 grid gap-6 md:grid-cols-2">
        <Field title="What are you calling it?">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Saturday House Party"
            className="w-full rounded-sm border-2 border-foreground bg-background p-3 outline-none focus:shadow-stamp-sm"
          />
        </Field>

        <Field title="What are you planning?">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Chip key={c.value} active={category === c.value} onClick={() => setCategory(c.value)}>
                {c.label}
              </Chip>
            ))}
          </div>
        </Field>

        <Field title="When?">
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full rounded-sm border-2 border-foreground bg-background p-3 outline-none focus:shadow-stamp-sm"
          />
        </Field>

        <Field title="How many people?">
          <div className="flex flex-wrap items-center gap-2">
            {CAPACITIES.map((c) => (
              <Chip key={c} active={capacity === c} onClick={() => setCapacity(c)}>
                {c}
              </Chip>
            ))}
            <input
              type="number"
              min={2}
              max={100}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              aria-label="Custom capacity"
              className="w-24 rounded-sm border-2 border-foreground bg-background p-2 outline-none focus:shadow-stamp-sm"
            />
          </div>
        </Field>

        <Field title="Where?">
          <input
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            placeholder="HSR Layout, Bangalore"
            className="w-full rounded-sm border-2 border-foreground bg-background p-3 outline-none focus:shadow-stamp-sm"
          />
          <p className="mt-3 text-xs text-muted-foreground">
            <LockKeyhole className="mr-1 inline size-3" />
            This is the only location shown publicly.
          </p>
          <input
            value={exactAddress}
            onChange={(e) => setExactAddress(e.target.value)}
            placeholder="Exact address (optional)"
            className="mt-3 w-full rounded-sm border-2 border-foreground bg-background p-3 outline-none focus:shadow-stamp-sm"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Only shared with guests you accept.
          </p>
        </Field>

        <Field title="Pick a cover">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {COVER_PRESETS.map((cover) => (
              <button
                key={cover.url}
                type="button"
                onClick={() => setImageUrl(cover.url)}
                aria-pressed={imageUrl === cover.url}
                className={`overflow-hidden rounded-sm border-2 border-foreground transition-transform duration-150 hover:-translate-y-0.5 ${
                  imageUrl === cover.url ? "shadow-stamp" : "opacity-60"
                }`}
              >
                <Image
                  src={cover.url}
                  alt={cover.label}
                  width={400}
                  height={300}
                  className="aspect-[4/3] w-full object-cover"
                />
                <span className="meta-label block border-t-2 border-foreground bg-background py-1">
                  {cover.label}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Uploading your own photo lands once we wire up file storage.
          </p>
        </Field>

        <Field title="What's the vibe?">
          <div className="flex flex-wrap gap-2">
            {VIBES.map((v) => (
              <button key={v} type="button" onClick={() => toggleVibe(v)}>
                <Pill tone={vibeTags.includes(v) ? "purple" : "plain"}>{v}</Pill>
              </button>
            ))}
          </div>
        </Field>
      </div>

      <section className="paper-card mt-6 p-5">
        <h2 className="text-xl uppercase">Build your crowd</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tell us who you&apos;d love to have around. These are targets that help you keep an
          eye on the balance — they never filter anyone out or auto-decline a request.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div>
            <p className="meta-label text-muted-foreground">Age range</p>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={18}
                max={99}
                value={ageMin}
                onChange={(e) => setAgeMin(Number(e.target.value))}
                aria-label="Minimum age"
                className="w-20 rounded-sm border-2 border-foreground bg-background p-2 outline-none focus:shadow-stamp-sm"
              />
              <span className="font-bold">to</span>
              <input
                type="number"
                min={18}
                max={99}
                value={ageMax}
                onChange={(e) => setAgeMax(Number(e.target.value))}
                aria-label="Maximum age"
                className="w-20 rounded-sm border-2 border-foreground bg-background p-2 outline-none focus:shadow-stamp-sm"
              />
            </div>
          </div>

          <div>
            <p className="meta-label text-muted-foreground">Group mix target</p>
            <div className="mt-2 flex items-center gap-3">
              <label className="flex items-center gap-2 font-bold">
                <span aria-hidden>&#9792;</span>
                <input
                  type="number"
                  min={0}
                  max={capacity}
                  value={targetWomen}
                  onChange={(e) => setTargetWomen(Number(e.target.value))}
                  aria-label="Target women"
                  className="w-20 rounded-sm border-2 border-foreground bg-background p-2 outline-none focus:shadow-stamp-sm"
                />
              </label>
              <label className="flex items-center gap-2 font-bold">
                <span aria-hidden>&#9794;</span>
                <input
                  type="number"
                  min={0}
                  max={capacity}
                  value={targetMen}
                  onChange={(e) => setTargetMen(Number(e.target.value))}
                  aria-label="Target men"
                  className="w-20 rounded-sm border-2 border-foreground bg-background p-2 outline-none focus:shadow-stamp-sm"
                />
              </label>
            </div>
          </div>

          <div>
            <p className="meta-label text-muted-foreground">Who can request</p>
            <select
              value={connectionPreference}
              onChange={(e) => setConnectionPreference(e.target.value)}
              aria-label="Connection preference"
              className="mt-2 w-full rounded-sm border-2 border-foreground bg-background p-2 font-bold outline-none"
            >
              <option value="OPEN">Open to new people</option>
              <option value="FRIENDS_OF_FRIENDS">Friends of friends</option>
              <option value="COMMUNITY">Community members</option>
              <option value="INVITE_ONLY">Invite only</option>
            </select>
          </div>
        </div>
      </section>

      {status === "error" && (
        <p className="meta-label mt-6 text-primary">
          Couldn&apos;t create that plan — check the details and try again.
        </p>
      )}

      <div className="mt-9 flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={!canSubmit}>
          {status === "saving" ? "Creating…" : "Put it out there"}
          <ChevronRight />
        </Button>
        <p className="text-sm text-muted-foreground">
          You can build your crowd once it&apos;s live.
        </p>
      </div>
    </form>
  );
}
