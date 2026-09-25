import {
  DOWNLOAD_FILE_LABELS,
  DOWNLOAD_LABELS,
  FILE_ARCHITECTURES,
  FILE_KINDS,
  FILE_PLATFORMS,
  PATCH_KINDS,
  PATCH_LABELS,
  RELEASE_LABELS,
} from '../../../utils/forms';

const text = (name, extra = {}) => ({ name, control: 'text', ...extra });
const area = name => ({ name, control: 'textarea' });
const pick = (name, options, group) => ({ name, control: 'select', options, group });

/**
 * The Edit form of each downloads level: the host form its `values`
 * are validated against, the labels of its members and the fields the
 * dialog draws, every member optional and a blank one left as it is; a
 * link member typed and then emptied is sent as an empty string, which
 * clears it.
 */
export const BULK_FORMS = {
  items: {
    formKey: 'bulkItem',
    labels: DOWNLOAD_LABELS,
    fields: [
      area('description'),
      area('details'),
      text('family'),
      text('vendor'),
      text('docs_url', { type: 'url' }),
      text('notes_url', { type: 'url' }),
      text('icon_url', { type: 'url' }),
    ],
  },
  versions: {
    formKey: 'bulkVersion',
    labels: RELEASE_LABELS,
    fields: [area('description'), area('release_notes')],
  },
  providers: {
    formKey: 'bulkPatch',
    labels: PATCH_LABELS,
    fields: [
      pick('kind', PATCH_KINDS, 'kind'),
      text('released_at', { type: 'date' }),
      text('notes_url', { type: 'url' }),
      area('description'),
    ],
  },
  architectures: {
    formKey: 'bulkLeaf',
    labels: DOWNLOAD_FILE_LABELS,
    fields: [
      pick('kind', FILE_KINDS, 'kind'),
      pick('platform', FILE_PLATFORMS, 'platform'),
      pick('architecture', FILE_ARCHITECTURES, 'architecture'),
      text('language'),
      text('variant'),
      text('source_url', { type: 'url' }),
    ],
  },
};

/**
 * The page schema of one level's Edit form: every field a string,
 * a select over its closed list, nothing required.
 *
 * @param {string} level - `items`, `versions`, `providers` or `architectures`
 * @returns {Object} The schema `useFormRules` takes
 */
export const bulkSchemaOf = level => ({
  properties: Object.fromEntries(
    BULK_FORMS[level].fields.map(field => [
      field.name,
      field.options ? { type: 'string', enum: field.options } : { type: 'string' },
    ])
  ),
});

/**
 * The levels below a moved row that the move dialog asks a target for:
 * a release moves under a product, a patch under a product and a
 * release, a file under all three.
 */
export const MOVE_LEVELS = {
  versions: ['product'],
  providers: ['product', 'release'],
  architectures: ['product', 'release', 'patch'],
};
