/**
 * Every internal URL is built here, so the URL scheme lives in one file:
 *
 *   /services, /services/<slug>       what the studio shoots (weddings, pasni, portraits…)
 *   /prints, /prints/<slug>           albums, frames, canvas and photo prints
 *   /films, /films/<slug>             films from the studio's YouTube channel
 *   /blogs, /blogs/<slug>             guides
 *   /about, /contact, /privacy
 */
export const routes = {
  home: () => "/",
  services: () => "/services",
  service: (slug: string) => `/services/${slug}`,
  prints: () => "/prints",
  print: (slug: string) => `/prints/${slug}`,
  films: () => "/films",
  film: (slug: string) => `/films/${slug}`,
  filmCategory: (category: string) => `/films?category=${category}`,
  blog: () => "/blogs",
  post: (slug: string) => `/blogs/${slug}`,
  blogTopic: (tag: string) => `/blogs?tag=${tag}`,
  about: () => "/about",
  contact: () => "/contact",
  privacy: () => "/privacy",
};
