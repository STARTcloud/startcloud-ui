import PropTypes from 'prop-types';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCircleInfo } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import ConfigSections from '../../../components/common/ConfigSections';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useFormRules } from '../../../hooks/useFormRules';
import { log } from '../../../lib/logger';
import { schemaSections, setValueAt } from '../../admin/utils/schemaSections';

const SETUP_KEY = 'setup';
const REDIRECT_DELAY_MS = 5000;
const PROVIDERS_POINTER = '/auth/oidc/providers';
const EMPTY = {};
const EMPTY_SCHEMA = { properties: {} };

/**
 * The app's side of the shared setup page: the setup token check, the
 * configuration files and their schemas read under that token, the write,
 * the setup status and the SSL upload.
 */
export const setupShape = PropTypes.shape({
  status: PropTypes.func.isRequired,
  verifyToken: PropTypes.func.isRequired,
  configs: PropTypes.func.isRequired,
  schemas: PropTypes.func.isRequired,
  update: PropTypes.func.isRequired,
  uploadSsl: PropTypes.func.isRequired,
});

const combinedSchema = schemas => ({
  properties: Object.fromEntries(
    Object.entries(schemas).map(([name, schema]) => [name, { ...schema, type: 'object' }])
  ),
});

const OidcInfo = () => {
  const { t } = useTranslation();
  return (
    <div className="col-12 mb-3">
      <div className="alert alert-info" role="status">
        <h6>
          <FaCircleInfo className="me-2" />
          {t('oidc.title')}
        </h6>
        <p className="mb-0">{t('setup.oidcNote')}</p>
      </div>
    </div>
  );
};

const renderMap = field =>
  field.pointer === PROVIDERS_POINTER ? <OidcInfo key={field.pointer} /> : null;

const withoutConfigsPrefix = error => ({
  fieldErrors: (error.fieldErrors || []).map(entry => ({
    ...entry,
    pointer: String(entry.pointer || '').replace(/^\/configs/, ''),
  })),
});

const tabStatusClass = ({ configName, errors, summary }) => {
  const failing = Object.keys(errors).some(name => name.startsWith(`${configName}/`));
  if (failing) {
    return 'text-danger';
  }
  return summary.length > 0 ? 'text-success' : '';
};

/**
 * The first-run setup page of an app that configures itself in the
 * browser: the setup token gate, then one tab per configuration file the
 * host's status names in `config` (`app` alone when it names none), each
 * drawn from its schema and validated through it on blur and on Submit
 * all, the summary above the tabs listing every file's errors and the
 * tab carrying one marked, a refused write's `/configs/<name>/…` pointers
 * landing on the fields they name, the SSL upload on upload fields, and
 * Submit all, which writes every file through the app's `setup` adapter
 * and sends the visitor to register.
 */
