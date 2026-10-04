/**
 * A value as text, the empty string for null and undefined.
 *
 * @param {*} value - The value
 * @returns {string} The text
 */
export const textOf = value => (value === null || value === undefined ? '' : String(value));

const wordsOf = query => query.toLowerCase().split(/\s+/u).filter(Boolean);

const nameScore = (name, words) => {
  const phrase = words.join(' ');
  if (name === phrase) {
    return 3;
  }
  if (name.startsWith(phrase)) {
    return 2;
  }
  return words.every(word => name.includes(word)) ? 1 : 0;
};

const spansOf = (lower, words) =>
  words
    .map(word => [lower.indexOf(word), word.length])
    .filter(([start]) => start >= 0)
    .map(([start, length]) => [start, start + length])
    .sort((a, b) => a[0] - b[0]);

/**
 * Whether every word of the query lies in one of the fields, and then the
 * score, the field matched and its highlight: 3 for the name equal to the
 * query, 2 for a prefix, 1 for every word inside the name, 0 otherwise.
 *
 * @param {Array<{ field: string, text: string }>} fields - The row's fields, the name first
 * @param {string} query - The text searched for
 * @returns {{ score: number, matched: string, highlight: Object }|null} The match, null when a word lies in no field
 */
export const matchFields = (fields, query) => {
  const words = wordsOf(query);
  const lowered = fields.map(entry => ({ ...entry, lower: textOf(entry.text).toLowerCase() }));
  if (words.length === 0 || lowered.length === 0) {
    return null;
  }
  if (!words.every(word => lowered.some(entry => entry.lower.includes(word)))) {
    return null;
  }
  const hit = lowered.find(entry => words.some(word => entry.lower.includes(word)));
  return {
    score: nameScore(lowered[0].lower, words),
    matched: hit.field,
    highlight: { [hit.field]: { text: textOf(hit.text), spans: spansOf(hit.lower, words) } },
  };
};

/**
 * Whether the query's letters lie in the text in order, and then the
 * spans of the letters matched.
 *
 * @param {string} text - The text
 * @param {string} query - The letters searched for
 * @returns {Array<Array<number>>|null} The spans, null when the letters are not in order
 */
export const subsequenceSpans = (text, query) => {
  const lower = textOf(text).toLowerCase();
  const letters = [...query.toLowerCase().replace(/\s+/gu, '')];
  if (letters.length === 0) {
    return null;
  }
  const spans = [];
  let from = 0;
  for (const letter of letters) {
    const at = lower.indexOf(letter, from);
    if (at < 0) {
      return null;
    }
    spans.push([at, at + 1]);
    from = at + 1;
  }
  return spans;
};

const subsequenceScore = (lower, wanted) => {
  if (lower === wanted) {
    return 3;
  }
  if (lower.startsWith(wanted)) {
    return 2;
  }
  return lower.includes(wanted) ? 1 : 0;
};

/**
 * A page's or a command's title matched by the query's letters in order:
 * 3 for the title equal to the query, 2 for a prefix, 1 for the query
 * inside it, 0 for the letters in order alone.
 *
 * @param {string} title - The title
 * @param {string} query - The text searched for
 * @returns {{ score: number, matched: string, highlight: Object }|null} The match, null when the letters are not in order
 */
export const subsequenceMatch = (title, query) => {
  const spans = subsequenceSpans(title, query);
  if (!spans) {
    return null;
  }
  return {
    score: subsequenceScore(textOf(title).toLowerCase(), query.toLowerCase().trim()),
    matched: 'title',
    highlight: { title: { text: textOf(title), spans } },
  };
};

const positionIn = (row, words) => {
  const title = row.title.toLowerCase();
  const positions = words.map(word => title.indexOf(word)).filter(at => at >= 0);
  return positions.length > 0 ? Math.min(...positions) : Number.MAX_SAFE_INTEGER;
};

/**
 * The order of results for one query: score descending, then the match's
 * position in the title, then the title, then the id.
 *
 * @param {string} query - The text searched for
 * @returns {Function} The comparator
 */
export const compareRowsFor = query => {
  const words = wordsOf(query);
  return (a, b) =>
    b.score - a.score ||
    positionIn(a, words) - positionIn(b, words) ||
    a.title.localeCompare(b.title) ||
    a.id.localeCompare(b.id);
};
