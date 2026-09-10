import PropTypes from 'prop-types';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import ConfigSections from '../../../components/common/ConfigSections';
import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useFormRules } from '../../../hooks/useFormRules';
import { log } from '../../../lib/logger';
import { hasFeature } from '../../../utils/capabilities';
import { patchOf, schemaSections, setValueAt } from '../../../utils/schemaSections';

const EMPTY = {};
const EMPTY_SCHEMA = { properties: {} };
const EMPTY_NAMES = [];
const TOKEN_ID = 'setup-token';

/**
 * The app's side of the shared setup page: the setup status, the token
 * check, the configuration files and their schemas read under that token,
 * the write of every file's merge patch, and the one
 * `action(token, route, method, body)` every schema-declared action calls.
 */
export const setupShape = PropTypes.shape({
  status: PropTypes.func.isRequired,
  verify: PropTypes.func.isRequired,
  get: PropTypes.func.isRequired,
  schema: PropTypes.func.isRequired,
  update: PropTypes.func.isRequired,
  action: PropTypes.func.isRequired,
});

const combinedSchema = schemas => ({
  properties: Object.fromEntries(
    Object.entries(schemas).map(([name, schema]) => [name, { ...schema, type: 'object' }])
  ),
});

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

const patchesOf = (originals, configs, names) =>
  Object.fromEntries(
    names.map(name => [name, patchOf(originals[name] || EMPTY, configs[name] || EMPTY)])
  );

/**
 * The first-run setup page of an app that configures itself in the
 * browser: the gate is `setup_complete`, and when it is true the page
 * draws `setup.complete` with one link, to `/login` on a backend with
 * accounts and to `/` otherwise, and neither the token card nor the tabs;
 * then the token card, whose 403 paints `setup.tokenInvalid` on the token
 * field and whose 204 keeps the token the page sent as the bearer of every
 * later call; then one tab per configuration file the host's status names
 * in `config`, labelled by its schema's root `title`, each drawn from its
 * schema and validated through it on blur and on Submit all, the summary
 * above the tabs listing every file's errors and the tab carrying one
 * marked, a refused write's `/configs/<name>/…` pointers landing on the
 * fields they name, every action through the one upload route, and Submit
 * all, which writes every file's merge patch through the app's `setup`
 * adapter and draws the complete state on 200.
 */
const SetupPage = ({ setup }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const status = useStatus();
  const configNames = Array.isArray(status.config) ? status.config : EMPTY_NAMES;
  const [phase, setPhase] = useState('loading');
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [originals, setOriginals] = useState(EMPTY);
  const [configs, setConfigs] = useState(EMPTY);
  const [schemas, setSchemas] = useState(null);
  const [activeTab, setActiveTab] = useState(configNames[0] || '');
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
    let mounted = true;
    setup
      .status()
      .then(setupStatus => {
        if (mounted) {
          setPhase(setupStatus.setup_complete ? 'complete' : 'token');
        }
      })
      .catch(error => {
        log.api.error('Error checking setup status', { error: error.message });
      });
    return () => {
      mounted = false;
    };
  }, [setup]);

  const verifyToken = event => {
    event.preventDefault();
    if (!token) {
      setTokenError(t('validation.required', { label: t('setup.token') }));
      return;
    }
    setTokenError('');
    setup
      .verify(token)
      .then(() => Promise.all([setup.get(token), setup.schema(token)]))
      .then(([data, schemaData]) => {
        setOriginals(data.configs || EMPTY);
        setConfigs(data.configs || EMPTY);
        setSchemas(schemaData.schemas || EMPTY);
        setPhase('form');
      })
      .catch(error => {
        if (error.status === 403) {
          setTokenError(t('setup.tokenInvalid'));
          return;
        }
        if (error.status === 404) {
          setPhase('complete');
          return;
        }
        log.api.error('Error verifying setup token', { error: error.message });
        notify('danger', t(error.messageKey || 'errors.request'));
      });
  };

  const handleConfigChange = (configName, pointer, value) => {
    setConfigs(previous => ({
      ...previous,
      [configName]: setValueAt(previous[configName], pointer, value),
    }));
  };

  const handleSubmit = () => {
    if (!rules.validateAll()) {
      return;
    }
    setup
      .update(token, patchesOf(originals, configs, configNames))
      .then(() => {
        notify('success', t('setup.updateSuccess'));
        setPhase('complete');
      })
      .catch(error => {
        if (rules.applyServerErrors(withoutConfigsPrefix(error))) {
          return;
        }
        log.api.error('Error updating configuration', { error: error.message });
        notify('danger', t(error.messageKey || 'errors.request'));
      });
  };

  const callAction = (route, method, body) => setup.action(token, route, method, body);

  const renderComplete = () => {
    const accounts = hasFeature(status, 'local-accounts');
    return (
      <div className="alert alert-success" role="status">
        {t('setup.complete')}{' '}
        <a href={accounts ? '/login' : '/'} className="alert-link">
          {accounts ? t('setup.signIn') : t('setup.home')}
        </a>
      </div>
    );
  };

  const renderToken = () => (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">{t('setup.enterToken')}</h5>
        <form onSubmit={verifyToken} noValidate>
          <Field id={TOKEN_ID} label={t('setup.token')} error={tokenError} required>
            {aria => (
              <div className="input-group">
                <input
                  {...aria}
                  type="text"
                  className="form-control"
                  value={token}
                  onChange={event => setToken(event.target.value)}
                />
                <button type="submit" className="btn btn-primary">
                  {t('setup.verifyToken')}
                </button>
              </div>
            )}
          </Field>
        </form>
      </div>
    </div>
  );

  const renderForm = () => (
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
              {schemas?.[configName]?.title || configName}
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

      {configNames.length === 0 ? (
        <div className="alert alert-info" role="status">
          {t('configManager.noFiles')}
        </div>
      ) : null}

      <div className="tab-content">
        {configNames.map(configName => (
          <div key={configName} className={`tab-pane ${activeTab === configName ? 'active' : ''}`}>
            <ConfigSections
              sections={sectionsByName[configName] || []}
              config={configs[configName] || EMPTY}
              rules={rules}
              nameFor={pointer => `${configName}${pointer}`}
              onChange={(pointer, value) => handleConfigChange(configName, pointer, value)}
              callAction={callAction}
            />
          </div>
        ))}
      </div>
    </div>
  );

  const renderBody = () => {
    if (phase === 'loading') {
      return <p>{t('loading')}</p>;
    }
    if (phase === 'complete') {
      return renderComplete();
    }
    return phase === 'token' ? renderToken() : renderForm();
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
