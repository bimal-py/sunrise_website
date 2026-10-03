"use client";

import type { SocialLinkRow } from "@/lib/supabase/types";
import { saveSocialLink } from "@/features/dashboard/presentation/actions/settings";
import { DashboardForm } from "@/features/dashboard/presentation/components/ui/dashboard-form";
import { DashboardCheckbox, DashboardField, DashboardInput, DashboardSelect } from "@/features/dashboard/presentation/components/ui/dashboard-ui";
import { IconPickerField, SOCIAL_ICON_SUGGESTIONS } from "@/features/dashboard/presentation/components/ui/icon-picker-field";
import { SOCIAL_PLATFORMS } from "@/features/site/domain/social-link";

/**
 * The portfolio's social link editor: Platform and Label side by side, the URL, an optional
 * custom icon (Iconify search or a pasted SVG link), then Sort order and Visible. Saving goes
 * back to Settings, where the list shows the change. (A client component, so the icon
 * suggestions list is passed as a value.)
 */
export function SocialLinkForm({ link }: { link: SocialLinkRow | null }) {
  return (
    <DashboardForm action={saveSocialLink} submitLabel={link ? "Save social link" : "Create social link"}>
      {link ? <input type="hidden" name="id" value={link.id} /> : null}
      <div className="grid gap-5 md:grid-cols-2">
        <DashboardField
          label="Platform"
          required
          help="Picks the icon shown on the site. Choose Website or Other for anything without its own icon (then pick a custom icon below)."
          example="Instagram"
        >
          <DashboardSelect name="platform" defaultValue={link?.platform ?? "facebook"}>
            {SOCIAL_PLATFORMS.map((platform) => (
              <option key={platform.value} value={platform.value}>
                {platform.label}
              </option>
            ))}
          </DashboardSelect>
        </DashboardField>
        <DashboardField
          label="Label"
          required
          help="The link's name. Screen readers read it out, and the contact page shows it."
          example="Sunrise Photo Studio on Instagram"
        >
          <DashboardInput name="label" defaultValue={link?.label ?? ""} placeholder="Label" maxLength={80} autoComplete="off" />
        </DashboardField>
      </div>
      <DashboardField
        label="URL"
        required
        help="The profile's full address. Copy it from the browser's address bar while on the profile."
        example="https://www.instagram.com/yourstudio"
        hint="The WhatsApp button comes from the WhatsApp number in Settings; add a WhatsApp link here only for something else, like a channel."
      >
        <DashboardInput
          name="url"
          inputMode="url"
          defaultValue={link?.url ?? ""}
          placeholder="https://…"
          maxLength={500}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
      </DashboardField>
      <IconPickerField
        name="icon_source"
        label="Custom icon"
        defaultValue={link?.icon_source ?? ""}
        defaultSvg={link?.icon_svg ?? null}
        suggestions={SOCIAL_ICON_SUGGESTIONS}
        help="Optional. Leave it blank to use the platform's own icon (Facebook, YouTube, Instagram, TikTok, X, LinkedIn and WhatsApp have one). Search for an icon, or paste a link to an SVG."
        example="simple-icons:viber"
      />
      <div className="grid gap-5 md:grid-cols-2">
        <DashboardField label="Sort order" help="Lower numbers come first. The arrows on the Settings page change it too. Blank puts a new link last." example="10">
          <DashboardInput name="sort_order" inputMode="numeric" defaultValue={link?.sort_order ?? ""} placeholder="Sort order" autoComplete="off" />
        </DashboardField>
        <DashboardCheckbox
          name="is_visible"
          label="Visible"
          defaultChecked={link?.is_visible ?? true}
          hint="Untick to keep the link here without showing it on the site."
          className="md:self-end"
        />
      </div>
    </DashboardForm>
  );
}
