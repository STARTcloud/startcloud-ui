import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  a: ['href', 'name', 'rel'],
  img: ['src', 'alt', 'width', 'height'],
  td: ['colspan', 'rowspan', 'align'],
  th: ['colspan', 'rowspan', 'scope', 'align'],
  ol: ['start', 'type'],
};
const URL_ATTRS = new Set(['href', 'src']);
const SAFE_URL = /^(?:https?:|mailto:|tel:|#|\/(?![/\\]))/i;
const KEPT_CLASSES = new Set(['callout', 'callout-lock', 'callout-doc']);
const ALIGNMENTS = new Set(['left', 'center', 'right']);
const NEW_TAB_REL = ['noopener', 'noreferrer'];
const KEPT_REL = 'nofollow';
const KEY_PATTERN = /^[a-z0-9]{16}$/;
const CALLOUT_PATTERN =
  /^\s*\[!(?<word>NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][^\S\n]*(?<newline>\n?)(?<rest>[\s\S]*)$/;
const CALLOUT_BORDERS = {
  note: 'border-info',
  tip: 'border-success',
  important: 'border-primary',
  warning: 'border-warning',
  caution: 'border-danger',
};
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const COUNTRY_CODE = /^[A-Z]{2}$/;
const TICKED = '☑';
const UNTICKED = '☐';
const NO_FIELDS = [];
const NO_VALUES = {};

/**
 * The kinds a `fields` entry may carry.
 */
export const FIELD_KINDS = [
  'text',
  'tel',
  'country',
  'state',
  'composite',
  'checkbox',
  'date',
  'choice',
  'signature',
];

/**
 * The highest `fields_version` the document component draws.
 */
export const FIELDS_VERSION = 1;

export const fieldShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  kind: PropTypes.string.isRequired,
  group: PropTypes.string,
  autocomplete: PropTypes.string,
  required: PropTypes.bool,
  value: PropTypes.string,
  read_only: PropTypes.bool,
  removed: PropTypes.bool,
  changed: PropTypes.bool,
  label: PropTypes.string,
  options: PropTypes.arrayOf(PropTypes.string),
  parts: PropTypes.arrayOf(PropTypes.string),
  separators: PropTypes.arrayOf(PropTypes.string),
});

/**
 * Whether the sanitizer keeps one attribute of one element: a common
 * attribute or one the tag's own list names, a `href` or `src` only while
 * its value is a safe URL, and `align` only while it names a side.
 *
 * @param {string} tag - The element's tag, lower case
 * @param {string} name - The attribute's name
 * @param {string} value - The attribute's value
 * @returns {boolean}
 */
export const attributeKept = (tag, name, value) => {
  const lowered = String(name).toLowerCase();
  if (!COMMON_ATTRS.includes(lowered) && !(TAG_ATTRS[tag] || []).includes(lowered)) {
    return false;
  }
  if (URL_ATTRS.has(lowered)) {
    return SAFE_URL.test(String(value));
  }
  if (lowered === 'align') {
    return ALIGNMENTS.has(String(value).toLowerCase());
  }
  return true;
};

/**
 * The class tokens the sanitizer keeps, `callout`, `callout-lock` and
 * `callout-doc`, joined by a space; empty when it keeps none.
 *
 * @param {string} value - The `class` attribute
 * @returns {string} The kept tokens
 */
export const classesKept = value =>
  String(value || '')
    .split(/\s+/)
    .filter(token => KEPT_CLASSES.has(token))
    .join(' ');

/**
 * The `rel` of a link the sanitizer keeps: `noopener noreferrer` for the
 * new tab, after `nofollow` when the server sent it.
 *
 * @param {string} rel - The `rel` the server sent
 * @returns {string} The `rel` drawn
 */
export const relFor = rel => {
  const sent = String(rel || '')
    .toLowerCase()
    .split(/\s+/);
  return [...(sent.includes(KEPT_REL) ? [KEPT_REL] : []), ...NEW_TAB_REL].join(' ');
};

const cleanClass = element => {
  if (!element.hasAttribute('class')) {
    return;
  }
  const kept = classesKept(element.getAttribute('class'));
  if (kept) {
    element.setAttribute('class', kept);
  } else {
    element.removeAttribute('class');
  }
};

