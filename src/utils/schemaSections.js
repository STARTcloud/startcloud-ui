const GENERAL_KEY = 'general';
const GENERAL_TITLE = 'General';
const SCHEMA_VERSION_KEY = 'schemaVersion';

const isSchema = value => value !== null && typeof value === 'object';

const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

const orderOf = value => (typeof value === 'number' ? value : Infinity);

const byOrder = (a, b) => orderOf(a.order) - orderOf(b.order) || a.index - b.index;

const bySection = (a, b) => {
  if (a.key === GENERAL_KEY || b.key === GENERAL_KEY) {
    return a.key === GENERAL_KEY ? 1 : -1;
  }
  return byOrder(a, b);
};

const segmentsOf = pointer => pointer.split('/').filter(Boolean);

/**
 * One property of a configuration schema as the field the config pages
 * draw: its pointer, the label from `title` (the key when there is none),
 * the hint from `description`, the placeholder or hint from `default`, the
 * `action` declared on it, the `restartReason` of a flagged leaf, the
 * `items` of an array, and the item schema and `propertyNames` of a map.
 *
 * @param {Object} options - The property
 * @param {string} options.pointer - The property's JSON Pointer in the file
 * @param {string} options.key - The property's key
 * @param {Object} options.property - The property's schema
 * @param {boolean} options.required - Whether the parent lists it as required
 * @param {number} [options.index] - The property's declared position, the tiebreak after `order`
 * @returns {Object} The field
 */
export const fieldOf = ({ pointer, key, property, required, index = 0 }) => ({
  pointer,
  key,
  title: property.title || key,
  description: property.description || '',
  type: property.type || 'string',
  format: property.format || '',
  enum: Array.isArray(property.enum) ? property.enum : null,
  default: property.default === undefined ? null : property.default,
  writeOnly: Boolean(property.writeOnly),
  readOnly: Boolean(property.readOnly),
  action: isSchema(property.action) ? property.action : null,
  dependsOn: property.dependsOn || '',
  showWhen: Array.isArray(property.showWhen) ? property.showWhen : null,
  requiresRestart: Boolean(property.requiresRestart),
  restartReason: property.restartReason || '',
  deprecated: Boolean(property.deprecated),
  required,
  order: typeof property.order === 'number' ? property.order : null,
  index,
  items: isSchema(property.items) ? property.items : null,
  additionalProperties: isSchema(property.additionalProperties)
    ? property.additionalProperties
    : null,
  propertyNames: isSchema(property.propertyNames) ? property.propertyNames : null,
});

const sectionOf = (schema, key) => {
  const entry = schema.sections?.[key];
  return {
    key,
    title: entry?.title || (key === GENERAL_KEY ? GENERAL_TITLE : key),
    order: typeof entry?.order === 'number' ? entry.order : null,
    action: isSchema(entry?.action) ? entry.action : null,
    index: Object.keys(schema.sections || {}).indexOf(key),
    fields: [],
    subsections: new Map(),
  };
};

const placeField = ({ sections, schema, sectionKey, subsection, field }) => {
  if (!sections.has(sectionKey)) {
    sections.set(sectionKey, sectionOf(schema, sectionKey));
  }
  const section = sections.get(sectionKey);
  if (!subsection.key) {
    section.fields.push(field);
    return;
  }
  if (!section.subsections.has(subsection.key)) {
    section.subsections.set(subsection.key, {
      key: subsection.key,
      title: subsection.title || subsection.key,
      order: subsection.order,
      index: section.subsections.size,
      fields: [],
    });
  }
  section.subsections.get(subsection.key).fields.push(field);
};

const walkProperties = ({ sections, schema, node, base, sectionKey, subsection }) => {
  const required = node.required || [];
  Object.entries(node.properties || {}).forEach(([key, property], index) => {
    if (base === '' && key === SCHEMA_VERSION_KEY) {
      return;
    }
    const pointer = `${base}/${key}`;
    const section = property.section || sectionKey;
    const own = property.subsection
      ? {
          key: property.subsection,
          title: property.title || '',
          order: typeof property.order === 'number' ? property.order : null,
        }
      : subsection;
    if (property.type === 'object' && property.properties) {
      walkProperties({
        sections,
        schema,
        node: property,
        base: pointer,
        sectionKey: section,
        subsection: own,
      });
      return;
    }
    if (property.type === 'object' && !isSchema(property.additionalProperties)) {
      return;
    }
    placeField({
      sections,
      schema,
      sectionKey: section,
      subsection: own,
      field: fieldOf({ pointer, key, property, required: required.includes(key), index }),
    });
  });
};

