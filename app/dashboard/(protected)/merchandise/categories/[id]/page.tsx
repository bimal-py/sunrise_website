import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { merchandisePaths } from "@/features/merchandise/presentation/dashboard/catalogue-options";
import { CategoryForm } from "@/features/merchandise/presentation/dashboard/components/category-form";
import { getDashboardCategory, UUID } from "@/features/merchandise/presentation/dashboard/server/catalogue-admin";

export const metadata: Metadata = { title: "Edit category" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditProductCategoryPage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const category = await getDashboardCategory(supabase, id);
  if (!category) notFound();
  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Merchandise"
        title={`Edit: ${category.name}`}
        description="Update the category's name, photo and order in the shop's filter."
        actions={<DashboardButton href={merchandisePaths.categories()}>← Categories</DashboardButton>}
      />
      <CategoryForm category={category} defaultSortOrder={category.sort_order} />
    </div>
  );
}
