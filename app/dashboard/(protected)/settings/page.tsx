import type { Metadata } from "next";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { saveSettings } from "@/features/dashboard/presentation/actions/settings";
import { ActionForm } from "@/features/dashboard/presentation/components/action-form";
import { ImageField } from "@/features/dashboard/presentation/components/image-field";
import { SettingsTabs } from "@/features/dashboard/presentation/components/settings-tabs";
import { RefreshSite } from "@/features/dashboard/presentation/components/refresh-site";
import { Field, inputClass, PageHeader, Panel, textareaClass } from "@/features/dashboard/presentation/components/ui";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const { data: s, error } = await supabase.from("site_settings").select("*").eq("id", 1).single();
  if (error || !s) throw new Error(`Couldn't load settings: ${error?.message ?? "missing row"}`);

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Studio settings"
        description="Everything here appears across the whole site: the nav, the footer, the contact page and what search engines read. Each section saves on its own."
      />
      <SettingsTabs />
      <div className="flex flex-col gap-6">
        <Panel title="Studio" description="The name and the words that introduce the studio.">
          <ActionForm action={saveSettings}>
            <input type="hidden" name="section" value="studio" />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Studio name" htmlFor="name">
                <input id="name" name="name" required defaultValue={s.name} className={inputClass} />
              </Field>
              <Field label="Name in Nepali" htmlFor="name_ne">
                <input id="name_ne" name="name_ne" lang="ne" defaultValue={s.name_ne} className={inputClass} />
              </Field>
              <Field label="Other name" htmlFor="alternate_name" hint="Another name people search for, e.g. the domain's longer form.">
                <input id="alternate_name" name="alternate_name" defaultValue={s.alternate_name} className={inputClass} />
              </Field>
              <div />
              <Field label="Headline" htmlFor="tagline" hint="The home page's big title and the splash line.">
                <input id="tagline" name="tagline" required defaultValue={s.tagline} className={inputClass} />
              </Field>
              <Field label="Headline in Nepali" htmlFor="tagline_ne" hint="The line under the headline.">
                <input id="tagline_ne" name="tagline_ne" lang="ne" defaultValue={s.tagline_ne} className={inputClass} />
              </Field>
              <Field label="Description" htmlFor="description" hint="One or two sentences. Search results and link previews use it when a page has none of its own." className="sm:col-span-2">
                <textarea id="description" name="description" rows={3} defaultValue={s.description} className={textareaClass} />
              </Field>
              <Field label="Footer text" htmlFor="footer_blurb" className="sm:col-span-2">
                <textarea id="footer_blurb" name="footer_blurb" rows={2} defaultValue={s.footer_blurb} className={textareaClass} />
              </Field>
              <Field label="About the studio (home page)" htmlFor="studio_blurb" hint="Shown in “Behind the lens” until the founder's details are filled in below." className="sm:col-span-2">
                <textarea id="studio_blurb" name="studio_blurb" rows={3} defaultValue={s.studio_blurb} className={textareaClass} />
              </Field>
            </div>
          </ActionForm>
        </Panel>

        <Panel title="Contact and address" description="How people reach and find the studio. Leave a field empty to hide it.">
          <ActionForm action={saveSettings}>
            <input type="hidden" name="section" value="contact" />
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Phone (as shown)" htmlFor="phone" hint="e.g. +977 984-6160675">
                <input id="phone" name="phone" defaultValue={s.phone} className={inputClass} />
              </Field>
              <Field label="WhatsApp number" htmlFor="whatsapp" hint="With country code, digits only: 9779866060450">
                <input id="whatsapp" name="whatsapp" inputMode="numeric" defaultValue={s.whatsapp} className={inputClass} />
              </Field>
              <Field label="Email" htmlFor="email">
                <input id="email" name="email" type="email" defaultValue={s.email} className={inputClass} />
              </Field>
              <Field label="Street / ward" htmlFor="street">
                <input id="street" name="street" defaultValue={s.street} className={inputClass} />
              </Field>
              <Field label="Town or village" htmlFor="locality">
                <input id="locality" name="locality" defaultValue={s.locality} className={inputClass} />
              </Field>
              <Field label="District" htmlFor="district">
                <input id="district" name="district" defaultValue={s.district} className={inputClass} />
              </Field>
              <Field label="Province" htmlFor="region">
                <input id="region" name="region" defaultValue={s.region} className={inputClass} />
              </Field>
              <Field label="Country" htmlFor="country">
                <input id="country" name="country" defaultValue={s.country} className={inputClass} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Country code" htmlFor="country_code">
                  <input id="country_code" name="country_code" maxLength={2} defaultValue={s.country_code} className={inputClass} />
                </Field>
                <Field label="Postal code" htmlFor="postal_code">
                  <input id="postal_code" name="postal_code" defaultValue={s.postal_code} className={inputClass} />
                </Field>
              </div>
              <Field label="Address in one line" htmlFor="address_line" hint="Footer and contact page, e.g. Arjunchaupari-5, Syangja, Nepal" className="sm:col-span-2">
                <input id="address_line" name="address_line" defaultValue={s.address_line} className={inputClass} />
              </Field>
              <Field label="Address in Nepali" htmlFor="address_line_ne">
                <input id="address_line_ne" name="address_line_ne" lang="ne" defaultValue={s.address_line_ne} className={inputClass} />
              </Field>
              <Field label="Google Maps link" htmlFor="maps_url" className="sm:col-span-3">
                <input id="maps_url" name="maps_url" type="url" defaultValue={s.maps_url} className={inputClass} />
              </Field>
              <Field label="Latitude" htmlFor="latitude" hint="Optional: from Google Maps (right-click the studio).">
                <input id="latitude" name="latitude" inputMode="decimal" defaultValue={s.latitude ?? ""} className={inputClass} />
              </Field>
              <Field label="Longitude" htmlFor="longitude">
                <input id="longitude" name="longitude" inputMode="decimal" defaultValue={s.longitude ?? ""} className={inputClass} />
              </Field>
              <Field label="Areas you work in" htmlFor="area_served" hint="Comma separated. Helps local search.">
                <input id="area_served" name="area_served" defaultValue={s.area_served.join(", ")} className={inputClass} />
              </Field>
            </div>
          </ActionForm>
        </Panel>

        <Panel title="Social profiles and YouTube" description="Facebook and YouTube show as icons; every profile is listed for search engines.">
          <ActionForm action={saveSettings}>
            <input type="hidden" name="section" value="social" />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Facebook page" htmlFor="facebook_url">
                <input id="facebook_url" name="facebook_url" type="url" defaultValue={s.facebook_url} className={inputClass} />
              </Field>
              <Field label="YouTube channel" htmlFor="youtube_url">
                <input id="youtube_url" name="youtube_url" type="url" defaultValue={s.youtube_url} className={inputClass} />
              </Field>
              <Field label="Instagram" htmlFor="instagram_url">
                <input id="instagram_url" name="instagram_url" type="url" defaultValue={s.instagram_url} className={inputClass} />
              </Field>
              <Field label="TikTok" htmlFor="tiktok_url">
                <input id="tiktok_url" name="tiktok_url" type="url" defaultValue={s.tiktok_url} className={inputClass} />
              </Field>
              <Field label="YouTube channel id" htmlFor="youtube_channel_id" hint="Starts with UC. Films → Sync from YouTube uses it." className="sm:col-span-2">
                <input id="youtube_channel_id" name="youtube_channel_id" defaultValue={s.youtube_channel_id} className={inputClass} />
              </Field>
            </div>
          </ActionForm>
        </Panel>

        <Panel title="Founder" description="Shown in the home page's “Behind the lens”. Leave the name empty and the studio stands in. Their real words only.">
          <ActionForm action={saveSettings}>
            <input type="hidden" name="section" value="founder" />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name" htmlFor="founder_name" hint="As they'd like it shown.">
                <input id="founder_name" name="founder_name" defaultValue={s.founder_name} className={inputClass} />
              </Field>
              <Field label="Name in Nepali" htmlFor="founder_name_ne">
                <input id="founder_name_ne" name="founder_name_ne" lang="ne" defaultValue={s.founder_name_ne} className={inputClass} />
              </Field>
              <Field label="Role" htmlFor="founder_role" hint="e.g. Founder & lead photographer">
                <input id="founder_role" name="founder_role" defaultValue={s.founder_role} className={inputClass} />
              </Field>
              <div />
              <Field label="In their own words" htmlFor="founder_quote" hint="A sentence or two, never written for them." className="sm:col-span-2">
                <textarea id="founder_quote" name="founder_quote" rows={2} defaultValue={s.founder_quote} className={textareaClass} />
              </Field>
              <Field label="Short bio" htmlFor="founder_bio" hint="Facts only: since when, what they shoot." className="sm:col-span-2">
                <textarea id="founder_bio" name="founder_bio" rows={3} defaultValue={s.founder_bio} className={textareaClass} />
              </Field>
              <div className="sm:col-span-2">
                <ImageField name="founder_photo" label="Portrait" collection="founder" defaultValue={s.founder_photo} hint="A real portrait, upright (portrait orientation), at least 800px wide." />
              </div>
            </div>
          </ActionForm>
        </Panel>

        <Panel title="Search and sharing" description="How the site appears in Google, Bing and link previews.">
          <ActionForm action={saveSettings}>
            <input type="hidden" name="section" value="seo" />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Home page title" htmlFor="default_title" hint="About 50–60 characters, e.g. “Sunrise Photo Studio: wedding photos, films and prints in Syangja”." className="sm:col-span-2">
                <input id="default_title" name="default_title" maxLength={120} defaultValue={s.default_title} className={inputClass} />
              </Field>
              <Field label="Google Search Console code" htmlFor="google_site_verification" hint="Paste the HTML tag or just its content value.">
                <input id="google_site_verification" name="google_site_verification" defaultValue={s.google_site_verification} className={inputClass} />
              </Field>
              <Field label="Bing Webmaster code" htmlFor="bing_site_verification" hint="The msvalidate.01 tag or its content value.">
                <input id="bing_site_verification" name="bing_site_verification" defaultValue={s.bing_site_verification} className={inputClass} />
              </Field>
              <Field label="Microsoft Clarity id" htmlFor="clarity_id" hint="Optional analytics; empty = none. Update the privacy page if you turn it on.">
                <input id="clarity_id" name="clarity_id" defaultValue={s.clarity_id} className={inputClass} />
              </Field>
              <div />
              <div className="sm:col-span-2">
                <ImageField name="og_image" label="Default share image" collection="site" defaultValue={s.og_image} hint="Shown when a page without its own photo is shared on WhatsApp or Facebook. Landscape works best." />
              </div>
            </div>
          </ActionForm>
        </Panel>

        <Panel title="Refresh the public site" description="Saving anything in the dashboard updates the site by itself. Use this only after changing content directly in Supabase.">
          <RefreshSite />
        </Panel>
      </div>
    </>
  );
}
