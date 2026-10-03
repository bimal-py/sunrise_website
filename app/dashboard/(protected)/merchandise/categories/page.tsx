import type { Metadata } from "next";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { listDashboardCategories, productCountsByCategory } from "@/features/merchandise/presentation/dashboard/server/catalogue-admin";
import { CategoriesListView } from "@/features/merchandise/presentation/dashboard/views/categories-list-view";

export const metadata: Metadata = { title: "Product categories" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function DashboardProductCategoriesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const [categories, counts] = await Promise.all([listDashboardCategories(supabase), productCountsByCategory(supabase)]);
  return <CategoriesListView categories={categories} counts={counts} params={params} />;
}
