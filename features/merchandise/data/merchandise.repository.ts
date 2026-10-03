import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { TAG } from "@/lib/cache/tags";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { readClient } from "@/lib/supabase/read-client";
import type { ProductCategoryRow, ProductRow } from "@/lib/supabase/types";
import type { Product, ProductCategory } from "@/features/merchandise/domain/entities";
import type { MerchandiseRepository } from "@/features/merchandise/domain/repositories";

export function rowToCategory(row: ProductCategoryRow): ProductCategory {
  return { id: row.id, slug: row.slug, name: row.name, nameNe: row.name_ne, description: row.description, image: row.image };
}

export function rowToProduct(row: ProductRow, categories: Map<string, ProductCategory>): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameNe: row.name_ne,
    category: row.category_id ? (categories.get(row.category_id) ?? null) : null,
    summary: row.summary,
    description: row.description,
    highlights: row.highlights,
    images: row.images,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price === null ? null : Number(row.compare_at_price),
    currency: row.currency,
    sku: row.sku,
    stockStatus: row.stock_status,
    options: row.options,
    variants: row.variants.map((v) => ({ ...v, price: v.price === null ? null : Number(v.price), compareAtPrice: v.compareAtPrice === null ? null : Number(v.compareAtPrice) })),
    specifications: row.specifications,
    deliveryInfo: row.delivery_info,
    warrantyInfo: row.warranty_info,
    minOrderQuantity: row.min_order_quantity,
    maxOrderQuantity: row.max_order_quantity,
    featured: row.featured,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    ogImage: row.og_image,
    updatedAt: row.updated_at,
  };
}

type Catalogue = { products: Product[]; categories: ProductCategory[] };

// Every published product and category in one entry, tagged "products", no timer: product
// pages are rebuilt only when the dashboard saves merchandise. Slug lookups read this entry,
// so a bot guessing addresses can't create a cache entry per guess.
const loadCatalogue = unstable_cache(
  async (): Promise<Catalogue> => {
    const db = readClient();
    const [categories, products] = await Promise.all([
      db.from("product_categories").select("*").eq("published", true).order("sort_order").order("created_at"),
      db.from("products").select("*").eq("published", true).order("sort_order").order("created_at", { ascending: false }),
    ]);
    if (categories.error) throw new Error(`product_categories: ${categories.error.message}`);
    if (products.error) throw new Error(`products: ${products.error.message}`);
    const byId = new Map(categories.data.map((row) => [row.id, rowToCategory(row)]));
    return { categories: [...byId.values()], products: products.data.map((row) => rowToProduct(row, byId)) };
  },
  ["merchandise"],
  { tags: [TAG.products] },
);

const catalogue = cache(async (): Promise<Catalogue> => (isSupabaseConfigured ? loadCatalogue() : { products: [], categories: [] }));

export const merchandiseRepository: MerchandiseRepository = {
  async listProducts({ category, limit } = {}) {
    const products = (await catalogue()).products.filter((p) => !category || p.category?.slug === category);
    return limit ? products.slice(0, limit) : products;
  },

  async getProduct(slug) {
    if (!/^[a-z0-9-]+$/.test(slug)) return null;
    return (await catalogue()).products.find((p) => p.slug === slug) ?? null;
  },

  async listRelated(product, limit) {
    const others = (await catalogue()).products.filter((p) => p.id !== product.id);
    const same = others.filter((p) => product.category && p.category?.id === product.category.id);
    return [...same, ...others.filter((p) => !same.includes(p))].slice(0, limit);
  },

  async listCategories() {
    const { products, categories } = await catalogue();
    return categories
      .map((category) => ({ ...category, count: products.filter((p) => p.category?.id === category.id).length }))
      .filter((category) => category.count > 0);
  },
};
