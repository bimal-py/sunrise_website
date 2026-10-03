import type { Product, ProductCategory } from "./entities";

/** Merchandise data boundary (Supabase; nothing without it). */
export interface MerchandiseRepository {
  /** Published products, in display order (featured first within the order). */
  listProducts(options?: { category?: string; limit?: number }): Promise<Product[]>;
  getProduct(slug: string): Promise<Product | null>;
  /** Other products in the same category, then any, excluding this one. */
  listRelated(product: Product, limit: number): Promise<Product[]>;
  /** Published categories that have at least one published product, in display order. */
  listCategories(): Promise<(ProductCategory & { count: number })[]>;
}