const cleanAttributes = element => {
  const tag = element.tagName.toLowerCase();
  Array.from(element.attributes).forEach(({ name, value }) => {
    if (!attributeKept(tag, name, value)) {
      element.removeAttribute(name);
    }
  });
  cleanClass(element);
  if (tag === 'a') {
    if (element.hasAttribute('href')) {
      element.setAttribute('target', '_blank');
      element.setAttribute('rel', relFor(element.getAttribute('rel')));
    } else {
      element.removeAttribute('rel');
    }
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
 * mounted: every formatting element, link, table and image an author
 * would use kept, `align` kept on `th` and `td` while it names a side,
 * script, handlers and `javascript:` URLs stripped, links opening a new
 * tab with `rel="noopener noreferrer"` and the server's `nofollow` beside
 * it, and `class` kept only from the named set, `callout`, `callout-lock`
 * and `callout-doc`, every other token and every `data-*` attribute
 * dropped.
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

/**
 * One text node's text split at the anchors `@@field:<key>:<name>@@` of
 * the answer's own `anchor_key`: the text between anchors as strings and
 * each anchor as `{ name }`, in order. Text is never split while the key
 * is not sixteen lower-case letters and digits, so anchor-looking text of
 * another key stays text.
 *
 * @param {string} text - The text node's text
 * @param {string} anchorKey - The answer's `anchor_key`
 * @returns {Array<string|{ name: string }>} The parts
 */
export const anchorParts = (text, anchorKey) => {
  const source = String(text || '');
  if (!KEY_PATTERN.test(String(anchorKey || ''))) {
    return source ? [source] : [];
  }
  const pattern = new RegExp(`@@field:${anchorKey}:(?<name>[a-z0-9_]+)@@`, 'g');
  const parts = [];
  let last = 0;
  for (const match of source.matchAll(pattern)) {
    if (match.index > last) {
      parts.push(source.slice(last, match.index));
    }
    parts.push({ name: match.groups.name });
    last = match.index + match[0].length;
  }
  if (last < source.length) {
    parts.push(source.slice(last));
  }
  return parts;
};

/**
 * The names of the anchors of the answer's key in one text, in order.
 *
 * @param {string} text - The text
 * @param {string} anchorKey - The answer's `anchor_key`
 * @returns {string[]} The field names
 */
export const anchorNames = (text, anchorKey) =>
  anchorParts(text, anchorKey)
    .filter(part => typeof part !== 'string')
    .map(part => part.name);

/**
 * A composite's join: each non-blank part's text, every part after the
 * first non-blank one preceded by its own separator, `separators[i - 1]`
 * belonging to `parts[i]`.
 *
 * @param {string[]} parts - The part names
 * @param {string[]} separators - One separator per part after the first
 * @param {(name: string) => string} textOf - A part's text, empty when blank
 * @returns {string} The join
 */
export const compositeJoin = (parts, separators, textOf) => {
  let joined = '';
  let started = false;
  (parts || []).forEach((part, index) => {
    const text = textOf(part);
    if (!text) {
      return;
    }
    joined += started ? `${(separators || [])[index - 1] ?? ''}${text}` : text;
    started = true;
  });
  return joined;
};

const englishRegions = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return null;
  }
})();

/**
 * The English name of an ISO 3166-1 alpha-2 country code, the value
 * itself when it is not such a code.
 *
 * @param {string} code - The country code
 * @returns {string} The name
 */
export const countryName = code => {
  const text = String(code || '');
  const upper = text.toUpperCase();
  if (!COUNTRY_CODE.test(upper)) {
    return text;
  }
  try {
    return englishRegions?.of(upper) || upper;
  } catch {
    return upper;
  }
};

/**
 * The `fields` list keyed by `name`.
 *
 * @param {Array<Object>} fields - The answer's `fields`
 * @returns {Object} Name to entry
 */
export const entriesOf = fields =>
  Object.fromEntries((Array.isArray(fields) ? fields : []).map(entry => [entry.name, entry]));

const drawable = (entry, fieldsVersion) =>
  Boolean(entry) && FIELD_KINDS.includes(entry.kind) && !(Number(fieldsVersion) > FIELDS_VERSION);

