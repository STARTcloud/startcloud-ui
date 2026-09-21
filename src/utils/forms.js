const CHECKSUM_LENGTHS = { MD5: 32, SHA1: 40, SHA256: 64, SHA384: 96, SHA512: 128 };
const HEX_RE = /^[a-fA-F0-9]+$/;

export const CHECKSUM_ALGORITHMS = Object.keys(CHECKSUM_LENGTHS);

export const CHECKSUM_TYPES = ['NULL', ...CHECKSUM_ALGORITHMS];

export const PATCH_KINDS = ['release', 'fixpack', 'interim-fix', 'hotfix'];

export const FILE_KINDS = [
  'installer',
  'fixpack',
  'hotfix',
  'interim-fix',
  'container-image',
  'package',
  'template',
  'notes',
  'tool',
  'other',
];

export const FILE_PLATFORMS = ['linux', 'windows', 'macos', 'omnios', 'other', 'any'];

export const FILE_ARCHITECTURES = ['x64', 'x86', 'arm64', 'other', 'any'];

const checksumFailure = (value, values) => {
  const type = values.checksum_type;
  if (type === 'NULL') {
    return null;
  }
  if (!value) {
    return { rule: 'required', params: {} };
  }
  if (!HEX_RE.test(value)) {
    return { rule: 'pattern', params: { pattern: 'hex' } };
  }
  const length = CHECKSUM_LENGTHS[type];
  return value.length === length ? null : { rule: 'checksum', params: { type, length } };
};

const fileFailure = value => (value ? null : { rule: 'required', params: {} });

/**
 * The page schemas and label keys of the box and ISO forms, the client-side
 * side of `useFormRules`: `required` applies when the host does not list
 * the form, the `custom` checksum and file rules always.
 */
export const BOX_SCHEMA = {
  required: ['name'],
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    is_public: { type: 'boolean' },
    guest_access: { type: 'boolean' },
  },
};

export const BOX_LABELS = { name: 'boxes.box.name', description: 'boxes.box.description' };

export const BOX_EDIT_SCHEMA = {
  required: ['name'],
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    is_public: { type: 'boolean' },
    guest_access: { type: 'boolean' },
    github_repo: { type: 'string' },
    workflow_file: { type: 'string' },
    cicd_url: { type: 'string' },
  },
};

export const BOX_EDIT_LABELS = {
  name: 'boxes.box.name',
  description: 'boxes.box.description',
  github_repo: 'boxes.box.cicd.repository',
  workflow_file: 'boxes.box.cicd.workflow',
  cicd_url: 'boxes.box.cicd.pipelineUrl',
};

export const ISO_SCHEMA = BOX_SCHEMA;

export const ISO_LABELS = { name: 'boxes.iso.name', description: 'boxes.box.description' };

export const ISO_RENAME_SCHEMA = { required: ['name'], properties: { name: { type: 'string' } } };

const ACCESS_PROPERTIES = {
  is_public: { type: 'boolean' },
  guest_access: { type: 'boolean' },
};

/**
 * The labels of the words a row action bar writes without a form, for the
 * sentence `refusalMessage` paints when the host refuses one: the two
 * visibility words under the Visibility column's name, `published` under
 * the Status column's, the deprecation pair under the version form's.
 */
export const ACCESS_LABELS = {
  is_public: 'pages.table.visibility',
  guest_access: 'pages.table.visibility',
  published: 'pages.table.status',
  deprecated: 'pages.status.deprecated',
  deprecation_reason: 'boxes.version.deprecationReason',
};

export const VERSION_SCHEMA = {
  required: ['version_number'],
  properties: {
    version_number: { type: 'string' },
    description: { type: 'string' },
    ...ACCESS_PROPERTIES,
  },
};

export const VERSION_LABELS = {
  version_number: 'boxes.version.number',
  description: 'boxes.provider.description',
};

export const ISO_VERSION_SCHEMA = {
  properties: { description: { type: 'string' }, ...ACCESS_PROPERTIES },
};

export const DEPRECATION_SCHEMA = {
  required: ['deprecation_reason'],
  properties: { deprecation_reason: { type: 'string' } },
};

export const DEPRECATION_LABELS = { deprecation_reason: 'boxes.version.deprecationReason' };

export const PROVIDER_SCHEMA = {
  required: ['name'],
  properties: { name: { type: 'string' }, description: { type: 'string' }, ...ACCESS_PROPERTIES },
};

export const PROVIDER_LABELS = {
  name: 'boxes.provider.name',
  description: 'boxes.provider.description',
};

