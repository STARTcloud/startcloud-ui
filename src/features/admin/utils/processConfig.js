import PropTypes from 'prop-types';

import { generateLabel } from '../../../utils/configLabel';

/**
 * The app's side of the shared admin page: the organizations with their
 * members and the suspend, resume, rename, edit and delete calls over
 * them, the configuration files with restart, SMTP test and SSL upload,
 * the storage usage and the update check.
 */
export const adminShape = PropTypes.shape({
  organizationsWithUsers: PropTypes.func.isRequired,
  organization: PropTypes.func.isRequired,
  updateOrganization: PropTypes.func.isRequired,
  accessMode: PropTypes.func.isRequired,
  suspendOrganization: PropTypes.func.isRequired,
  resumeOrganization: PropTypes.func.isRequired,
  removeOrganization: PropTypes.func.isRequired,
  removeMember: PropTypes.func.isRequired,
  removeUser: PropTypes.func.isRequired,
  suspendUser: PropTypes.func.isRequired,
  resumeUser: PropTypes.func.isRequired,
  gravatarProfile: PropTypes.func.isRequired,
  config: PropTypes.shape({
    get: PropTypes.func.isRequired,
    update: PropTypes.func.isRequired,
    restart: PropTypes.func.isRequired,
    testSmtp: PropTypes.func.isRequired,
    uploadSsl: PropTypes.func.isRequired,
  }).isRequired,
  storage: PropTypes.func.isRequired,
  updateStatus: PropTypes.func.isRequired,
});

const SECTION_MAPS = {
  auth: {
    auth: 'authentication',
    jwt: 'authentication',
    local: 'authentication',
    external: 'authentication',
    oidc: 'authentication',
    oidc_providers: 'authentication',
  },
  app: {
    boxvault: 'application',
    gravatar: 'application',
    ssl: 'application',
  },
  db: {
    sql: 'database',
    mysql_pool: 'database',
    database_type: 'database',
  },
  mail: {
    smtp_connect: 'mail',
    smtp_settings: 'mail',
    smtp_auth: 'mail',
  },
};

export const inferSectionKey = (path, configType) => {
  const sectionMap = SECTION_MAPS[configType] || {};
  const pathParts = path.split('.');
  return sectionMap[pathParts[0]] || sectionMap[pathParts[1]] || configType || 'general';
};

const normalizeSubsectionKey = key => {
  if (!key) {
    return key;
  }
  return key
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(?<chr>.)?/g, ([, chr]) => (chr ? chr.toUpperCase() : ''));
};

const initializeSection = (organizedSections, sectionKey) => {
  if (!organizedSections[sectionKey]) {
    organizedSections[sectionKey] = {
      key: sectionKey,
      description: '',
      fields: [],
      subsections: {},
    };
  }
};

const initializeSubsection = (organizedSections, sectionKey, subsectionKey) => {
  if (subsectionKey && !organizedSections[sectionKey].subsections[subsectionKey]) {
    organizedSections[sectionKey].subsections[subsectionKey] = {
      key: subsectionKey,
      fields: [],
    };
  }
};

const createFieldData = (key, fullPath, value) => ({
  key: fullPath,
  path: fullPath,
  type: value.type,
  label: generateLabel(key),
  description: value.description || '',
  placeholder: value.placeholder || '',
  required: value.required || false,
  options: value.options || null,
  order: value.order || 0,
  value: value.value,
  upload: value.upload || false,
});

const processConfigValue = options => {
  const {
    key,
    value,
    fullPath,
    configType,
    sectionName,
    extractedValues,
    organizedSections,
    processObject,
  } = options;

  extractedValues[fullPath] = value.value;

  const sectionKey = value.section || inferSectionKey(fullPath, configType) || sectionName;
  const subsectionKey = value.subsection_key || normalizeSubsectionKey(value.subsection);

  initializeSection(organizedSections, sectionKey);

  const fieldData = createFieldData(key, fullPath, value);

  if (value.type === 'object' && value.value && typeof value.value === 'object') {
    initializeSubsection(organizedSections, sectionKey, subsectionKey);
    processObject(value.value, fullPath, sectionKey);
  } else if (subsectionKey) {
    initializeSubsection(organizedSections, sectionKey, subsectionKey);
    organizedSections[sectionKey].subsections[subsectionKey].fields.push(fieldData);
  } else {
    organizedSections[sectionKey].fields.push(fieldData);
  }
};

const processProvidersObject = (
  value,
  fullPath,
  configType,
  sectionName,
  organizedSections,
  processObject
) => {
  const sectionKey = value.section || inferSectionKey(fullPath, configType) || sectionName;
  const subsectionKey = value.subsection_key || normalizeSubsectionKey(value.subsection);

  initializeSection(organizedSections, sectionKey);
  initializeSubsection(organizedSections, sectionKey, subsectionKey);

  processObject(value.providers, `${fullPath}.providers`, sectionKey);
};

/**
 * Walk one configuration file's tree into the values keyed by dotted path
 * and the sections, each with its fields and subsections, that the admin
 * page draws.
 * @param {Object} configData - The configuration tree the backend answers
 * @param {string} configType - `app`, `auth`, `db` or `mail`
 * @returns {{ extractedValues: Object, organizedSections: Object }}
 */
export const processConfig = (configData, configType) => {
  const extractedValues = {};
  const organizedSections = {};

  const processObject = (obj, path = '', sectionName = 'general') => {
    for (const [key, value] of Object.entries(obj || {})) {
      const fullPath = path ? `${path}.${key}` : key;

      const hasTypeAndValue =
        value && typeof value === 'object' && value.type && Object.hasOwn(value, 'value');

      const hasTypeAndProviders =
        value && typeof value === 'object' && value.type && Object.hasOwn(value, 'providers');

      const isPlainObject =
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !Object.hasOwn(value, 'type');

      if (hasTypeAndValue) {
        processConfigValue({
          key,
          value,
          fullPath,
          configType,
          sectionName,
          extractedValues,
          organizedSections,
          processObject,
        });
      } else if (hasTypeAndProviders) {
        processProvidersObject(
          value,
          fullPath,
          configType,
          sectionName,
          organizedSections,
          processObject
        );
      } else if (isPlainObject) {
        const inferredSection = inferSectionKey(fullPath, configType) || sectionName;
        processObject(value, fullPath, inferredSection);
      }
    }
  };

  processObject(configData);

  Object.values(organizedSections).forEach(section => {
    section.fields.sort((a, b) => (a.order || 0) - (b.order || 0));
    Object.values(section.subsections).forEach(subsection => {
      subsection.fields.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
  });

  return { extractedValues, organizedSections };
};
