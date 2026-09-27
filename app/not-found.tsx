import { routes } from "@/lib/routes";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">404</p>
      <h1 className="mt-3 text-[44px]">Page not found</h1>
      <p lang="ne" className="mt-1 text-muted">
        पृष्ठ भेटिएन
      </p>
      <p className="mt-4 max-w-md text-muted">The link may be old, or the page may have moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <SpriteButton href={routes.services()}>Our services</SpriteButton>
        <SpriteButton href={routes.home()} variant="secondary">
          Go home
        </SpriteButton>
      </div>
    </main>
  );
}
