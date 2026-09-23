"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import { BIO_PROMPTS, profileStrength } from "@baithak/types";
import { ProfileStrengthCard } from "@/components/profile-strength";
import { AvatarPicker } from "@/components/avatar-picker";
import { Button, Pill, PaperCard, SectionTitle } from "@/components/ui";
import type { Me } from "@/lib/api";

const VIBES = [
  "Chill", "Social", "Loud", "Adventurous", "Introvert-friendly", "Music lover",
  "Foodie", "Night owl", "Spontaneous", "Bollywood", "Games", "Travel",
  "Movies", "Football", "Art", "Tech",
];

const GENDERS = [
  { value: "WOMAN", label: "Woman" },
  { value: "MAN", label: "Man" },
  { value: "NON_BINARY", label: "Non-binary" },
  { value: "PREFER_NOT_TO_SAY", label: "Rather not say" },
];

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="meta-label text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

const inputClass =
  "rounded-sm border-2 border-foreground bg-background p-3 outline-none focus:shadow-stamp-sm";

export function ProfileEditor({ me }: { me: Me }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: me.name ?? "",
    age: me.age?.toString() ?? "",
    city: me.city ?? "",
    occupation: me.occupation ?? "",
    bio: me.bio ?? "",
    gender: me.gender ?? "",
    socialUrl: me.socialUrl ?? "",
    vibeTags: me.vibeTags ?? [],
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [prompt] = useState(() => BIO_PROMPTS[Math.floor(Math.random() * BIO_PROMPTS.length)]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus("idle");
  };

  const toggleVibe = (v: string) =>
    set("vibeTags", form.vibeTags.includes(v)
      ? form.vibeTags.filter((x) => x !== v)
      : [...form.vibeTags, v]);

  // Recomputed from the same shared function the API uses, so the meter moves
  // as you type rather than only after a save.
  const strength = profileStrength({
    age: Number(form.age) || null,
    city: form.city,
    occupation: form.occupation,
    bio: form.bio,
    socialUrl: form.socialUrl,
    vibeTags: form.vibeTags,
  });

  async function save() {
    setStatus("saving");
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, age: Number(form.age) || undefined }),
    });
    setStatus("saved");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-10 md:px-8">
      <div className="flex flex-wrap items-end gap-6">
        <AvatarPicker name={form.name || me.name} image={me.image} />
        <div>
          <p className="meta-label text-primary">Your profile</p>
          <h1 className="mt-2 text-5xl uppercase">{form.name || me.name}</h1>
          <p className="meta-label text-muted-foreground">{me.email}</p>
        </div>
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <section>
            <SectionTitle kicker="Built by showing up" title="Your history" />
            <div className="grid grid-cols-3 border-2 border-foreground bg-card shadow-stamp">
              {[
                [me.trustScore ? `★ ${me.trustScore.toFixed(1)}` : "—", "Trust"],
                [String(me._count.attendances), "Attended"],
                [String(me._count.hostedPlans), "Hosted"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="border-r-2 border-foreground p-4 text-center last:border-r-0"
                >
                  <strong className="font-display text-3xl">{value}</strong>
                  <p className="meta-label mt-1">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Earned, not edited — trust comes from plans you actually turn up to.
            </p>
          </section>

          <PaperCard className="space-y-5 p-5">
            <SectionTitle kicker="Anyone in your plans can see this" title="About you" />

            <Field label="Name">
              <input value={form.name} maxLength={60} onChange={(e) => set("name", e.target.value)} className={inputClass} />
            </Field>

            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Age">
                <input
                  type="number"
                  min={18}
                  max={40}
                  value={form.age}
                  onChange={(e) => set("age", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="City">
                <input value={form.city} maxLength={60} onChange={(e) => set("city", e.target.value)} className={inputClass} />
              </Field>
              <Field label="What you do">
                <input
                  value={form.occupation}
                  maxLength={60}
                  onChange={(e) => set("occupation", e.target.value)}
                  placeholder="Designer, chef…"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field
              label="One social account"
              hint="LinkedIn carries the most weight with hosts; Instagram or X also work."
            >
              <input
                value={form.socialUrl}
                maxLength={120}
                onChange={(e) => set("socialUrl", e.target.value)}
                placeholder="linkedin.com/in/yourname"
                inputMode="url"
                className={inputClass}
              />
            </Field>

            <Field label={prompt} hint="Hosts read this when deciding — a line or two is plenty.">
              <textarea
                rows={3}
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
                className={inputClass}
              />
            </Field>

            <div>
              <p className="meta-label text-muted-foreground">Your vibe</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {VIBES.map((v) => (
                  <button key={v} type="button" onClick={() => toggleVibe(v)}>
                    <Pill tone={form.vibeTags.includes(v) ? "purple" : "plain"}>{v}</Pill>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="meta-label text-muted-foreground">Gender (optional)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {GENDERS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => set("gender", form.gender === g.value ? "" : g.value)}
                  >
                    <Pill tone={form.gender === g.value ? "purple" : "plain"}>{g.label}</Pill>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Only ever counted into a plan&apos;s overall mix, never shown next to your name.
              </p>
            </div>

            <div className="flex items-center gap-4 border-t-2 border-foreground pt-5">
              <Button onClick={save} disabled={status === "saving"}>
                {status === "saving" ? "Saving…" : "Save profile"}
              </Button>
              {status === "saved" && (
                <span className="meta-label flex items-center gap-1.5 text-accent">
                  <Check className="size-4" /> Saved
                </span>
              )}
            </div>
          </PaperCard>
        </div>

        <ProfileStrengthCard strength={strength} className="md:sticky md:top-24 md:self-start" />
      </div>
    </div>
  );
}
