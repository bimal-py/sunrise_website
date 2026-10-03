import type { Metadata } from "next";
import { routes } from "@/lib/routes";
import { formatDateTime } from "@/lib/utils/date";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { deleteSocialLink, moveSocialLink, saveSettings } from "@/features/dashboard/presentation/actions/settings";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { DashboardForm } from "@/features/dashboard/presentation/components/ui/dashboard-form";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { DashboardResourceActions } from "@/features/dashboard/presentation/components/ui/dashboard-resource-actions";
import {
  DashboardCard,
  DashboardCheckbox,
  DashboardField,
  DashboardInput,
  DashboardNotice,
  DashboardTextarea,
  FieldGroup,
  fieldLabelClass,
  StatusBadge,
} from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { ImageUrlField } from "@/features/dashboard/presentation/components/ui/image-url-field";
import { ReorderButtons } from "@/features/dashboard/presentation/components/ui/reorder-buttons";
import { SEO_TITLE_MAX } from "@/features/site/domain/page-content";
import { displayUrl, platformLabel } from "@/features/site/domain/social-link";
import { RefreshSiteButton } from "@/features/site/presentation/dashboard/refresh-site-button";
import { SocialLinkIcon } from "@/shared/components/brand/social-icons";
import { SpriteButton } from "@/shared/components/ui/sprite-button";

