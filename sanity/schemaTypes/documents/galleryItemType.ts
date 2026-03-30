import { defineField, defineType } from "sanity";

export const galleryItemType = defineType({
  name: "galleryItem",
  title: "Gallery Item",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "category", title: "Category", type: "string" }),
    defineField({ name: "summary", title: "Summary", type: "text", rows: 3 }),
    defineField({ name: "location", title: "Location", type: "string" }),
    defineField({ name: "featured", title: "Featured", type: "boolean", initialValue: false }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
      validation: (rule) => rule.required()
    })
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "category",
      media: "image"
    }
  }
});
