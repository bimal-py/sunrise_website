import type { Metadata } from "next";
import { printRepository } from "@/features/prints/data/prints.repository";
import { PrintDetailPageView } from "@/features/prints/presentation/views/print-detail-page-view";
import { routes } from "@/lib/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  const prints = await printRepository.list();
  return prints.map((print) => ({ slug: print.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const print = await printRepository.get(slug);
  if (!print) return { title: "Product not found" };
  return buildPageMetadata({ title: `${print.name} in Syangja`, description: print.summary, path: routes.print(print.slug) });
}

export default async function PrintPage({ params }: PageProps) {
  const { slug } = await params;
  return <PrintDetailPageView slug={slug} />;
}
