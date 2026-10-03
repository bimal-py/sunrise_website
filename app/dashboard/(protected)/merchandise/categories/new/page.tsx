import type { Metadata } from "next";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { merchandisePaths } from "@/features/merchandise/presentation/dashboard/catalogue-options";
import { CategoryForm } from "@/features/merchandise/presentation/dashboard/components/category-form";
import { nextSortOrder } from "@/features/merchandise/presentation/dashboard/server/catalogue-admin";

export const metadata: Metadata = { title: "New category" };

export default async function NewProductCategoryPage() {
  const { supabase } = await requireAdmin();
  const sortOrder = await nextSortOrder(supabase, "product_categories");
  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Merchandise"
        title="Create a new category"
        description="A group of products for the shop's filter, like “Photo frames” or “Albums”."
        actions={<DashboardButton href={merchandisePaths.categories()}>← Categories</DashboardButton>}
      />
      <CategoryForm category={null} defaultSortOrder={sortOrder} />
    </div>
  );
}
