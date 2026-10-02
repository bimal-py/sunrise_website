/**
 * Database types, written by hand to match supabase/migrations/0001_initial_schema.sql
 * (keep them in step with every migration). jsonb columns are typed with their real shapes.
 */
import type { ImageAsset } from "@/shared/domain/image";
import type { ContentSection, Faq, OfferingIcon } from "@/shared/domain/offering";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type FilmCategoryValue = "weddings" | "ceremonies" | "culture";
export type PageKey = "home" | "services" | "prints" | "films" | "blogs" | "about" | "contact" | "privacy";
export type PrintMockup = "album" | "frame" | "canvas" | "loose-prints" | "book";
export type MessageStatus = "new" | "read" | "replied" | "archived";
export type ReviewSource = "Facebook" | "Google" | "YouTube" | "In person";

export type SiteSettingsRow = {
  id: number;
  name: string;
  alternate_name: string;
  name_ne: string;
  tagline: string;
  tagline_ne: string;
  description: string;
  footer_blurb: string;
  studio_blurb: string;
  phone: string;
  whatsapp: string;
  email: string;
  street: string;
  locality: string;
  district: string;
  region: string;
  country: string;
  country_code: string;
  postal_code: string;
  address_line: string;
  address_line_ne: string;
  maps_url: string;
  latitude: number | null;
  longitude: number | null;
  area_served: string[];
  facebook_url: string;
  youtube_url: string;
  instagram_url: string;
  tiktok_url: string;
  youtube_channel_id: string;
  founder_name: string;
  founder_name_ne: string;
  founder_role: string;
  founder_quote: string;
  founder_bio: string;
  founder_photo: ImageAsset | null;
  default_title: string;
  og_image: ImageAsset | null;
  google_site_verification: string;
  bing_site_verification: string;
  indexnow_key: string;
  clarity_id: string;
  updated_at: string;
};

export type PageRow = {
  key: PageKey;
  content: Record<string, Json>;
  body: string;
  seo_title: string;
  seo_description: string;
  og_image: ImageAsset | null;
  updated_at: string;
};

export type MediaRow = {
  id: string;
  collection: string;
  name: string;
  src: string;
  og_src: string;
  width: number;
  height: number;
  blur_data_url: string;
  alt: string;
  bytes: number;
  in_storage: boolean;
  created_at: string;
};

export type FilmRow = {
  youtube_id: string;
  slug: string;
  title: string;
  youtube_title: string;
  youtube_description: string;
  category: FilmCategoryValue;
  place: string;
  published_at: string;
  featured: boolean;
  hidden: boolean;
  curated: boolean;
  thumbnail: ImageAsset | null;
  seo_title: string;
  seo_description: string;
  created_at: string;
  updated_at: string;
};

type OfferingColumns = {
  id: string;
  slug: string;
  name: string;
  name_ne: string;
  icon: OfferingIcon;
  summary: string;
  intro: string[];
  sections: ContentSection[];
  faqs: Faq[];
  inquiry: string;
  service_type: string;
  featured: boolean;
  og_image: ImageAsset | null;
  published: boolean;
  sort_order: number;
  seo_title: string;
  seo_description: string;
  created_at: string;
  updated_at: string;
};

export type ServiceRow = OfferingColumns & {
  short_name: string;
  cover_film_id: string | null;
  film_category: FilmCategoryValue | null;
  related_print_ids: string[];
};

export type PrintRow = OfferingColumns & {
  highlight: string;
  options_heading: string;
  options: { label: string; detail: string }[];
  mockup: PrintMockup | null;
  preview_film_ids: string[];
};

export type PostRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  status: "draft" | "published";
  published_at: string | null;
  updated_on: string | null;
  author: string;
  tags: string[];
  language: "en" | "ne";
  featured: boolean;
  cover: ImageAsset | null;
  cover_alt: string;
  cover_credit: string;
  cover_credit_url: string;
  cover_license: string;
  cover_license_url: string;
  reading_minutes: number;
  headings: { id: string; text: string; depth: 2 | 3 }[];
  seo_title: string;
  seo_description: string;
  created_at: string;
  updated_at: string;
};

export type ReviewRow = {
  id: string;
  name: string;
  occasion: string;
  place: string;
  review_month: string | null;
  rating: number;
  body: string;
  source_label: ReviewSource | null;
  source_url: string;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type MessageRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  occasion: string;
  event_date: string;
  place: string;
  message: string;
  source_path: string;
  status: MessageStatus;
  ip_hash: string | null;
  user_agent: string;
  created_at: string;
  updated_at: string;
};

export type RootFileRow = {
  id: string;
  file_name: string;
  content_type: string;
  body: string;
  published: boolean;
  note: string;
  created_at: string;
  updated_at: string;
};

export type RedirectRow = {
  id: string;
  source: string;
  destination: string;
  permanent: boolean;
  note: string;
  created_at: string;
  updated_at: string;
};

export type AdminRow = { user_id: string; email: string; created_at: string };

export type Database = {
  public: {
    Tables: {
      admins: Table<AdminRow, "user_id" | "email">;
      site_settings: Table<SiteSettingsRow, "name">;
      pages: Table<PageRow, "key">;
      media: Table<MediaRow, "collection" | "name" | "src" | "width" | "height">;
      films: Table<FilmRow, "youtube_id" | "slug" | "title" | "category" | "published_at">;
      services: Table<ServiceRow, "slug" | "name">;
      prints: Table<PrintRow, "slug" | "name">;
      posts: Table<PostRow, "slug" | "title">;
      reviews: Table<ReviewRow, "name" | "body">;
      messages: Table<MessageRow, "name">;
      root_files: Table<RootFileRow, "file_name">;
      redirects: Table<RedirectRow, "source" | "destination">;
    };
    Views: { [_ in never]: never };
    Functions: { is_admin: { Args: Record<PropertyKey, never>; Returns: boolean } };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
