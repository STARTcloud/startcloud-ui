import PropTypes from 'prop-types';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useGuard } from '../../contexts/GuardContext';
import { useNotify } from '../../contexts/NoticeContext';
import { useStatus } from '../../contexts/StatusContext';
import { useFormRules } from '../../hooks/useFormRules';
import { useNavbarSearchBinding } from '../../hooks/useSearchBinding';
import { log } from '../../lib/logger';
import { patchOf, schemaSections, setValueAt, valueAt } from '../../utils/schemaSections';

import { ConfigArrivalContext } from './ConfigMap';
import ConfigSections, { countFields, filterSections } from './ConfigSections';
import ConfirmModal from './ConfirmModal';
import FormErrorSummary from './FormErrorSummary';
import PageHeader from './PageHeader';
import RestartCard from './RestartCard';

const STEP_UP_REQUIRED = 'step_up_required';

const EMPTY_CONFIG = {};
const EMPTY_SCHEMA = { properties: {} };
const EMPTY_NAMES = [];
const NO_FILTERS = [];
const PREFS_KEY = 'table_prefs_admin_config';
const SCHEMA_VERSION_POINTER = '/schemaVersion';
const clearNothing = () => undefined;

const nameOf = pointer => pointer.slice(1);

const namesOf = (names, status) =>
  names || (Array.isArray(status.config) ? status.config : EMPTY_NAMES);

const selectedOf = (configNames, wanted) =>
  configNames.includes(wanted) ? wanted : configNames[0] || '';

const versionOf = (config, schema) => {
  const value = valueAt(config, SCHEMA_VERSION_POINTER);
  return value === undefined ? schema.schemaVersion : value;
};

const ConfigHeading = ({ name, schema, config, ready, onUpdate, onRestart }) => {
  const { t } = useTranslation();
  const subtitle = ready
    ? t('configManager.schemaVersion', { version: versionOf(config, schema) })
    : undefined;
  const actions = (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline-warning"
        data-action="config-restart"
        onClick={onRestart}
      >
        {t('configManager.restart.button')}
      </button>
      <button type="button" className="btn btn-sm btn-primary" onClick={onUpdate}>
        {t('configManager.buttons.update')}
      </button>
    </>
  );
  return <PageHeader title={schema?.title || name} subtitle={subtitle} actions={actions} />;
};

ConfigHeading.propTypes = {
  name: PropTypes.string.isRequired,
  schema: PropTypes.object,
  config: PropTypes.object.isRequired,
  ready: PropTypes.bool.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onRestart: PropTypes.func.isRequired,
};

/**
 * The shared configuration page: one configuration file drawn from its
 * served schema and written back as a merge patch.
 *
 * It takes `config`, the adapter `{ get, schema, update, restartStatus,
 * restart, action }`; `names`, the files that may be drawn, the host's
 * `status.config` when absent; and `name`, the file drawn, the route's
 * `name` segment when absent, the first of `names` when neither names a
 * listed file. It draws the file's schema root `title` as the page
 * heading with Restart and Update as its actions and the file's
 * `schemaVersion` as the muted line under it, the `RestartCard` fed by
 * `restartStatus`, the sections through `ConfigSections` with their folds
 * under `table_prefs_admin_config`, searched from the navbar; every value
 * is validated through the schema on blur and on Update, the `PUT` sends
 * `patchOf(before, after)`, a refused write is painted by pointer, the
 * URL's hash opens the map item it names, Restart is offered at all times
 * behind the typed confirmation, the card naming what is pending, and the
 * restart and every schema action run through the shell's `useGuard`, so
 * a `403 step_up_required` opens the step-up dialog and retries.
 *
 * Caveat: with no adapter or no file it draws the `configManager.noFiles`
 * notice alone, no Update and no Restart.
 *
 * @param {Object} props
 * @param {Object|null} [props.config] - The configuration adapter
 * @param {Array<string>|null} [props.names] - The files that may be drawn
 * @param {string|null} [props.name] - The file drawn
 * @returns {import('react').ReactElement} The page
 */
