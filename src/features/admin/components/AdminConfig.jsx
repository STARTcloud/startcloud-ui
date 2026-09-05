import PropTypes from 'prop-types';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaEnvelopeOpenText } from 'react-icons/fa6';

import ConfigSections, {
  countFields,
  filterSections,
} from '../../../components/common/ConfigSections';
import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useFormRules } from '../../../hooks/useFormRules';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { log } from '../../../lib/logger';
import { responseMessage } from '../../../utils/responseMessage';
import { schemaSections, setValueAt, valueAt } from '../utils/schemaSections';

import OidcProviders from './OidcProviders';

const SMTP_TEST_KEY = 'smtp-test';
const PROVIDERS_POINTER = '/auth/oidc/providers';
const EMPTY_CONFIG = {};
const EMPTY_SCHEMA = { properties: {} };

const NO_FILTERS = [];
const clearNothing = () => undefined;
const SMTP_TEST_SCHEMA = {
  required: ['email'],
  properties: { email: { $ref: '#/$defs/email' } },
};
const SMTP_TEST_LABELS = { email: 'configManager.smtpTest.recipient' };
const EMPTY_SMTP_TEST = { email: '' };

const SmtpTest = ({ onTest }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY_SMTP_TEST);
  const rules = useFormRules({
    schema: SMTP_TEST_SCHEMA,
    values: form,
    labels: SMTP_TEST_LABELS,
    idPrefix: 'smtp-test',
  });
  const send = event => {
    event.preventDefault();
    if (rules.validateAll()) {
      onTest(form.email);
    }
  };
  return (
    <div className="card mb-4">
      <div className="card-header">
        <h5 className="mb-0">
          <FaEnvelopeOpenText className="me-2" />
          {t('configManager.smtpTest.title')}
        </h5>
      </div>
      <div className="card-body">
        <form onSubmit={send} noValidate>
          <FormErrorSummary errors={rules.summary} />
          <Field
            id={rules.idFor('email')}
            label={t('configManager.smtpTest.recipient')}
            hint={t('configManager.smtpTest.hint')}
            error={rules.errors.email || ''}
          >
            {aria => (
              <div className="input-group">
                <input
                  {...aria}
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={e => setForm({ email: e.target.value })}
                  onBlur={() => rules.onBlur('email')}
                  placeholder={t('configManager.smtpTest.placeholder')}
                />
                <button className="btn btn-outline-primary" type="submit">
                  {t('configManager.smtpTest.send')}
                </button>
              </div>
            )}
          </Field>
        </form>
      </div>
    </div>
  );
};

SmtpTest.propTypes = {
  onTest: PropTypes.func.isRequired,
};

const nameOf = pointer => pointer.slice(1);

/**
 * The Configuration tab of the admin page: one tab per configuration file
 * the host's status names in `config` (`app` alone when it names none),
 * the file and its schema fetched together, the sections and foldable
 * subsections drawn from the schema and searched from the navbar by title
 * or key, every value validated through the schema on blur and on Update
 * with the summary above the sections, the refused write painted by
 * pointer, the restart notice from the 200's `requiresRestart`, the OIDC
 * providers block over `additionalProperties` of `auth.oidc.providers`,
 * update and restart, the SSL upload on upload fields and the SMTP test on
 * mail, every call through the app's `config` adapter.
 */
