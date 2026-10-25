import { googleEnabled } from "@baithak/auth";
import { getPlans } from "@/lib/api";
import { SignInForm } from "./sign-in-form";

// Server component so ?next= is read during render — a client-side
// useSearchParams here would need a Suspense boundary to prerender.
export default async function Page({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;

  // Real activity, not a made-up number. If the API is down the line simply
  // doesn't appear — better than a confident zero.
  const plans = await getPlans().catch(() => []);
  const spots = plans.reduce((n, p) => n + Math.max(0, p.capacity - p.confirmedCount), 0);
  const stat =
    plans.length > 0
      ? `${plans.length} plans open now · ${spots} spots left`
      : undefined;

  return (
    <SignInForm
      next={typeof next === "string" ? next : undefined}
      google={googleEnabled}
      stat={stat}
    />
  );
}
