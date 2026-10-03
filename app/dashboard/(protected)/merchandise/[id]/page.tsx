import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { ProductForm } from "@/features/merchandise/presentation/dashboard/components/product-form";
import { getDashboardProduct, listDashboardCategories, UUID } from "@/features/merchandise/presentation/dashboard/server/catalogue-admin";

export const metadata: Metadata = { title: "Edit product" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [product, categories] = await Promise.all([getDashboardProduct(supabase, id), listDashboardCategories(supabase)]);
  if (!product) notFound();
  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Merchandise"
        title={`Edit: ${product.name}`}
        description={
          product.published
            ? "Update its details, photos, price and stock. The shop shows the changes as soon as you save."
            : "A draft: it's not in the shop until Published is ticked."
        }
      />
      <ProductForm product={product} categories={categories} defaultSortOrder={product.sort_order} />
    </div>
  );
}
