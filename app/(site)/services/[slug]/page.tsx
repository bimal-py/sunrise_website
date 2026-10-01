import type { Metadata } from "next";
import { serviceRepository } from "@/features/services/data/services.repository";
import { ServiceDetailPageView } from "@/features/services/presentation/views/service-detail-page-view";
import { routes } from "@/lib/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";

type PageProps = { params: Promise<{ slug: string }> };

// No dynamicParams = false: a slug created in the dashboard after the last deploy renders on its first
// visit (then stays static until a save refreshes it); unknown slugs 404 or follow a saved redirect.

export async function generateStaticParams() {
  const services = await serviceRepository.list();
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await serviceRepository.get(slug);
  if (!service) return { title: "Service not found" };
  return buildPageMetadata({
    title: service.seoTitle || `${service.name} in Syangja`,
    description: service.seoDescription || service.summary,
    path: routes.service(service.slug),
    image: service.ogImage?.ogImage,
  });
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params;
  return <ServiceDetailPageView slug={slug} />;
}
