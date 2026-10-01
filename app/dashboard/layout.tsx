import type { Metadata } from "next";

// The dashboard is private: never indexed, never followed, no canonical.
export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Dashboard" },
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: null },
};

export default function DashboardRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div id="main-content" className="flex flex-1 flex-col">
      {children}
    </div>
  );
}
