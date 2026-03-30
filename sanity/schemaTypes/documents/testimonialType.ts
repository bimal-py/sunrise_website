import { defineField, defineType } from "sanity";

export const testimonialType = defineType({
  name: "testimonial",
  title: "Testimonial",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Name", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "role", title: "Role", type: "string" }),
    defineField({ name: "quote", title: "Quote", type: "text", rows: 5, validation: (rule) => rule.required() }),
    defineField({ name: "featured", title: "Featured", type: "boolean", initialValue: false })
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "role"
    }
  }
});