export const metadata: Metadata = { title: "Settings" };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
const twoCols = "grid gap-5 md:grid-cols-2";
const threeCols = "grid gap-5 md:grid-cols-3";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string | string[]; deleted?: string | string[] }> }) {
  const params = await searchParams;
  const saved = first(params.saved).slice(0, 80);
  const deleted = first(params.deleted).slice(0, 80);
  const { supabase } = await requireAdmin();
  const [{ data: s, error }, { data: links, error: linksError }] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).single(),
    supabase.from("social_links").select("*").order("sort_order").order("created_at"),
  ]);
  if (error || !s) throw new Error(`Couldn't load settings: ${error?.message ?? "the settings row is missing"}`);
  if (linksError) throw new Error(`Couldn't load the social links: ${linksError.message}`);
  const newLinkHref = routes.dashboardNew("settings/social-links");

  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Settings"
        title="Studio, contact and search settings."
        description="Keep the studio's details in one place: they appear across the whole site and in what search engines read. Social profiles are managed as separate links below."
        primaryAction={{ href: newLinkHref, label: "Add social link" }}
      />

      {saved ? <DashboardNotice>Saved “{saved}”.</DashboardNotice> : null}
      {deleted ? <DashboardNotice>Deleted “{deleted}”.</DashboardNotice> : null}

      <DashboardForm action={saveSettings} submitLabel="Save settings">
        <h2 className="font-display text-2xl font-semibold text-strong">Site settings</h2>

        <FieldGroup title="Studio" description="The name and the words that introduce the studio.">
          <div className={twoCols}>
            <DashboardField label="Studio name" required help="Shown in the footer, the browser tab and search results." example="Sunrise Photo Studio">
              <DashboardInput name="name" defaultValue={s.name} placeholder="Studio name" maxLength={120} />
            </DashboardField>
            <DashboardField label="Name in Nepali" help="Shown under the name in the footer." example="सनराइज फोटो स्टुडियो">
              <DashboardInput name="name_ne" lang="ne" defaultValue={s.name_ne} placeholder="Name in Nepali" maxLength={160} />
            </DashboardField>
          </div>
          <DashboardField label="Other name" help="Another name people search for, such as the domain's longer form. Search engines read it." example="Sunrise Digital Photo Studio">
            <DashboardInput name="alternate_name" defaultValue={s.alternate_name} placeholder="Other name (optional)" maxLength={160} />
          </DashboardField>
          <div className={twoCols}>
            <DashboardField label="Headline" required help="The home page's big title and the splash line." example="Photos and films for the days you'll want to relive">
              <DashboardInput name="tagline" defaultValue={s.tagline} placeholder="Headline" maxLength={160} />
            </DashboardField>
            <DashboardField label="Headline in Nepali" help="The line under the headline on the home page.">
              <DashboardInput name="tagline_ne" lang="ne" defaultValue={s.tagline_ne} placeholder="Headline in Nepali" maxLength={160} />
            </DashboardField>
          </div>
          <DashboardField label="Description" help="One or two sentences about the studio. Search results and link previews use it when a page has none of its own.">
            <DashboardTextarea name="description" rows={3} defaultValue={s.description} placeholder="Description" maxLength={400} />
          </DashboardField>
          <DashboardField label="Footer text" help="The short paragraph under the logo in the footer of every page.">
            <DashboardTextarea name="footer_blurb" rows={2} defaultValue={s.footer_blurb} placeholder="Footer text" maxLength={400} />
          </DashboardField>
          <DashboardField label="About the studio (home page)" help="Shown in the home page's “Behind the lens” until the founder's details are filled in below.">
            <DashboardTextarea name="studio_blurb" rows={3} defaultValue={s.studio_blurb} placeholder="About the studio" maxLength={600} />
          </DashboardField>
        </FieldGroup>

        <FieldGroup title="Contact & address" description="How people reach and find the studio. Leave a field empty to hide it.">
          <div className={threeCols}>
            <DashboardField label="Phone (as shown)" help="Written the way people should read it; the call link is made from it." example="+977 984-6160675">
              <DashboardInput name="phone" type="tel" defaultValue={s.phone} placeholder="Phone" maxLength={40} />
            </DashboardField>
            <DashboardField label="WhatsApp number" help="With the country code, digits only. Every WhatsApp button on the site opens a chat with it." example="9779866060450">
              <DashboardInput name="whatsapp" inputMode="numeric" defaultValue={s.whatsapp} placeholder="WhatsApp number" maxLength={30} />
            </DashboardField>
            <DashboardField label="Email" help="Shown on the contact page and in the footer." example="studio@example.com">
              <DashboardInput name="email" type="email" defaultValue={s.email} placeholder="Email" maxLength={200} autoCapitalize="none" spellCheck={false} />
            </DashboardField>
          </div>
          <div className={threeCols}>
            <DashboardField label="Street / ward" example="Arjunchaupari Rural Municipality-5">
              <DashboardInput name="street" defaultValue={s.street} placeholder="Street / ward" maxLength={160} />
            </DashboardField>
            <DashboardField label="Town or village" example="Arjunchaupari">
              <DashboardInput name="locality" defaultValue={s.locality} placeholder="Town or village" maxLength={120} />
            </DashboardField>
            <DashboardField label="District" example="Syangja">
              <DashboardInput name="district" defaultValue={s.district} placeholder="District" maxLength={120} />
            </DashboardField>
          </div>
          <div className={threeCols}>
            <DashboardField label="Province" example="Gandaki Province">
              <DashboardInput name="region" defaultValue={s.region} placeholder="Province" maxLength={120} />
            </DashboardField>
            <DashboardField label="Country" example="Nepal">
              <DashboardInput name="country" defaultValue={s.country} placeholder="Country" maxLength={80} />
            </DashboardField>
            <div className="grid grid-cols-2 gap-3">
              <DashboardField label="Country code" help="Two letters, for search engines." example="NP">
                <DashboardInput name="country_code" defaultValue={s.country_code} placeholder="NP" maxLength={2} autoCapitalize="characters" />
              </DashboardField>
              <DashboardField label="Postal code">
                <DashboardInput name="postal_code" defaultValue={s.postal_code} placeholder="Optional" maxLength={20} />
              </DashboardField>
            </div>
          </div>
          <div className={twoCols}>
            <DashboardField label="Address in one line" help="The footer and the contact page show it." example="Arjunchaupari-5, Syangja, Nepal">
              <DashboardInput name="address_line" defaultValue={s.address_line} placeholder="Address in one line" maxLength={200} />
            </DashboardField>
            <DashboardField label="Address in Nepali" example="अर्जुनचौपारी-५, स्याङ्जा">
              <DashboardInput name="address_line_ne" lang="ne" defaultValue={s.address_line_ne} placeholder="Address in Nepali" maxLength={200} />
            </DashboardField>
          </div>
          <DashboardField label="Google Maps link" help="Opens the studio's location in Google Maps (the footer, the contact page and the home page's slate link to it)." example="https://maps.app.goo.gl/…">
            <DashboardInput name="maps_url" inputMode="url" defaultValue={s.maps_url} placeholder="https://…" maxLength={500} autoCapitalize="none" spellCheck={false} />
          </DashboardField>
          <div className={threeCols}>
            <DashboardField label="Latitude" help="Optional, for local search. In Google Maps, right-click the studio: the first of the two numbers shown is the latitude.">
              <DashboardInput name="latitude" inputMode="decimal" defaultValue={s.latitude ?? ""} placeholder="Optional" maxLength={20} />
            </DashboardField>
            <DashboardField label="Longitude" help="The second of the two numbers Google Maps shows. Give both, or neither.">
              <DashboardInput name="longitude" inputMode="decimal" defaultValue={s.longitude ?? ""} placeholder="Optional" maxLength={20} />
            </DashboardField>
            <DashboardField label="Areas you work in" help="Comma separated. Helps local search." example="Arjunchaupari, Walling, Syangja">
              <DashboardInput name="area_served" defaultValue={s.area_served.join(", ")} placeholder="Areas, comma separated" maxLength={600} />
            </DashboardField>
          </div>
        </FieldGroup>

        <FieldGroup
          title="Behind the lens (founder)"
          description="Shown in the home page's “Behind the lens”. Leave the name empty and the studio stands in. Their real words only."
        >
          <div className={twoCols}>
            <DashboardField label="Name" help="As they'd like it shown. Leave empty to show the studio instead.">
              <DashboardInput name="founder_name" defaultValue={s.founder_name} placeholder="Founder's name" maxLength={120} />
            </DashboardField>
            <DashboardField label="Name in Nepali">
              <DashboardInput name="founder_name_ne" lang="ne" defaultValue={s.founder_name_ne} placeholder="Name in Nepali" maxLength={120} />
            </DashboardField>
          </div>
          <DashboardField label="Role" help="Needed when a name is given." example="Founder & lead photographer">
            <DashboardInput name="founder_role" defaultValue={s.founder_role} placeholder="Role" maxLength={120} />
          </DashboardField>
          <DashboardField label="In their own words" help="A sentence or two from them, never written for them.">
            <DashboardTextarea name="founder_quote" rows={2} defaultValue={s.founder_quote} placeholder="Their own words (optional)" maxLength={400} />
          </DashboardField>
          <DashboardField label="Short bio" help="Facts only: since when, what they shoot.">
            <DashboardTextarea name="founder_bio" rows={3} defaultValue={s.founder_bio} placeholder="Short bio (optional)" maxLength={600} />
          </DashboardField>
          <ImageUrlField
            name="founder_photo"
            label="Portrait"
            collection="founder"
            defaultValue={s.founder_photo}
            help="A real portrait of them, upright (portrait orientation)."
            hint="At least 800px wide. Pick one from the library, upload one, or paste a link."
          />
        </FieldGroup>

        <FieldGroup
          title="YouTube"
          description={
            <>
              The channel the films come from: Films → Sync from YouTube imports its videos, and the films page links to it.{" "}
              {s.youtube_synced_at ? `Last synced ${formatDateTime(s.youtube_synced_at)}.` : "Not synced yet."}
            </>
          }
        >
          <DashboardField
            label="Channel link"
            help="The channel's address on YouTube (its @handle link works). When it changes, the channel is looked up again on save."
            example="https://www.youtube.com/@sunrisephotostudio3135"
            hint={s.youtube_channel_id ? `Channel id: ${s.youtube_channel_id} (found from the link).` : "The channel's id is found from the link when you save."}
          >
            <DashboardInput
              name="youtube_url"
              inputMode="url"
              defaultValue={s.youtube_url}
              placeholder="https://www.youtube.com/@yourchannel"
              maxLength={500}
              autoCapitalize="none"
              spellCheck={false}
            />
          </DashboardField>
          <DashboardCheckbox
            name="films_auto_publish"
            label="Show new films on the site right away"
            defaultChecked={s.films_auto_publish}
            hint="When off, films the sync finds wait, hidden, until you check them in Films."
          />
        </FieldGroup>

        <FieldGroup title="Search & social" description="How the site appears in Google, Bing and link previews.">
          <DashboardField
            label="Home page title"
            help="The title Google shows for the home page, and the default for pages without their own."
            example="Sunrise Photo Studio: wedding photos, films and prints in Syangja"
            hint="Best at 50–60 characters. Blank uses the studio's name and district."
          >
            <DashboardInput name="default_title" defaultValue={s.default_title} placeholder="Home page title (optional)" maxLength={SEO_TITLE_MAX} />
          </DashboardField>
          <div className={twoCols}>
            <DashboardField
              label="Google Search Console code"
              help="From search.google.com/search-console, “HTML tag” method: paste the whole tag or just its content value. (Verifying by a file works too: upload it in Root Files.)"
              example='<meta name="google-site-verification" content="…" />'
            >
              <DashboardInput name="google_site_verification" defaultValue={s.google_site_verification} placeholder="Verification code (optional)" maxLength={400} spellCheck={false} />
            </DashboardField>
            <DashboardField label="Bing Webmaster code" help="The msvalidate.01 tag from Bing Webmaster Tools, or just its content value." example='<meta name="msvalidate.01" content="…" />'>
              <DashboardInput name="bing_site_verification" defaultValue={s.bing_site_verification} placeholder="Verification code (optional)" maxLength={400} spellCheck={false} />
            </DashboardField>
          </div>
          <div className={twoCols}>
            <DashboardField
              label="Microsoft Clarity id"
              help="Optional visitor analytics. Empty = none. If you turn it on, update the privacy page to say so."
              example="abcd1234ef"
            >
              <DashboardInput name="clarity_id" defaultValue={s.clarity_id} placeholder="Clarity id (optional)" maxLength={40} spellCheck={false} />
            </DashboardField>
          </div>
          <ImageUrlField
            name="og_image"
            label="Default share image"
            collection="site"
            defaultValue={s.og_image}
            help="Shown when a page without its own photo is shared on WhatsApp or Facebook. Empty uses the studio's logo card."
            hint="Landscape works best: a 1200 × 630 share version is made from it."
          />
        </FieldGroup>
      </DashboardForm>

      <DashboardCard className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-2xl">
            <h2 className="font-display text-2xl font-semibold text-strong">Social links</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Shown as icons in the footer, the home page and the contact page, in this order, and given to search engines. The WhatsApp icon comes from the
              WhatsApp number above.
            </p>
          </div>
          <SpriteButton href={newLinkHref}>Create new</SpriteButton>
        </div>
        {links.length === 0 ? (
          <p className="mt-5 rounded-card border border-line bg-raised px-4 py-6 text-center text-sm text-muted">
            No social links yet. Add the studio&apos;s Facebook page, YouTube channel or any other profile.
          </p>
        ) : (
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {links.map((link, index) => (
              <li key={link.id} className="min-w-0 rounded-card border border-line bg-raised p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex min-w-0 items-center gap-2.5 font-medium text-strong">
                    <span className="text-primary">
                      <SocialLinkIcon platform={link.platform} iconSvg={link.icon_svg} className="h-5 w-5" />
                    </span>
                    <span className="truncate">{link.label}</span>
                  </p>
                  <StatusBadge status={link.is_visible ? "Visible" : "Hidden"} />
                </div>
                <p className="mt-1 text-sm text-muted">{platformLabel(link.platform)}</p>
                <p className="mt-2 break-all text-sm text-muted">{displayUrl(link.url)}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <DashboardResourceActions
                    editHref={routes.dashboardItem("settings/social-links", link.id)}
                    previewHref={link.url}
                    deleteAction={deleteSocialLink}
                    deleteFields={{ id: link.id }}
                    deleteConfirm={{ title: `Delete “${link.label}”?`, message: "It disappears from the site straight away. This can't be undone." }}
                  />
                  <ReorderButtons action={moveSocialLink} id={link.id} isFirst={index === 0} isLast={index === links.length - 1} name={link.label} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>

      <DashboardCard className="p-5 sm:p-6">
        <h2 className="font-display text-2xl font-semibold text-strong">More settings</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="flex min-w-0 flex-col items-start rounded-card border border-line bg-raised p-5">
            <h3 className={`${fieldLabelClass} font-normal`}>Redirects</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-muted">Send old or mistyped addresses to the right page, so shared links keep working.</p>
            <DashboardButton href={routes.dashboardSection("settings/redirects")} className="mt-4">
              Open redirects
            </DashboardButton>
          </div>
          <div className="flex min-w-0 flex-col items-start rounded-card border border-line bg-raised p-5">
            <h3 className={`${fieldLabelClass} font-normal`}>Account</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-muted">Change your password and see who can sign in to the dashboard.</p>
            <DashboardButton href={routes.dashboardSection("settings/account")} className="mt-4">
              Open account
            </DashboardButton>
          </div>
          <div className="flex min-w-0 flex-col items-start rounded-card border border-line bg-raised p-5">
            <h3 className={`${fieldLabelClass} font-normal`}>Refresh the public site</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-muted">
              Saving in the dashboard updates the site by itself. Use this only after changing content straight in Supabase.
            </p>
            <div className="mt-4">
              <RefreshSiteButton />
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
