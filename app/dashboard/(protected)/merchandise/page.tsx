import type { Metadata } from "next";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { listDashboardCategories, listDashboardProducts } from "@/features/merchandise/presentation/dashboard/server/catalogue-admin";
import { ProductsListView } from "@/features/merchandise/presentation/dashboard/views/products-list-view";

export const metadata: Metadata = { title: "Merchandise" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function DashboardMerchandisePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const [products, categories] = await Promise.all([listDashboardProducts(supabase), listDashboardCategories(supabase)]);
  return <ProductsListView products={products} categories={categories} params={params} />;
}
