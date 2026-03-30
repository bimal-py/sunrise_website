import { defineField, defineType } from "sanity";

export const merchandiseItemType = defineType({
  name: "merchandiseItem",
  title: "Merchandise Item",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "category", title: "Category", type: "string" }),
    defineField({ name: "summary", title: "Summary", type: "text", rows: 4 }),
    defineField({ name: "currentPrice", title: "Current Price", type: "string" }),
    defineField({ name: "originalPrice", title: "Original Price", type: "string" }),
    defineField({ name: "discountLabel", title: "Discount Label", type: "string" }),
    defineField({ name: "availability", title: "Availability", type: "string" }),
    defineField({ name: "accent", title: "Accent", type: "string" }),
    defineField({ name: "featured", title: "Featured", type: "boolean", initialValue: false }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true }
    })
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "currentPrice",
      media: "image"
    }
  }
});
