-- Merchandise: products the studio sells, in categories, with variants and discounts.
-- No checkout: an order is sent as a message (public.messages, kind = 'order') and the
-- studio contacts the client. Additive only: the live site keeps working unchanged.
begin;

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  slug public.slug not null unique,
  name text not null check (length(name) between 1 and 120),
  name_ne text not null default '',
  description text not null default '',
  image jsonb,
  published boolean not null default true,
  sort_order integer not null default 0,
  seo_title text not null default '',
  seo_description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug public.slug not null unique,
  name text not null check (length(name) between 1 and 200),
  name_ne text not null default '',
  category_id uuid references public.product_categories (id) on delete set null,
  -- One sentence for cards and search results; the description is Markdown.
  summary text not null default '',
  description text not null default '',
  highlights text[] not null default '{}',
  -- [{ src, width, height, blurDataURL, ogImage, alt }], the first is the main photo.
  images jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array'),
  price numeric(12, 2) not null default 0 check (price >= 0),
  -- The usual price; when it's higher than `price` the product shows as discounted.
  compare_at_price numeric(12, 2) check (compare_at_price is null or compare_at_price >= 0),
  currency text not null default 'NPR' check (currency ~ '^[A-Z]{3}$'),
  sku text not null default '',
  stock_status text not null default 'in_stock'
    check (stock_status in ('in_stock', 'low_stock', 'out_of_stock', 'made_to_order', 'preorder')),
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  -- Option groups [{ name: "Size", values: ["8×10 in", "12×18 in"] }] and the variants made
  -- from them [{ id, options: { Size: "8×10 in" }, price, compareAtPrice, sku, stockStatus, imageIndex }].
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  variants jsonb not null default '[]'::jsonb check (jsonb_typeof(variants) = 'array'),
  -- [{ label, value }] shown as a table.
  specifications jsonb not null default '[]'::jsonb check (jsonb_typeof(specifications) = 'array'),
  delivery_info text not null default '',
  warranty_info text not null default '',
  min_order_quantity integer not null default 1 check (min_order_quantity >= 1),
  max_order_quantity integer check (max_order_quantity is null or max_order_quantity >= 1),
  featured boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 0,
  seo_title text not null default '',
  seo_description text not null default '',
  og_image jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_order_quantity is null or max_order_quantity >= min_order_quantity)
);

create index products_category_idx on public.products (category_id);
create index products_order_idx on public.products (sort_order, created_at desc);
create index product_categories_order_idx on public.product_categories (sort_order, created_at);

create trigger set_updated_at before update on public.product_categories for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.products for each row execute function public.set_updated_at();

alter table public.product_categories enable row level security;
alter table public.products enable row level security;

create policy "Public can read published categories" on public.product_categories for select to anon, authenticated using (published);
create policy "Public can read published products" on public.products for select to anon, authenticated using (published);
create policy "Admins manage categories" on public.product_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.product_categories, public.products from anon, authenticated;
grant select on public.product_categories, public.products to anon;
grant select, insert, update, delete on public.product_categories, public.products to authenticated;
grant all on public.product_categories, public.products to service_role;

-- Orders arrive as messages. New columns have defaults, so the existing form is unaffected.
alter table public.messages
  add column kind text not null default 'enquiry' check (kind in ('enquiry', 'order')),
  add column product_id uuid references public.products (id) on delete set null,
  add column product_name text not null default '' check (length(product_name) <= 200),
  add column product_slug text not null default '' check (length(product_slug) <= 120),
  add column variant_label text not null default '' check (length(variant_label) <= 200),
  add column quantity integer check (quantity is null or quantity between 1 and 1000),
  add column unit_price numeric(12, 2) check (unit_price is null or unit_price >= 0),
  add column currency text not null default 'NPR' check (currency ~ '^[A-Z]{3}$'),
  add column address text not null default '' check (length(address) <= 300);

create index messages_kind_idx on public.messages (kind, created_at desc);

commit;
