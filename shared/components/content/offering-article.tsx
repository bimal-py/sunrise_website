import type { ReactNode } from "react";
import type { ContentSection, Faq } from "@/shared/domain/offering";

/**
 * The written body of a service or print page: intro, H2 sections (paragraph
 * and/or list), an optional slot (e.g. the sizes table) and the questions.
 * Questions stay visible (no accordion) so they're read and indexed.
 */
export function OfferingArticle({
  intro,
  sections,
  faqs,
  children,
}: {
  intro: string[];
  sections: ContentSection[];
  faqs: Faq[];
  children?: ReactNode;
}) {
  return (
    <div className="prose-article">
      {intro.map((paragraph) => (
        <p key={paragraph.slice(0, 40)} className="text-lg text-foreground">
          {paragraph}
        </p>
      ))}
      {children}
      {sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.body && <p>{section.body}</p>}
          {section.items && (
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {faqs.length > 0 && (
        <section>
          <h2>Questions</h2>
          <dl className="mt-4 divide-y divide-line border-y border-line">
            {faqs.map((faq) => (
              <div key={faq.question} className="py-4">
                <dt className="font-semibold text-strong">{faq.question}</dt>
                <dd className="mt-1 text-muted">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
