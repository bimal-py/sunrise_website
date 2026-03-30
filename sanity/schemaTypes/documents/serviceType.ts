import { defineArrayMember, defineField, defineType } from "sanity";

export const serviceType = defineType({
  name: "service",
  title: "Service",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "summary", title: "Summary", type: "text", rows: 4 }),
    defineField({ name: "priceLabel", title: "Price Label", type: "string" }),
    defineField({ name: "turnaround", title: "Turnaround", type: "string" }),
    defineField({
      name: "highlights",
      title: "Highlights",
      type: "array",
      of: [defineArrayMember({ type: "string" })]
    }),
    defineField({ name: "featured", title: "Featured", type: "boolean", initialValue: false })
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "priceLabel"
    }
  }
});
