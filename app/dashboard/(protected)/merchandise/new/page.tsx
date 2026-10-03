import type { Metadata } from "next";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { ProductForm } from "@/features/merchandise/presentation/dashboard/components/product-form";
import { listDashboardCategories, nextSortOrder } from "@/features/merchandise/presentation/dashboard/server/catalogue-admin";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const { supabase } = await requireAdmin();
  const [categories, sortOrder] = await Promise.all([listDashboardCategories(supabase), nextSortOrder(supabase, "products")]);
  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Merchandise"
        title="Create a new product"
        description="Add its details, photos and price. It goes in the shop only when Published is ticked, so you can save a draft first."
      />
      <ProductForm product={null} categories={categories} defaultSortOrder={sortOrder} />
    </div>
  );
}