const plainText = value => (value === undefined || value === null ? '' : String(value));

const leafText = ({ entry, values, dateOf }) => {
  const value = values[entry.name];
  if (entry.kind === 'checkbox') {
    return value === true ? TICKED : UNTICKED;
  }
  if (entry.kind === 'date') {
    return dateOf(plainText(value));
  }
  return plainText(value);
};

const partText = ({ entry, values, dateOf }) => {
  if (!entry || entry.kind === 'composite') {
    return '';
  }
  return entry.kind === 'country'
    ? countryName(values[entry.name])
    : leafText({ entry, values, dateOf });
};

const valueText = ({ entry, entries, values, dateOf }) =>
  entry.kind === 'composite'
    ? compositeJoin(entry.parts, entry.separators, part =>
        partText({ entry: entries[part], values, dateOf })
      )
    : leafText({ entry, values, dateOf });

const removedText = ({ entry, entries, values, labelOf, dateOf }) => {
  if (entry.kind !== 'composite') {
    return labelOf(entry);
  }
  return compositeJoin(entry.parts, entry.separators, part => {
    const partEntry = entries[part];
    if (!partEntry) {
      return part;
    }
    if (partEntry.removed) {
      return labelOf(partEntry);
    }
    return partText({ entry: partEntry, values, dateOf }) || labelOf(partEntry);
  });
};

/**
 * What one blank draws: `{ error: true }` for an anchor with no entry, a
 * `kind` outside `FIELD_KINDS` or a `fields_version` above
 * `FIELDS_VERSION`; else `{ text, label, empty, removed, changed }`, the
 * text a `text`, `tel`, `country`, `state`, `choice` or `signature` value
 * as its input holds it, a `composite` as its join with a `country` part
 * as the English name of its code, a `checkbox` as a tick box and a `date`
 * through `dateOf`; an empty blank carries no text and `label` names it;
 * a removed entry draws its label, a removed composite the join of its
 * parts, each removed part by its label.
 *
 * @param {Object} options - The blank
 * @param {string} options.name - The anchor's field name
 * @param {Object} options.entries - `fields` keyed by name
 * @param {Object} options.values - The current values keyed by name
 * @param {number} [options.fieldsVersion] - The answer's `fields_version`
 * @param {(entry: Object) => string} options.labelOf - An entry's label
 * @param {(value: string) => string} options.dateOf - A `yyyy-MM-dd` date as drawn text
 * @returns {Object} `{ error }`, and `text`, `label`, `empty`, `removed`, `changed` when drawn
 */
export const blankOf = ({ name, entries, values, fieldsVersion, labelOf, dateOf }) => {
  const entry = entries[name];
  if (!drawable(entry, fieldsVersion)) {
    return { error: true };
  }
  const changed = Boolean(entry.changed);
  const label = labelOf(entry);
  if (entry.removed) {
    return {
      error: false,
      text: removedText({ entry, entries, values, labelOf, dateOf }),
      label,
      empty: false,
      removed: true,
      changed,
    };
  }
  const text = valueText({ entry, entries, values, dateOf });
  return { error: false, text, label, empty: !text, removed: false, changed };
};

/**
 * Whether a document cannot be accepted as drawn: a `fields_version`
 * above `FIELDS_VERSION`, an entry whose `kind` is outside `FIELD_KINDS`,
 * or an anchor of the answer's key with no entry in any of the HTML
 * members.
 *
 * @param {Object} options - The answer
 * @param {Array<string|null>} options.htmls - The `*_html` members drawn
 * @param {string} options.anchorKey - The answer's `anchor_key`
 * @param {Array<Object>} options.fields - The answer's `fields`
 * @param {number} [options.fieldsVersion] - The answer's `fields_version`
 * @returns {boolean}
 */
export const documentBroken = ({ htmls, anchorKey, fields, fieldsVersion }) => {
  const list = Array.isArray(fields) ? fields : [];
  if (Number(fieldsVersion) > FIELDS_VERSION) {
    return true;
  }
  if (list.some(entry => !FIELD_KINDS.includes(entry.kind))) {
    return true;
  }
  const entries = entriesOf(list);
  return htmls.some(
    html =>
      Boolean(html) &&
      anchorNames(sanitizeHtml(html).textContent, anchorKey).some(name => !entries[name])
  );
};

