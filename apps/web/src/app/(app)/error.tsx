"use client";

import { Button } from "@/components/ui";

/**
 * Something failed that isn't "not found" — say so, rather than letting a
 * broken request masquerade as a missing page.
 */
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-20 text-center">
      <p className="meta-label text-primary">Something broke</p>
      <h1 className="mt-3 text-4xl uppercase md:text-6xl">That didn&apos;t load.</h1>
      <p className="mt-4 text-muted-foreground">
        It&apos;s on our side, not yours. Try again in a moment.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button href="/discover" variant="outline">
          Back to Discover
        </Button>
      </div>
    </div>
  );
}
