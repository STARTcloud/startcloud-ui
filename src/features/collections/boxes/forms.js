const CHECKSUM_LENGTHS = { MD5: 32, SHA1: 40, SHA256: 64, SHA384: 96, SHA512: 128 };
const HEX_RE = /^[a-fA-F0-9]+$/;

export const CHECKSUM_TYPES = ['NULL', ...Object.keys(CHECKSUM_LENGTHS)];

const checksumFailure = (value, values) => {
  const type = values.checksumType;
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
    isPublic: { type: 'boolean' },
  },
};

export const BOX_LABELS = { name: 'boxes.box.name', description: 'boxes.box.description' };

export const BOX_EDIT_SCHEMA = {
  required: ['name'],
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    isPublic: { type: 'boolean' },
    githubRepo: { type: 'string' },
    workflowFile: { type: 'string' },
    cicdUrl: { type: 'string' },
  },
};

export const BOX_EDIT_LABELS = {
  name: 'boxes.box.name',
  description: 'boxes.box.description',
  githubRepo: 'boxes.box.cicd.repository',
  workflowFile: 'boxes.box.cicd.workflow',
  cicdUrl: 'boxes.box.cicd.pipelineUrl',
};

export const ISO_SCHEMA = BOX_SCHEMA;

export const ISO_LABELS = { name: 'boxes.iso.name', description: 'boxes.box.description' };

export const ISO_RENAME_SCHEMA = { required: ['name'], properties: { name: { type: 'string' } } };

export const VERSION_SCHEMA = {
  required: ['versionNumber'],
  properties: { versionNumber: { type: 'string' }, description: { type: 'string' } },
};

export const VERSION_LABELS = {
  versionNumber: 'boxes.version.number',
  description: 'boxes.provider.description',
};

export const DEPRECATION_SCHEMA = {
  required: ['deprecationReason'],
  properties: { deprecationReason: { type: 'string' } },
};

export const DEPRECATION_LABELS = { deprecationReason: 'boxes.version.deprecationReason' };

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
    defaultBox: { type: 'boolean' },
    checksumType: { type: 'string', enum: CHECKSUM_TYPES },
    checksum: {
      type: 'string',
      dependsOn: 'checksumType',
      showWhen: Object.keys(CHECKSUM_LENGTHS),
      custom: checksumFailure,
    },
    file: { custom: fileFailure },
  },
};

export const ARCHITECTURE_LABELS = {
  name: 'boxes.architecture.name',
  defaultBox: 'boxes.architecture.defaultBox',
  checksumType: 'boxes.architecture.checksumType',
  checksum: 'boxes.architecture.checksum',
  file: 'boxes.architecture.file',
};

export const ISO_ARCHITECTURE_SCHEMA = {
  required: ['name'],
  properties: { name: { type: 'string' } },
};

export const ISO_ARCHITECTURE_LABELS = { name: 'boxes.architecture.name' };
