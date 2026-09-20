import Image from "next/image";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui";

/**
 * The door.
 *
 * The form used to float alone in an empty cream field, which told a stranger
 * nothing about what they were signing into. Baithak's whole pitch is that
 * there are real people doing real things tonight — so the left half shows the
 * party and the right half is the way in.
 *
 * The photos are the product's own party images, stacked as a wall rather than
 * a neat grid: this is a flyer pinned to a door, not a hero banner.
 */
export function AuthLayout({
  eyebrow,
  headline,
  blurb,
  stat,
  children,
}: {
  eyebrow: string;
  headline: ReactNode;
  blurb: string;
  /** Real numbers, when we have them. Nothing invented. */
  stat?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[1.05fr_.95fr]">
      {/* The party. Hidden on small screens, where the form is all anyone
          wants and vertical space is precious. */}
      <aside className="relative hidden overflow-hidden border-r-2 border-foreground bg-secondary lg:block">
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-3 p-6 opacity-95">
          {[
            { src: "/assets/house-party.jpg", tilt: "-rotate-2" },
            { src: "/assets/rooftop-drinks.jpg", tilt: "rotate-1" },
            { src: "/assets/game-night.jpg", tilt: "rotate-2" },
            { src: "/assets/dinner-party.jpg", tilt: "-rotate-1" },
          ].map((photo) => (
            <div
              key={photo.src}
              className={`${photo.tilt} overflow-hidden border-2 border-foreground bg-paper p-2 shadow-stamp`}
            >
              <Image
                src={photo.src}
                alt=""
                width={700}
                height={700}
                className="size-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* Weighted toward the bottom-left, where the words are — a flat wash
            over everything turned the photos to mud and lost the party. */}
        <div className="absolute inset-0 bg-gradient-to-tr from-foreground/90 via-foreground/55 to-foreground/20" />

        <div className="relative flex h-full flex-col justify-between p-10 text-background xl:p-14">
          <Logo href="/" />

          <div className="max-w-xl">
            <p className="meta-label text-background/80">{eyebrow}</p>
            <h1 className="mt-4 text-[clamp(2.75rem,4.5vw,4.5rem)] uppercase leading-[.88]">
              {headline}
            </h1>
            <p className="mt-5 max-w-md text-lg">{blurb}</p>
          </div>

          {stat ? (
            <p className="meta-label inline-block max-w-full border-2 border-background bg-primary px-4 py-2 text-primary-foreground shadow-[4px_4px_0_var(--color-background)]">
              {stat}
            </p>
          ) : (
            <span />
          )}
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:min-h-0">
        <header className="flex h-20 items-center border-b-2 border-foreground px-5 lg:hidden">
          <Logo href="/" />
        </header>

        {/* min-w-0 on both: a flex item defaults to min-width:auto and won't
            shrink below its content, so on a narrow phone the form pushed the
            page wider than the screen instead of fitting it. */}
        <div className="flex min-w-0 flex-1 items-center justify-center px-5 py-10 lg:px-12">
          <div className="w-full min-w-0 max-w-md">
            {/* The photo wall is desktop-only, so small screens still get the
                promise and the proof — just in one line instead of four. */}
            <div className="mb-8 lg:hidden">
              <p className="meta-label text-primary">{eyebrow}</p>
              <h1 className="mt-2 text-4xl uppercase leading-[.9]">{headline}</h1>
              <p className="mt-3 text-muted-foreground">{blurb}</p>
              {stat && (
                <p className="meta-label mt-4 inline-block max-w-full border-2 border-foreground bg-primary px-3 py-1.5 text-primary-foreground">
                  {stat}
                </p>
              )}
            </div>

            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
