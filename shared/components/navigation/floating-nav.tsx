"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import {
  BookImage,
  BookOpen,
  Camera,
  Clapperboard,
  Ellipsis,
  House,
  Phone,
  Sunrise,
  type LucideIcon,
} from "lucide-react";
import { siteConfig, whatsappUrl } from "@/lib/config/site";
import { mobileDockIds, navItems, type NavItem } from "@/lib/constants/navigation";
import { WhatsAppIcon } from "@/shared/components/brand/social-icons";
import { SpriteButton } from "@/shared/components/ui/sprite-button";
import { useActiveSection } from "@/shared/hooks/use-active-section";

const ICONS: Record<NavItem["icon"], LucideIcon> = { House, Camera, BookImage, Clapperboard, BookOpen, Sunrise, Phone };

const DOCK = navItems.filter((item) => mobileDockIds.includes(item.id));
const MORE = navItems.filter((item) => !mobileDockIds.includes(item.id));

const shadow = "shadow-[0_4px_6px_rgba(0,0,0,0.3),0_16px_40px_rgba(0,0,0,0.55)]";

/**
 * Primary navigation, in the style of the owner's portfolio:
 *  - desktop (lg+): a pill fixed at the top centre with every section and a
 *    gold WhatsApp button. On the home page it sits transparent over the hero
 *    and only becomes a floating solid pill once the page scrolls; on every
 *    other page it's solid from the first paint.
 *  - mobile: an icon dock fixed at the bottom centre (always solid), plus a
 *    "More" menu for the rest and the call/WhatsApp shortcuts.
 * On the home page items scroll to their section (and the URL shows it, without
 * adding history); elsewhere they go to the section's own page. Plain CSS, no
 * motion library, no blur.
 */
export function FloatingNav() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const activeId = useActiveSection();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Derived, so inner pages render the solid pill in the server HTML.
  const solid = !isHome || scrolled;

  // Close the "More" menu when navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolled(window.scrollY > 8); // a small tolerance: a trackpad nudge isn't a scroll
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const hrefOf = (item: NavItem) => (isHome ? item.href : item.route);

  const onNavClick = (event: MouseEvent<HTMLAnchorElement>, item: NavItem) => {
    setMenuOpen(false);
    const href = hrefOf(item);
    if (!isHome || !href.startsWith("/#")) return;
    event.preventDefault();
    document.getElementById(href.slice(2))?.scrollIntoView({ behavior: "smooth" });
    // Reflect the section in the URL (shareable) without a new history entry.
    window.history.replaceState(null, "", item.id === "home" ? "/" : href);
  };

  const moreActive = MORE.some((item) => item.id === activeId);

  return (
    <>
      {/* ── Desktop (lg+): pill at top centre, floating once scrolled ── */}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 hidden justify-center lg:flex">
        <nav
          aria-label="Main"
          className={`pointer-events-auto flex items-center gap-0.5 rounded-full border p-1.5 transition-[background-color,border-color,box-shadow] duration-300 ${
            solid ? `border-line-strong bg-nav ${shadow}` : "border-transparent bg-transparent"
          }`}
        >
          {navItems.map((item) => {
            const Icon = ICONS[item.icon];
            const active = activeId === item.id;
            return (
              <Link
                key={item.id}
                href={hrefOf(item)}
                onClick={(event) => onNavClick(event, item)}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors duration-150 xl:px-4 ${
                  active ? "border-line-strong bg-nav-active text-strong" : "border-transparent text-foreground/80 hover:text-primary"
                }`}
              >
                <Icon size={14} strokeWidth={active ? 2.2 : 1.8} className={`shrink-0 ${active ? "text-primary" : ""}`} aria-hidden />
                {item.label}
              </Link>
            );
          })}
          <SpriteButton href={whatsappUrl(`Hello ${siteConfig.name}, I'd like to ask about booking.`)} className="ml-1 h-10 rounded-full">
            <WhatsAppIcon className="h-4 w-4" />
            WhatsApp
          </SpriteButton>
        </nav>
      </div>

      {/* ── Mobile (< lg): icon dock + "More" menu at bottom centre ── */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center lg:hidden">
        {menuOpen && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="pointer-events-auto fixed inset-0 cursor-default bg-black/50"
          />
        )}

        <div id="more-menu" hidden={!menuOpen} className={`pointer-events-auto relative z-10 mb-3 w-60 rounded-panel border border-line-strong bg-nav p-1.5 ${shadow}`}>
          <ul>
            {MORE.map((item) => {
              const Icon = ICONS[item.icon];
              const active = activeId === item.id;
              return (
                <li key={item.id}>
                  <Link
                    href={hrefOf(item)}
                    onClick={(event) => onNavClick(event, item)}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-11 items-center gap-3 rounded-card px-3 text-sm font-medium ${
                      active ? "bg-nav-active text-primary" : "text-foreground hover:bg-raised"
                    }`}
                  >
                    <Icon size={16} strokeWidth={1.8} aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li className="mt-1 border-t border-line pt-1">
              <a href={siteConfig.contact.phoneHref} className="flex h-11 items-center gap-3 rounded-card px-3 text-sm font-medium text-foreground hover:bg-raised">
                <Phone size={16} strokeWidth={1.8} aria-hidden />
                Call {siteConfig.contact.phone}
              </a>
            </li>
            <li>
              <a
                href={whatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 items-center gap-3 rounded-card px-3 text-sm font-medium text-foreground hover:bg-raised"
              >
                <WhatsAppIcon className="h-4 w-4" />
                WhatsApp
              </a>
            </li>
          </ul>
        </div>

        <nav aria-label="Main" className={`pointer-events-auto relative z-10 flex items-center gap-0.5 rounded-full border border-line-strong bg-nav px-1.5 py-1.5 ${shadow}`}>
          {DOCK.map((item) => {
            const Icon = ICONS[item.icon];
            const active = activeId === item.id;
            return (
              <Link
                key={item.id}
                href={hrefOf(item)}
                onClick={(event) => onNavClick(event, item)}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={`flex size-11 items-center justify-center rounded-full transition-colors duration-150 ${
                  active ? "bg-nav-active text-primary" : "text-foreground/80"
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
              </Link>
            );
          })}
          <span aria-hidden className="mx-0.5 h-5 w-px bg-line-strong" />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close more menu" : "More: about, blog, call"}
            aria-expanded={menuOpen}
            aria-controls="more-menu"
            className={`flex size-11 items-center justify-center rounded-full transition-colors duration-150 ${
              moreActive || menuOpen ? "bg-nav-active text-primary" : "text-foreground/80"
            }`}
          >
            <Ellipsis size={19} strokeWidth={1.8} aria-hidden />
          </button>
        </nav>
      </div>
    </>
  );
}
