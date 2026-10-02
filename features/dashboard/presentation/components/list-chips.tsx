import Link from "next/link";

/** Filter chips for a dashboard list (server rendered links). */
export function ListChips({ items, label }: { items: { href: string; label: string; active: boolean }[]; label: string }) {
  return (
    <nav aria-label={label} className="mb-5 flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`inline-flex h-9 items-center rounded-control border px-3 text-sm transition-colors duration-150 ${item.active ? "border-primary bg-primary-soft text-strong" : "border-line-strong text-foreground hover:border-primary"}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** A search box for a dashboard list: a plain GET form, so it works without JavaScript. */
export function ListSearch({ action, q, placeholder, hidden = {} }: { action: string; q?: string; placeholder: string; hidden?: Record<string, string> }) {
  return (
    <form action={action} method="get" role="search" className="mb-5 w-full max-w-sm">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-control border border-line-strong bg-raised px-3 text-sm text-strong placeholder:text-muted/70 focus:border-primary focus:outline-none"
      />
    </form>
  );
}