const AdminConfig = ({ config: configApi }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const status = useStatus();
  const configNames = status.config || ['app'];
  const [selectedConfig, setSelectedConfig] = useState(configNames[0]);
  const [loaded, setLoaded] = useState({ name: '', config: null, schema: null });
  const [searchTerm, setSearchTerm] = useState('');
  const ready = loaded.name === selectedConfig && loaded.config && loaded.schema;
  const config = ready ? loaded.config : EMPTY_CONFIG;
  const schema = ready ? loaded.schema : EMPTY_SCHEMA;
  const rules = useFormRules({ schema, values: config, idPrefix: `config-${selectedConfig}` });
  const { reset } = rules;

  const fetchConfig = useCallback(
    configName => {
      Promise.all([configApi.get(configName), configApi.schema(configName)]).then(
        ([file, fileSchema]) => {
          setLoaded({ name: configName, config: file, schema: fileSchema });
          reset();
        },
        error => {
          log.api.error('Error fetching config', {
            configName,
            error: error.message,
          });
        }
      );
    },
    [configApi, reset]
  );

  useEffect(() => {
    fetchConfig(selectedConfig);
  }, [selectedConfig, fetchConfig]);

  const sections = useMemo(() => schemaSections(schema), [schema]);

  const handleFieldChange = (pointer, value) => {
    setLoaded(current => ({ ...current, config: setValueAt(current.config, pointer, value) }));
  };

  const afterWrite = (configName, data) => {
    notify('success', t('configManager.updateSuccess'));
    if (data?.requiresRestart) {
      notify('warning', t('configManager.restartNeeded'));
    }
    fetchConfig(configName);
  };

  const updateConfig = () => {
    if (!rules.validateAll()) {
      return;
    }
    configApi.update(selectedConfig, config).then(
      data => afterWrite(selectedConfig, data),
      error => {
        if (rules.applyServerErrors(error)) {
          return;
        }
        log.component.error('Error updating config', {
          configName: selectedConfig,
          error: error.message,
        });
        notify('danger', t('configManager.updateError'));
      }
    );
  };

  const handleProvidersUpdate = providers =>
    configApi
      .update(selectedConfig, setValueAt(config, PROVIDERS_POINTER, providers))
      .then(data => afterWrite(selectedConfig, data));

  const handleTestSmtp = testEmail => {
    notify('info', t('configManager.testingSmtp'), { key: SMTP_TEST_KEY });
    configApi
      .testSmtp(testEmail)
      .then(data => {
        notify('success', data.message || t('configManager.testSmtpSuccess'), {
          key: SMTP_TEST_KEY,
        });
      })
      .catch(error => {
        const resMessage = responseMessage(error, error.message || error.toString());
        notify('danger', `${t('configManager.testSmtpError')}: ${resMessage}`, {
          key: SMTP_TEST_KEY,
        });
      });
  };

  const handleFileUpload = async (pointer, file) => {
    const targetPath = valueAt(config, pointer);
    if (!file || !targetPath) {
      return;
    }

    try {
      await configApi.uploadSsl(file, targetPath);
      notify(
        'success',
        `${t('admin.messages.operationSuccessful')}. ${t('configManager.restartInitiated')}`
      );
    } catch (error) {
      log.component.error('Error uploading file', { error: error.message });
      notify('danger', t('admin.messages.uploadFailed'));
    }
  };

  const restart = () => {
    configApi
      .restart()
      .then(() => {
        notify('success', t('configManager.restartInitiated'));
      })
      .catch(() => {
        notify('danger', t('configManager.restartFailed'));
      });
  };

  const renderMap = field =>
    field.pointer === PROVIDERS_POINTER ? (
      <div key={field.pointer} className="col-12">
        <OidcProviders
          providers={valueAt(config, field.pointer) || {}}
          schema={field.additionalProperties}
          onProvidersUpdate={handleProvidersUpdate}
        />
      </div>
    ) : null;

  const visibleSections = filterSections(sections, searchTerm.toLowerCase());
  const hasErrors = Object.keys(rules.errors).length > 0;

  useNavbarSearchBinding({
    query: searchTerm,
    onQueryChange: setSearchTerm,
    placeholder: t('configManager.search'),
    matched: countFields(visibleSections),
    total: countFields(sections),
    groups: NO_FILTERS,
    onClearFilters: clearNothing,
  });

  return (
    <div className="mt-5">
      <ul className="nav nav-tabs d-flex">
        {configNames.map(configName => (
          <li className="nav-item" key={configName}>
            <button
              type="button"
              className={`nav-link ${selectedConfig === configName ? 'active' : ''} ${
                selectedConfig === configName && hasErrors ? 'text-danger' : ''
              }`}
              onClick={() => setSelectedConfig(configName)}
            >
              {t(`configManager.tabs.${configName}`)}
            </button>
          </li>
        ))}
        <li className="nav-item ms-auto">
          <button type="button" className="nav-link cursor-pointer" onClick={updateConfig}>
            {t('configManager.buttons.update')}
          </button>
        </li>
        <li className="nav-item">
          <button type="button" className="nav-link" onClick={restart}>
            {t('configManager.buttons.restart')}
          </button>
        </li>
      </ul>
      <div className="config-container mt-3">
        <FormErrorSummary errors={rules.summary} />
        {searchTerm !== '' && visibleSections.length === 0 && (
          <div className="alert alert-info">{t('pages.noMatches')}</div>
        )}
        {ready ? (
          <ConfigSections
            sections={visibleSections}
            config={config}
            rules={rules}
            nameFor={nameOf}
            onChange={handleFieldChange}
            onUpload={handleFileUpload}
            renderMap={renderMap}
          />
        ) : (
          <p>{t('loading')}</p>
        )}
        {selectedConfig === 'mail' && <SmtpTest onTest={handleTestSmtp} />}
      </div>
    </div>
  );
};

AdminConfig.propTypes = {
  config: PropTypes.shape({
    get: PropTypes.func.isRequired,
    schema: PropTypes.func.isRequired,
    update: PropTypes.func.isRequired,
    restart: PropTypes.func.isRequired,
    testSmtp: PropTypes.func.isRequired,
    uploadSsl: PropTypes.func.isRequired,
  }).isRequired,
};

export default AdminConfig;