const SetupPage = ({ setup }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const navigate = useNavigate();
  const status = useStatus();
  const configNames = status.config || ['app'];
  const [configs, setConfigs] = useState(EMPTY);
  const [schemas, setSchemas] = useState(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [setupToken, setSetupToken] = useState('');
  const [authorizedSetupToken, setAuthorizedSetupToken] = useState('');
  const [activeTab, setActiveTab] = useState(configNames[0]);
  const schema = useMemo(() => (schemas ? combinedSchema(schemas) : EMPTY_SCHEMA), [schemas]);
  const sectionsByName = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(schemas || {}).map(([name, entry]) => [name, schemaSections(entry)])
      ),
    [schemas]
  );
  const rules = useFormRules({ schema, values: configs, idPrefix: 'setup' });

  useEffect(() => {
    document.title = t('setup.title');
  }, [t]);

  useEffect(() => {
    setup
      .status()
      .then(setupStatus => setSetupComplete(setupStatus.setupComplete))
      .catch(error => {
        log.api.error('Error checking setup status', { error: error.message });
      });
  }, [setup]);

  const handleVerifyToken = () => {
    setup
      .verifyToken(setupToken)
      .then(verified =>
        Promise.all([
          setup.configs(verified.authorizedSetupToken),
          setup.schemas(verified.authorizedSetupToken),
        ]).then(([data, schemaData]) => {
          setAuthorizedSetupToken(verified.authorizedSetupToken);
          setConfigs(data.configs);
          setSchemas(schemaData.schemas);
        })
      )
      .catch(error => {
        log.api.error('Error verifying setup token', { error: error.message });
        notify('danger', t('setup.invalidToken'));
      });
  };

  const handleConfigChange = (configName, pointer, value) => {
    setConfigs(previous => ({
      ...previous,
      [configName]: setValueAt(previous[configName], pointer, value),
    }));
  };

  const handleFileUpload = (configName, pointer, file) => {
    if (!file) {
      return;
    }
    setup
      .uploadSsl(authorizedSetupToken, file)
      .then(({ path: storedPath }) => {
        handleConfigChange(configName, pointer, storedPath);
        notify('success', t('admin.messages.operationSuccessful'));
      })
      .catch(error => {
        log.api.error('Error uploading SSL file', { error: error.message });
        notify('danger', t('admin.messages.uploadFailed'));
      });
  };

  const handleSubmit = () => {
    if (!rules.validateAll()) {
      return;
    }
    setup
      .update(authorizedSetupToken, configs)
      .then(() => {
        notify('success', t('setup.updateSuccess'), { key: SETUP_KEY, sticky: true });
        setTimeout(() => {
          notify('', '', { key: SETUP_KEY });
          navigate('/register');
        }, REDIRECT_DELAY_MS);
      })
      .catch(error => {
        if (rules.applyServerErrors(withoutConfigsPrefix(error))) {
          return;
        }
        log.api.error('Error updating configuration', { error: error.message });
        notify('danger', t('setup.updateError'));
      });
  };

  const renderBody = () => {
    if (setupComplete) {
      return (
        <div className="alert alert-success" role="status">
          {t('setup.alreadyComplete')}
        </div>
      );
    }
    if (!authorizedSetupToken) {
      return (
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">{t('setup.enterToken')}</h5>
            <div className="input-group mb-3">
              <input
                type="text"
                className="form-control"
                placeholder={t('setup.tokenPlaceholder')}
                value={setupToken}
                onChange={e => setSetupToken(e.target.value)}
              />
              <button type="button" className="btn btn-primary" onClick={handleVerifyToken}>
                {t('setup.verifyToken')}
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div>
        <ul className="nav nav-tabs mb-4 d-flex">
          {configNames.map(configName => (
            <li className="nav-item" key={configName}>
              <button
                type="button"
                className={`nav-link ${activeTab === configName ? 'active' : ''} ${tabStatusClass({
                  configName,
                  errors: rules.errors,
                  summary: rules.summary,
                })}`}
                onClick={() => setActiveTab(configName)}
              >
                {t(`configManager.tabs.${configName}`)}
              </button>
            </li>
          ))}
          <li className="nav-item ms-auto">
            <button type="button" className="nav-link cursor-pointer" onClick={handleSubmit}>
              {t('setup.submitAll')}
            </button>
          </li>
        </ul>

        <FormErrorSummary errors={rules.summary} />

        <div className="tab-content">
          {configNames.map(configName => (
            <div
              key={configName}
              className={`tab-pane ${activeTab === configName ? 'active' : ''}`}
            >
              <ConfigSections
                sections={sectionsByName[configName] || []}
                config={configs[configName] || EMPTY}
                rules={rules}
                nameFor={pointer => `${configName}${pointer}`}
                onChange={(pointer, value) => handleConfigChange(configName, pointer, value)}
                onUpload={(pointer, file) => handleFileUpload(configName, pointer, file)}
                renderMap={renderMap}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4">{t('setup.title')}</h2>
      {renderBody()}
    </div>
  );
};

SetupPage.propTypes = {
  setup: setupShape.isRequired,
};

export default SetupPage;