export const ARCHITECTURE_SCHEMA = {
  required: ['name'],
  properties: {
    name: { type: 'string' },
    default_box: { type: 'boolean' },
    ...ACCESS_PROPERTIES,
    checksum_type: { type: 'string', enum: CHECKSUM_TYPES },
    checksum: {
      type: 'string',
      dependsOn: 'checksum_type',
      showWhen: CHECKSUM_ALGORITHMS,
      custom: checksumFailure,
    },
    file: { custom: fileFailure },
  },
};

export const ARCHITECTURE_LABELS = {
  name: 'boxes.architecture.name',
  default_box: 'boxes.architecture.defaultBox',
  checksum_type: 'boxes.architecture.checksumType',
  checksum: 'boxes.architecture.checksum',
  file: 'boxes.architecture.file',
};

export const ISO_ARCHITECTURE_SCHEMA = {
  required: ['name'],
  properties: { name: { type: 'string' }, ...ACCESS_PROPERTIES },
};

export const ISO_ARCHITECTURE_LABELS = { name: 'boxes.architecture.name' };

export const DOWNLOAD_SCHEMA = {
  required: ['name'],
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    is_public: { type: 'boolean' },
    guest_access: { type: 'boolean' },
    family: { type: 'string' },
    vendor: { type: 'string' },
    icon_url: { type: 'string' },
    docs_url: { type: 'string' },
    notes_url: { type: 'string' },
  },
};

export const DOWNLOAD_LABELS = {
  name: 'downloads.product.name',
  description: 'downloads.product.description',
  family: 'downloads.product.family',
  vendor: 'downloads.product.vendor',
  icon_url: 'downloads.product.iconUrl',
  docs_url: 'downloads.product.docsUrl',
  notes_url: 'downloads.product.notesUrl',
};

export const RELEASE_SCHEMA = {
  required: ['version_number'],
  properties: {
    version_number: { type: 'string' },
    description: { type: 'string' },
    release_notes: { type: 'string' },
    ...ACCESS_PROPERTIES,
  },
};

export const RELEASE_LABELS = {
  version_number: 'downloads.release.number',
  description: 'downloads.release.description',
  release_notes: 'downloads.release.notes',
};

export const PATCH_SCHEMA = {
  required: ['name'],
  properties: {
    name: { type: 'string' },
    kind: { type: 'string', enum: PATCH_KINDS },
    released_at: { type: 'string' },
    notes_url: { type: 'string' },
    ...ACCESS_PROPERTIES,
  },
};

export const PATCH_LABELS = {
  name: 'downloads.patch.name',
  description: 'downloads.patch.description',
  kind: 'downloads.patch.kind',
  released_at: 'downloads.patch.releasedAt',
  notes_url: 'downloads.patch.notesUrl',
};

export const DOWNLOAD_FILE_SCHEMA = {
  required: ['key', 'file_name'],
  properties: {
    key: { type: 'string', minLength: 1 },
    file_name: { type: 'string', minLength: 1 },
    kind: { type: 'string', enum: FILE_KINDS },
    platform: { type: 'string', enum: FILE_PLATFORMS },
    architecture: { type: 'string', enum: FILE_ARCHITECTURES },
    language: { type: 'string' },
    variant: { type: 'string' },
    checksum_type: { type: 'string', enum: CHECKSUM_TYPES },
    checksum: {
      type: 'string',
      dependsOn: 'checksum_type',
      showWhen: CHECKSUM_ALGORITHMS,
      custom: checksumFailure,
    },
  },
};

export const PLACE_SCHEMA = {
  required: ['product', 'release', 'patch', ...DOWNLOAD_FILE_SCHEMA.required],
  properties: {
    product: { $ref: '#/$defs/slug', minLength: 1 },
    release: { $ref: '#/$defs/identifier', minLength: 1 },
    patch: { $ref: '#/$defs/identifier', minLength: 1 },
    is_public: { type: 'boolean' },
    guest_access: { type: 'boolean' },
    ...DOWNLOAD_FILE_SCHEMA.properties,
  },
};

export const DOWNLOAD_FILE_LABELS = {
  key: 'downloads.file.key',
  file_name: 'downloads.file.fileName',
  kind: 'downloads.file.kind',
  platform: 'downloads.file.platform',
  architecture: 'downloads.file.architecture',
  language: 'downloads.file.language',
  variant: 'downloads.file.variant',
  checksum_type: 'downloads.file.checksumType',
  checksum: 'downloads.file.checksum',
};

export const PLACE_LABELS = {
  product: 'downloads.place.product',
  release: 'downloads.place.release',
  patch: 'downloads.place.patch',
  ...DOWNLOAD_FILE_LABELS,
};
