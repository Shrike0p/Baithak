import { getBlocks, getMe } from "@/lib/api";
import { SettingsPanel } from "@/components/settings-panel";

export default async function SettingsPage() {
  const [me, blocked] = await Promise.all([getMe(), getBlocks().catch(() => [])]);

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-10 md:px-8">
      <p className="meta-label text-primary">You&apos;re in control</p>
      <h1 className="mt-3 text-5xl uppercase md:text-6xl">Settings &amp; safety</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Who sees you, who doesn&apos;t, and how to get someone away from you.
      </p>

      <SettingsPanel me={me} blocked={blocked} />
    </div>
  );
}