/**
 * Walk a configuration schema into the sections and foldable subsections
 * the config pages draw: the sections of the root `sections` map by their
 * `order` ascending, each carrying its `title` and its `action` when it
 * declares one; a top-level property naming no `section` in the section
 * keyed `general`, titled `General`, drawn after every section in
 * `sections`; a subsection titled and ordered by the object property that
 * names it; fields by `order` ascending, a field without `order` after
 * every ordered sibling in schema key order; every field through
 * `fieldOf`; a free subtree the schema does not describe is not drawn;
 * the root `schemaVersion` is never a field of any section, the page
 * drawing it as the line under its heading, so a section whose only
 * leaf it would be is not drawn.
 *
 * @param {Object} schema - The file's schema from `GET /api/config/<name>/schema`
 * @returns {Array<{ key: string, title: string, action: Object|null, fields: Array<Object>, subsections: Array<{ key: string, title: string, fields: Array<Object> }> }>}
 */
export const schemaSections = schema => {
  const sections = new Map();
  walkProperties({
    sections,
    schema,
    node: schema,
    base: '',
    sectionKey: GENERAL_KEY,
    subsection: { key: '', title: '', order: null },
  });
  return [...sections.values()].sort(bySection).map(section => ({
    key: section.key,
    title: section.title,
    action: section.action,
    fields: [...section.fields].sort(byOrder),
    subsections: [...section.subsections.values()].sort(byOrder).map(subsection => ({
      key: subsection.key,
      title: subsection.title,
      fields: [...subsection.fields].sort(byOrder),
    })),
  }));
};

/**
 * The value a JSON Pointer names in a plain configuration file.
 *
 * @param {Object} config - The file
 * @param {string} pointer - The pointer, `/boxvault/origin`
 * @returns {*} The value, undefined when the path does not exist
 */
export const valueAt = (config, pointer) =>
  segmentsOf(pointer).reduce(
    (node, segment) => (node && typeof node === 'object' ? node[segment] : undefined),
    config
  );

/**
 * A copy of a plain configuration file with the value a JSON Pointer names
 * replaced, the objects along the path copied and created as needed.
 *
 * @param {Object} config - The file
 * @param {string} pointer - The pointer, `/boxvault/origin`
 * @param {*} value - The new value
 * @returns {Object} The new file
 */
export const setValueAt = (config, pointer, value) => {
  const segments = segmentsOf(pointer);
  const assign = (node, index) => {
    if (index === segments.length) {
      return value;
    }
    const current = node && typeof node === 'object' ? node : {};
    return { ...current, [segments[index]]: assign(current[segments[index]], index + 1) };
  };
  return assign(config, 0);
};

const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The JSON Merge Patch (RFC 7396) that turns `before` into `after`: an
 * unchanged path is omitted, a changed scalar or array is sent whole, an
 * object recurses, a key `after` lacks is sent as `null` (a map Delete), a
 * cleared text control's `""` and a cleared numeric control's `null` are
 * sent as they are, and a switch sends `true` or `false`.
 *
 * @param {Object} before - The file as read
 * @param {Object} after - The file as edited
 * @returns {Object} The patch, `{}` when nothing changed
 */
export const patchOf = (before, after) => {
  const previous = isPlainObject(before) ? before : {};
  const next = isPlainObject(after) ? after : {};
  const patch = {};
  Object.keys(previous).forEach(key => {
    if (!Object.hasOwn(next, key) || next[key] === undefined) {
      patch[key] = null;
    }
  });
  Object.entries(next).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    const was = previous[key];
    if (isPlainObject(value) && isPlainObject(was)) {
      const inner = patchOf(was, value);
      if (Object.keys(inner).length > 0) {
        patch[key] = inner;
      }
      return;
    }
    if (!Object.hasOwn(previous, key) || !sameValue(was, value)) {
      patch[key] = value;
    }
  });
  return patch;
};
