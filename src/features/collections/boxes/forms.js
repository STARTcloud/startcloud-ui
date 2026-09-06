const CHECKSUM_LENGTHS = { MD5: 32, SHA1: 40, SHA256: 64, SHA384: 96, SHA512: 128 };
const HEX_RE = /^[a-fA-F0-9]+$/;

export const CHECKSUM_TYPES = ['NULL', ...Object.keys(CHECKSUM_LENGTHS)];

const checksumFailure = (value, values) => {
  const type = values.checksum_type;
  if (type === 'NULL') {
    return null;
  }
  if (!value) {
    return { rule: 'required', params: {} };
  }
  const length = CHECKSUM_LENGTHS[type];
  return HEX_RE.test(value) && value.length === length
    ? null
    : { rule: 'checksum', params: { type, length } };
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
  },
};

export const BOX_LABELS = { name: 'boxes.box.name', description: 'boxes.box.description' };

export const BOX_EDIT_SCHEMA = {
  required: ['name'],
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    is_public: { type: 'boolean' },
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

export const VERSION_SCHEMA = {
  required: ['version_number'],
  properties: { version_number: { type: 'string' }, description: { type: 'string' } },
};

export const VERSION_LABELS = {
  version_number: 'boxes.version.number',
  description: 'boxes.provider.description',
};

export const DEPRECATION_SCHEMA = {
  required: ['deprecation_reason'],
  properties: { deprecation_reason: { type: 'string' } },
};

export const DEPRECATION_LABELS = { deprecation_reason: 'boxes.version.deprecationReason' };

export const PROVIDER_SCHEMA = {
  required: ['name'],
  properties: { name: { type: 'string' }, description: { type: 'string' } },
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
    checksum_type: { type: 'string', enum: CHECKSUM_TYPES },
    checksum: {
      type: 'string',
      dependsOn: 'checksum_type',
      showWhen: Object.keys(CHECKSUM_LENGTHS),
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
  properties: { name: { type: 'string' } },
};

export const ISO_ARCHITECTURE_LABELS = { name: 'boxes.architecture.name' };
