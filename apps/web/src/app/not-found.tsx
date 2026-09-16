import { Button, Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-20 items-center border-b-2 border-foreground px-5 md:px-10">
        <Logo />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-5 text-center">
        <p className="meta-label text-primary">404 · Nothing here</p>
        <h1 className="text-5xl uppercase leading-[.86] md:text-7xl">
          This plan
          <br />
          <span className="text-primary">doesn&apos;t exist.</span>
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          It may have been cancelled, or the link is off. Either way, there&apos;s always
          something else on.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button href="/discover">Find a plan</Button>
          <Button href="/plans/new" variant="outline">
            Make a plan
          </Button>
        </div>
      </main>
    </div>
  );
}
