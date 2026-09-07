import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

const ALLOWED_TAGS = new Set([
  'a',
  'abbr',
  'b',
  'blockquote',
  'br',
  'caption',
  'code',
  'dd',
  'del',
  'dl',
  'dt',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'ins',
  'kbd',
  'li',
  'mark',
  'ol',
  'p',
  'pre',
  'q',
  's',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);
const DROPPED_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'base',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'svg',
  'math',
  'template',
]);
const COMMON_ATTRS = ['class', 'id', 'title', 'lang', 'dir'];
const TAG_ATTRS = {
  a: ['href', 'name'],
  img: ['src', 'alt', 'width', 'height'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan', 'scope'],
  ol: ['start', 'type'],
  span: ['data-tos-field'],
};
const URL_ATTRS = new Set(['href', 'src']);
const SAFE_URL = /^(?:https?:|mailto:|tel:|#|\/(?![/\\]))/i;

const allowedAttribute = (tag, name) =>
  COMMON_ATTRS.includes(name) || (TAG_ATTRS[tag] || []).includes(name);

const cleanAttributes = element => {
  const tag = element.tagName.toLowerCase();
  Array.from(element.attributes).forEach(({ name, value }) => {
    const lowered = name.toLowerCase();
    if (!allowedAttribute(tag, lowered) || (URL_ATTRS.has(lowered) && !SAFE_URL.test(value))) {
      element.removeAttribute(name);
    }
  });
  if (tag === 'a' && element.hasAttribute('href')) {
    element.setAttribute('target', '_blank');
    element.setAttribute('rel', 'noopener noreferrer');
  }
  if (tag === 'img') {
    element.setAttribute('referrerpolicy', 'no-referrer');
  }
};

const cleanNode = node => {
  if (node.nodeType === Node.TEXT_NODE) {
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    node.remove();
    return;
  }
  const tag = node.tagName.toLowerCase();
  if (DROPPED_TAGS.has(tag)) {
    node.remove();
    return;
  }
  Array.from(node.childNodes).forEach(cleanNode);
  if (!ALLOWED_TAGS.has(tag)) {
    node.replaceWith(...Array.from(node.childNodes));
    return;
  }
  cleanAttributes(node);
};

/**
 * The allowlist pass every `*_html` member goes through before it is
 * injected: every formatting element, link, table and image an author
 * would use kept, script, handlers and `javascript:` URLs stripped, links
 * opening a new tab with `rel="noopener"`.
 *
 * @param {string} html - The server's HTML
 * @returns {DocumentFragment} The sanitized nodes
 */
export const sanitizeHtml = html => {
  const parsed = new DOMParser().parseFromString(String(html || ''), 'text/html');
  Array.from(parsed.body.childNodes).forEach(cleanNode);
  const fragment = document.createDocumentFragment();
  fragment.append(...Array.from(parsed.body.childNodes));
  return fragment;
};

const applyFills = (container, fills) => {
  container.querySelectorAll('.tos-blank[data-tos-field]').forEach(span => {
    if (span.dataset.tosBlank === undefined) {
      span.dataset.tosBlank = span.textContent;
    }
    const value = fills[span.dataset.tosField];
    span.textContent = value ? String(value) : span.dataset.tosBlank;
  });
};

/**
 * The `prose` typography over server HTML or markdown: HTML goes through
 * `sanitizeHtml` and is mounted as nodes, never as a string, and every
 * `tos-blank` span named by `data-tos-field` is filled from `fills` with
 * `textContent`; markdown renders through react-markdown, which escapes
 * HTML. `fontScale` scales the article for the A-/A+ controls.
 */
const MarkdownArticle = ({
  html = '',
  markdown = '',
  fills = null,
  fontScale = 1,
  className = '',
}) => {
  const container = useRef(null);
  const fragment = useMemo(() => (html ? sanitizeHtml(html) : null), [html]);

  useEffect(() => {
    if (!container.current || !fragment) {
      return;
    }
    container.current.replaceChildren(fragment.cloneNode(true));
    if (fills) {
      applyFills(container.current, fills);
    }
  }, [fragment, fills]);

  const style = fontScale === 1 ? undefined : { fontSize: `${fontScale}em` };

  if (!html) {
    return (
      <div className={`prose ${className}`.trim()} style={style}>
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    );
  }
  return <div ref={container} className={`prose ${className}`.trim()} style={style} />;
};

MarkdownArticle.propTypes = {
  html: PropTypes.string,
  markdown: PropTypes.string,
  fills: PropTypes.objectOf(PropTypes.string),
  fontScale: PropTypes.number,
  className: PropTypes.string,
};

export default MarkdownArticle;
