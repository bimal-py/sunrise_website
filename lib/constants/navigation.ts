import { routes } from "@/lib/routes";

/**
 * Primary navigation, in the style of the owner's portfolio. `href` is where
 * the item goes on the home page: a section anchor ("/#films"), scrolled to
 * smoothly, with the nav highlighting the section in view. `route` is where it
 * goes from any other page: the section's own page. Items without a home
 * section (Blog) use the same URL for both.
 *
 * The floating desktop pill, the mobile dock (+ its "More" menu) and the footer
 * all start from this list. `icon` is a lucide name, resolved in
 * shared/components/navigation/floating-nav.tsx. Order = the order of the
 * home page's sections.
 */
export const navItems = [
  { id: "home",     label: "Home",     icon: "House",        href: "/#home",     route: routes.home() },
  { id: "films",    label: "Films",    icon: "Clapperboard", href: "/#films",    route: routes.films() },
  { id: "services", label: "Services", icon: "Camera",       href: "/#services", route: routes.services() },
  { id: "prints",   label: "Prints",   icon: "BookImage",    href: "/#prints",   route: routes.prints() },
  { id: "about",    label: "About",    icon: "Sunrise",      href: "/#about",    route: routes.about() },
  { id: "blog",     label: "Blog",     icon: "BookOpen",     href: routes.blog(), route: routes.blog() },
  { id: "contact",  label: "Contact",  icon: "Phone",        href: "/#contact",  route: routes.contact() },
] as const;

export type NavItem = (typeof navItems)[number];

/** Ids of the home page's sections (the scroll-spy watches these). */
export const homeSectionIds = navItems.filter((item) => item.href.startsWith("/#")).map((item) => item.id);

/**
 * Items in the compact mobile dock. The rest (About, Blog) move into the
 * dock's "More" menu so the dock fits a 360px screen.
 */
export const mobileDockIds: readonly NavItem["id"][] = ["home", "films", "services", "prints", "contact"];
