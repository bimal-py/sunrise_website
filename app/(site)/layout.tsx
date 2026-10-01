import { SiteFooter } from "@/features/site/presentation/components/site-footer";
import { SiteHeader } from "@/features/site/presentation/components/site-header";
import { SiteAnalytics } from "@/shared/components/analytics/site-analytics";

/** The public site's chrome: floating nav, footer and analytics (the dashboard has its own). */
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SiteHeader />
      <div id="main-content" className="flex flex-1 flex-col">
        {children}
      </div>
      <SiteFooter />
      <SiteAnalytics />
    </>
  );
}