const ConfigPage = ({ config: configApi = null, names = null, name = null }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const guard = useGuard();
  const status = useStatus();
  const { name: routeName = '' } = useParams();
  const { hash, pathname, search } = useLocation();
  const navigate = useNavigate();
  const arrival = useMemo(
    () => ({
      key: decodeURIComponent(hash.slice(1)),
      clear: () => navigate(`${pathname}${search}`, { replace: true }),
    }),
    [hash, pathname, search, navigate]
  );
  const configNames = namesOf(names, status);
  const selectedConfig = selectedOf(configNames, name ?? routeName);
  const [schemas, setSchemas] = useState({});
  const [loaded, setLoaded] = useState({ name: '', original: null, config: null });
  const [refresh, setRefresh] = useState(0);
  const [restarting, setRestarting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const schema = schemas[selectedConfig] || null;
  const ready = Boolean(configApi && schema && loaded.name === selectedConfig && loaded.config);
  const config = ready ? loaded.config : EMPTY_CONFIG;
  const rules = useFormRules({
    schema: schema || EMPTY_SCHEMA,
    values: config,
    idPrefix: `config:${selectedConfig}`,
  });
  const { reset } = rules;

  useEffect(() => {
    if (!configApi || !selectedConfig) {
      return undefined;
    }
    let mounted = true;
    configApi.schema(selectedConfig).then(
      fileSchema => {
        if (mounted) {
          setSchemas(current => ({ ...current, [selectedConfig]: fileSchema }));
        }
      },
      error => {
        log.api.error('Error fetching config schema', {
          configName: selectedConfig,
          error: error.message,
        });
      }
    );
    return () => {
      mounted = false;
    };
  }, [configApi, selectedConfig]);

  const fetchConfig = useCallback(
    configName => {
      if (!configApi || !configName) {
        return;
      }
      configApi.get(configName).then(
        file => {
          setLoaded({ name: configName, original: file, config: file });
          reset();
        },
        error => {
          log.api.error('Error fetching config', { configName, error: error.message });
        }
      );
    },
    [configApi, reset]
  );

  useEffect(() => {
    fetchConfig(selectedConfig);
  }, [selectedConfig, fetchConfig]);

  const sections = useMemo(() => schemaSections(schema || EMPTY_SCHEMA), [schema]);

  const handleFieldChange = (pointer, value) => {
    setLoaded(current => ({ ...current, config: setValueAt(current.config, pointer, value) }));
  };

  const updateConfig = () => {
    if (!rules.validateAll()) {
      return;
    }
    configApi.update(selectedConfig, patchOf(loaded.original, config)).then(
      () => {
        notify('success', t('configManager.updateSuccess'));
        setRefresh(current => current + 1);
        fetchConfig(selectedConfig);
      },
      error => {
        if (rules.applyServerErrors(error)) {
          return;
        }
        log.component.error('Error updating config', {
          configName: selectedConfig,
          error: error.message,
        });
        notify('danger', t(error.messageKey || 'errors.request'));
      }
    );
  };

  const restartApp = () => {
    setRestarting(false);
    guard(configApi.restart)
      .then(() => {
        notify('success', t('configManager.restarting'));
        setRefresh(current => current + 1);
      })
      .catch(error => {
        if (error?.code !== STEP_UP_REQUIRED) {
          notify('danger', t(error?.messageKey || 'errors.request'));
        }
      });
  };

  const visibleSections = filterSections(sections, searchTerm.toLowerCase());

  useNavbarSearchBinding({
    query: searchTerm,
    onQueryChange: setSearchTerm,
    placeholder: t('configManager.search'),
    matched: countFields(visibleSections),
    total: countFields(sections),
    groups: NO_FILTERS,
    onClearFilters: clearNothing,
  });

  if (!configApi || configNames.length === 0) {
    return (
      <div className="mt-5">
        <div className="alert alert-info" role="status">
          {t('configManager.noFiles')}
        </div>
      </div>
    );
  }

  return (
    <div>
      <ConfigHeading
        name={selectedConfig}
        schema={schema}
        config={config}
        ready={ready}
        onUpdate={updateConfig}
        onRestart={() => setRestarting(true)}
      />
      <ConfirmModal
        show={restarting}
        handleClose={() => setRestarting(false)}
        handleConfirm={restartApp}
        variant="restart"
      />
      <div className="config-container">
        <RestartCard
          restartStatus={configApi.restartStatus}
          restart={configApi.restart}
          refresh={refresh}
          guard={guard}
        />
        <FormErrorSummary errors={rules.summary} />
        {searchTerm !== '' && visibleSections.length === 0 && (
          <div className="alert alert-info">{t('pages.noMatches')}</div>
        )}
        {ready ? (
          <ConfigArrivalContext.Provider value={arrival}>
            <ConfigSections
              sections={visibleSections}
              config={config}
              rules={rules}
              nameFor={nameOf}
              onChange={handleFieldChange}
              callAction={configApi.action}
              guard={guard}
              prefsKey={PREFS_KEY}
              foldKey={`${selectedConfig}/`}
            />
          </ConfigArrivalContext.Provider>
        ) : (
          <p>{t('loading')}</p>
        )}
      </div>
    </div>
  );
};

ConfigPage.propTypes = {
  config: PropTypes.shape({
    get: PropTypes.func.isRequired,
    schema: PropTypes.func.isRequired,
    update: PropTypes.func.isRequired,
    restartStatus: PropTypes.func.isRequired,
    restart: PropTypes.func.isRequired,
    action: PropTypes.func.isRequired,
  }),
  names: PropTypes.arrayOf(PropTypes.string),
  name: PropTypes.string,
};

export default ConfigPage;
