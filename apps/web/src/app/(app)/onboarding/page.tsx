import { OnboardingFlow } from "./onboarding-flow";

// Server component so ?next= is read during render — a client-side
// useSearchParams here would need a Suspense boundary to prerender.
export default async function Page({ searchParams }: PageProps<"/onboarding">) {
  const { next } = await searchParams;
  return <OnboardingFlow next={typeof next === "string" ? next : undefined} />;
}