/**
 * A blockquote's callout marker read from the text its first paragraph
 * opens with: `{ kind, rest, ended }` when the text starts with `[!NOTE]`,
 * `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` or `[!CAUTION]` followed by a
 * line break or nothing more, `kind` in lower case, `rest` the text after
 * the break and `ended` true when the text ends at the marker; `null`
 * otherwise.
 *
 * @param {string} text - The paragraph's leading text
 * @returns {{ kind: string, rest: string, ended: boolean }|null}
 */
export const calloutOf = text => {
  const match = CALLOUT_PATTERN.exec(String(text || ''));
  if (!match) {
    return null;
  }
  const { word, newline, rest } = match.groups;
  if (!newline && rest) {
    return null;
  }
  return { kind: word.toLowerCase(), rest, ended: !newline };
};

const isLineBreak = node => node?.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR';

const markCallout = (quote, titleOf) => {
  const paragraph = quote.firstElementChild;
  const lead = paragraph?.tagName === 'P' ? paragraph.firstChild : null;
  if (!lead || lead.nodeType !== Node.TEXT_NODE) {
    return;
  }
  const found = calloutOf(lead.textContent);
  if (!found) {
    return;
  }
  const next = lead.nextSibling;
  if (found.ended && next && !isLineBreak(next)) {
    return;
  }
  if (found.ended && next) {
    next.remove();
  }
  if (found.rest) {
    lead.textContent = found.rest;
  } else {
    lead.remove();
  }
  const title = document.createElement('strong');
  title.textContent = titleOf(found.kind);
  if (paragraph.firstChild) {
    paragraph.prepend(title, document.createElement('br'));
  } else {
    paragraph.append(title);
  }
  quote.classList.add(CALLOUT_BORDERS[found.kind]);
  quote.dataset.callout = found.kind;
};

const decorate = (root, titleOf) => {
  root.querySelectorAll('table').forEach(table => table.classList.add('table', 'table-sm'));
  root.querySelectorAll('blockquote').forEach(quote => {
    quote.classList.add('callout');
    markCallout(quote, titleOf);
  });
};

const textNodesOf = root => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }
  return nodes;
};

const mountBlanks = (root, anchorKey, interactive) => {
  const blanks = [];
  textNodesOf(root).forEach(node => {
    const parts = anchorParts(node.textContent, anchorKey);
    if (!parts.some(part => typeof part !== 'string')) {
      return;
    }
    const replacement = document.createDocumentFragment();
    parts.forEach(part => {
      if (typeof part === 'string') {
        replacement.append(document.createTextNode(part));
        return;
      }
      const element = document.createElement(interactive ? 'output' : 'span');
      element.dataset.field = part.name;
      if (interactive) {
        element.setAttribute('aria-live', 'off');
      }
      blanks.push({ element, name: part.name });
      replacement.append(element);
    });
    node.replaceWith(replacement);
  });
  return blanks;
};

const paintBlank = (element, drawn, words) => {
  if (drawn.error) {
    const error = document.createElement('strong');
    error.className = 'text-danger';
    error.textContent = words.error;
    element.removeAttribute('class');
    element.removeAttribute('title');
    element.dataset.blank = 'error';
    element.replaceChildren(error);
    return;
  }
  if (drawn.changed) {
    element.title = words.changed;
    element.dataset.changed = 'true';
  } else {
    element.removeAttribute('title');
    delete element.dataset.changed;
  }
  if (drawn.empty) {
    const name = document.createElement('span');
    name.className = 'visually-hidden';
    name.textContent = drawn.label;
    element.className = 'tos-blank';
    element.dataset.blank = 'empty';
    element.replaceChildren(name);
    return;
  }
  let content = document.createTextNode(drawn.text);
  if (drawn.removed) {
    const struck = document.createElement('del');
    struck.append(content);
    content = struck;
  }
  if (drawn.changed) {
    const marked = document.createElement('ins');
    marked.append(content);
    content = marked;
  }
  if (drawn.removed) {
    element.removeAttribute('class');
    element.dataset.blank = 'removed';
  } else {
    element.className = 'tos-blank';
    element.dataset.blank = 'filled';
  }
  element.replaceChildren(content);
};

