"use client";

import { SpriteButton } from "@/shared/components/ui/sprite-button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
      <h1 className="text-[40px]">Something went wrong</h1>
      <p className="mt-3 text-muted">Please try again. If it keeps happening, let us know.</p>
      <SpriteButton type="button" onClick={reset} className="mt-8">
        Try again
      </SpriteButton>
    </main>
  );
}
