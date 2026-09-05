const isSchema = value => value !== null && typeof value === 'object';

const byOrder = (a, b) => a.order - b.order || a.index - b.index;

const segmentsOf = pointer => pointer.split('/').filter(Boolean);

/**
 * One property of a configuration schema as the field the config pages
 * draw: its pointer, the label from `title` (the key when there is none),
 * the hint from `description`, and the drawing words of the config
 * contract.
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
  writeOnly: Boolean(property.writeOnly),
  readOnly: Boolean(property.readOnly),
  upload: Boolean(property.upload),
  dependsOn: property.dependsOn || '',
  showWhen: Array.isArray(property.showWhen) ? property.showWhen : null,
  requiresRestart: Boolean(property.requiresRestart),
  required,
  order: typeof property.order === 'number' ? property.order : 0,
  index,
  additionalProperties: isSchema(property.additionalProperties)
    ? property.additionalProperties
    : null,
});

const sectionOf = (schema, key) => {
  const entry = schema.sections?.[key] || {};
  return {
    key,
    title: entry.title || '',
    order: typeof entry.order === 'number' ? entry.order : 0,
    index: Object.keys(schema.sections || {}).indexOf(key),
    fields: [],
    subsections: new Map(),
  };
};

const placeField = ({ sections, schema, sectionKey, subsectionKey, subsectionTitle, field }) => {
  if (!sections.has(sectionKey)) {
    sections.set(sectionKey, sectionOf(schema, sectionKey));
  }
  const section = sections.get(sectionKey);
  if (!subsectionKey) {
    section.fields.push(field);
    return;
  }
  if (!section.subsections.has(subsectionKey)) {
    section.subsections.set(subsectionKey, {
      key: subsectionKey,
      title: subsectionTitle,
      order: section.subsections.size,
      index: section.subsections.size,
      fields: [],
    });
  }
  section.subsections.get(subsectionKey).fields.push(field);
};

const walkProperties = ({
  sections,
  schema,
  node,
  base,
  sectionKey,
  subsectionKey,
  subsectionTitle,
}) => {
  const required = node.required || [];
  Object.entries(node.properties || {}).forEach(([key, property], index) => {
    const pointer = `${base}/${key}`;
    const section = property.section || sectionKey;
    const subsection = property.subsection || subsectionKey;
    const title = property.subsection ? property.title || '' : subsectionTitle;
    if (property.type === 'object' && property.properties) {
      walkProperties({
        sections,
        schema,
        node: property,
        base: pointer,
        sectionKey: section,
        subsectionKey: subsection,
        subsectionTitle: title,
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
      subsectionKey: subsection,
      subsectionTitle: title,
      field: fieldOf({ pointer, key, property, required: required.includes(key), index }),
    });
  });
};

/**
 * Walk a configuration schema into the sections and foldable subsections
 * the config pages draw, from `sections`, `section`, `subsection` and
 * `order`, each field carrying its `pointer`, `title`, `description`,
 * `type`, `format`, `enum`, `writeOnly`, `readOnly`, `upload`, `dependsOn`,
 * `showWhen` and `requiresRestart`; a free subtree the schema does not
 * describe is not drawn.
 *
 * @param {Object} schema - The file's schema from `GET /api/config/<name>/schema`
 * @returns {Array<{ key: string, title: string, fields: Array<Object>, subsections: Array<{ key: string, title: string, fields: Array<Object> }> }>}
 */
export const schemaSections = schema => {
  const sections = new Map();
  walkProperties({
    sections,
    schema,
    node: schema,
    base: '',
    sectionKey: 'general',
    subsectionKey: '',
    subsectionTitle: '',
  });
  return [...sections.values()].sort(byOrder).map(section => ({
    key: section.key,
    title: section.title,
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