const inputsOf = (entry, entries, inputId) => {
  if (!entry || entry.removed) {
    return '';
  }
  const names = entry.kind === 'composite' ? entry.parts || [] : [entry.name];
  return names
    .filter(name => entries[name] && !entries[name].removed)
    .map(name => inputId(name))
    .filter(Boolean)
    .join(' ');
};

/**
 * The one document component: the `prose` typography over server HTML or
 * markdown. HTML goes through `sanitizeHtml` and is mounted as nodes,
 * never as a string; every table takes the table look and every
 * `blockquote` the card look, one whose first paragraph opens with a
 * callout marker taking that kind's title and border in the marker's
 * place. Every anchor `@@field:<anchorKey>:<name>@@` in a text node is
 * then replaced by a blank drawn from `fields` through `blankOf`: with
 * `values` the blank mirrors the value of its name, without them every
 * blank draws empty, the theme's empty blank holding the field's label
 * as visually hidden text, so a screen reader reads the blank as text
 * with no role; with `inputId` each blank is an `output` naming the
 * ids of the inputs it mirrors and stays silent to assistive technology
 * while it changes; an anchor that cannot be drawn shows an error in the
 * blank's place. Markdown renders through react-markdown, which escapes
 * HTML. `fontScale` scales the article for the A-/A+ controls.
 */
const MarkdownArticle = ({
  html = '',
  markdown = '',
  anchorKey = '',
  fields = NO_FIELDS,
  fieldsVersion = FIELDS_VERSION,
  values = NO_VALUES,
  inputId = null,
  fontScale = 1,
  className = '',
}) => {
  const { t, i18n } = useTranslation(['auth']);
  const container = useRef(null);
  const blanks = useRef([]);
  const fragment = useMemo(() => (html ? sanitizeHtml(html) : null), [html]);
  const entries = useMemo(() => entriesOf(fields), [fields]);
  const interactive = Boolean(inputId);

  useEffect(() => {
    if (!container.current || !fragment) {
      blanks.current = [];
      return;
    }
    container.current.replaceChildren(fragment.cloneNode(true));
    decorate(container.current, kind => t(`terms.callout.${kind}`));
    blanks.current = mountBlanks(container.current, anchorKey, interactive);
  }, [fragment, anchorKey, interactive, t]);

  useEffect(() => {
    if (!fragment) {
      return;
    }
    const labelOf = entry =>
      entry.group === 'document' && entry.label
        ? entry.label
        : t(`terms.field.${entry.name}`, { defaultValue: entry.label || entry.name });
    const dateOf = value =>
      DATE_PATTERN.test(value)
        ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long', timeZone: 'UTC' }).format(
            new Date(`${value}T00:00:00Z`)
          )
        : '';
    const words = { error: t('terms.blankError'), changed: t('terms.changed') };
    blanks.current.forEach(({ element, name }) => {
      paintBlank(
        element,
        blankOf({ name, entries, values, fieldsVersion, labelOf, dateOf }),
        words
      );
      if (inputId) {
        const ids = inputsOf(entries[name], entries, inputId);
        if (ids) {
          element.setAttribute('for', ids);
        } else {
          element.removeAttribute('for');
        }
      }
    });
  }, [fragment, anchorKey, interactive, entries, values, fieldsVersion, inputId, t, i18n.language]);

  const scale = fontScale === 1 ? '' : ` prose-scale-${Math.round(fontScale * 100)}`;
  const classes = `prose${scale} ${className}`.trim();

  if (!html) {
    return (
      <div key="markdown" className={classes}>
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    );
  }
  return <div key="html" ref={container} className={classes} />;
};

MarkdownArticle.propTypes = {
  html: PropTypes.string,
  markdown: PropTypes.string,
  anchorKey: PropTypes.string,
  fields: PropTypes.arrayOf(fieldShape),
  fieldsVersion: PropTypes.number,
  values: PropTypes.object,
  inputId: PropTypes.func,
  fontScale: PropTypes.number,
  className: PropTypes.string,
};

export default MarkdownArticle;
