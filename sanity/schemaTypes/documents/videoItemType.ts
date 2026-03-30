import { defineField, defineType } from "sanity";

export const videoItemType = defineType({
  name: "videoItem",
  title: "Video Item",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string", validation: (rule) => rule.required() }),
    defineField({
      name: "provider",
      title: "Provider",
      type: "string",
      options: {
        list: [
          { title: "YouTube", value: "youtube" },
          { title: "Facebook", value: "facebook" },
          { title: "Self Upload", value: "upload" }
        ]
      }
    }),
    defineField({
      name: "embedUrl",
      title: "Video URL",
      description: "Paste a YouTube share link, watch link, embed link, or a Facebook embed URL.",
      type: "url",
      validation: (rule) => rule.required()
    }),
    defineField({ name: "summary", title: "Summary", type: "text", rows: 3 }),
    defineField({ name: "duration", title: "Duration", type: "string" }),
    defineField({ name: "featured", title: "Featured", type: "boolean", initialValue: false })
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "provider"
    }
  }
});
