/**
 * MDX hands JSX written in a post or description straight to React: the `components`
 * overrides only apply to elements Markdown produces, never to literal tags like <script>
 * or <iframe srcDoc>. This removes every JSX element that isn't on the list and every
 * attribute that could run code or load another page. (Markdown itself never produces
 * those elements.)
 */
type Attribute = { type: string; name?: string; value?: unknown };
type MdNode = { type: string; name?: string | null; attributes?: Attribute[]; children?: MdNode[] };

const ELEMENTS = new Set([
  "Ne", "a", "abbr", "b", "blockquote", "br", "cite", "code", "del", "em", "figcaption", "figure", "hr", "i", "img", "ins",
  "kbd", "li", "mark", "ol", "p", "q", "s", "small", "span", "strong", "sub", "sup", "table", "tbody", "td", "th", "thead",
  "tr", "u", "ul",
]);
const ATTRIBUTES = new Set(["href", "src", "alt", "title", "lang", "dir", "cite", "dateTime", "colSpan", "rowSpan"]);
const URL_ATTRIBUTES = new Set(["href", "src", "cite"]);
const SAFE_URL = /^(?:https?:\/\/|\/(?![/\\])|#|mailto:|tel:)/i;
const JSX = new Set(["mdxJsxFlowElement", "mdxJsxTextElement"]);
const CODE = new Set(["mdxjsEsm", "mdxFlowExpression", "mdxTextExpression"]);

function keepAttribute(attribute: Attribute): boolean {
  // Also drops {...spread} attributes and {expressions}.
  if (attribute.type !== "mdxJsxAttribute" || !attribute.name || !ATTRIBUTES.has(attribute.name)) return false;
  if (attribute.value != null && typeof attribute.value !== "string") return false;
  return !URL_ATTRIBUTES.has(attribute.name) || (typeof attribute.value === "string" && SAFE_URL.test(attribute.value.trim()));
}

function clean(node: MdNode, removed?: Set<string>): void {
  if (!Array.isArray(node.children)) return;
  node.children = node.children.filter((child) => {
    if (CODE.has(child.type)) return false;
    if (JSX.has(child.type)) {
      if (!child.name || !ELEMENTS.has(child.name)) {
        removed?.add(child.name || "<>");
        return false;
      }
      child.attributes = (child.attributes ?? []).filter(keepAttribute);
    }
    clean(child, removed);
    return true;
  });
}

/** `removed` (optional) collects the names of the elements taken out, to tell the author. */
export function remarkSafeJsx(options: { removed?: Set<string> } = {}) {
  return (tree: MdNode) => clean(tree, options.removed);
}
