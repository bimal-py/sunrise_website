/** Frontmatter keys accepted at the top of `content/blog/*.mdx`. */
export type BlogFrontmatter = {
  title: string;
  summary: string;
  publishedAt: string;
  updatedAt?: string;
  author?: string;
  tags?: string[];
  language?: "en" | "ne";
  /**
   * Cover photo: `cover` ("/images/blog/<name>.webp"), `coverAlt`, and the credit
   * shown under it: `coverCredit` + `coverCreditUrl` (e.g. the film it's from).
   * `coverLicense`/`coverLicenseUrl` only for photos that aren't the studio's own.
   */
  cover?: string;
  coverAlt?: string;
  coverCredit?: string;
  coverCreditUrl?: string;
  coverLicense?: string;
  coverLicenseUrl?: string;
  featured?: boolean;
  /** Drafts are skipped everywhere (list, detail, sitemap). */
  draft?: boolean;
};
