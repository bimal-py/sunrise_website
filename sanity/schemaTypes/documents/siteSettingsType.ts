import { defineField, defineType } from "sanity";

export const siteSettingsType = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  fields: [
    defineField({ name: "studioName", title: "Studio Name", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "tagline", title: "Tagline", type: "string" }),
    defineField({ name: "description", title: "Description", type: "text", rows: 4 }),
    defineField({ name: "phone", title: "Phone", type: "string" }),
    defineField({ name: "email", title: "Email", type: "string" }),
    defineField({ name: "whatsapp", title: "WhatsApp Number", type: "string" }),
    defineField({ name: "address", title: "Address", type: "string" }),
    defineField({ name: "logo", title: "Logo", type: "image", options: { hotspot: true } })
  ],
  preview: {
    select: {
      title: "studioName",
      subtitle: "tagline",
      media: "logo"
    }
  }
});
