import PropTypes from 'prop-types';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { ConfigArrivalContext } from '../../../components/common/ConfigMap';
import ConfigSections, {
  countFields,
  filterSections,
} from '../../../components/common/ConfigSections';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import PageHeader from '../../../components/common/PageHeader';
import RestartCard from '../../../components/common/RestartCard';
import { useGuard } from '../../../contexts/GuardContext';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useFormRules } from '../../../hooks/useFormRules';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { log } from '../../../lib/logger';
import { patchOf, schemaSections, setValueAt, valueAt } from '../../../utils/schemaSections';

const EMPTY_CONFIG = {};
const EMPTY_SCHEMA = { properties: {} };
const EMPTY_NAMES = [];
const NO_FILTERS = [];
const PREFS_KEY = 'table_prefs_admin_config';
const SCHEMA_VERSION_POINTER = '/schemaVersion';
const clearNothing = () => undefined;

const nameOf = pointer => pointer.slice(1);

const versionOf = (config, schema) => {
  const value = valueAt(config, SCHEMA_VERSION_POINTER);
  return value === undefined ? schema.schemaVersion : value;
};

const ConfigHeading = ({ name, schema, config, ready, onUpdate }) => {
  const { t } = useTranslation();
  const subtitle = ready
    ? t('configManager.schemaVersion', { version: versionOf(config, schema) })
    : undefined;
  const update = (
    <button type="button" className="btn btn-link" onClick={onUpdate}>
      {t('configManager.buttons.update')}
    </button>
  );
  return <PageHeader title={schema?.title || name} subtitle={subtitle} actions={update} />;
};

ConfigHeading.propTypes = {
  name: PropTypes.string.isRequired,
  schema: PropTypes.object,
  config: PropTypes.object.isRequired,
  ready: PropTypes.bool.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

/**
 * The Configuration page of the admin feature: one file per route, the
 * `name` segment of `/admin/config/:name?` naming a file of the host's
 * `status.config` and `/admin/config` drawing the first, the page heading
 * the file's schema root `title` in the `PageHeader` shape (the name until
 * the schema answers) with Update as its action and the file's
 * `schemaVersion` as the muted line under it, the shared admin page
 * drawing no heading of its own above (identity contract decision 129),
 * its sections under that heading with no tab strip (identity contract
 * decisions 105 and 122); `config: []`, a missing
 * member and an adapter without `config` draw the empty state
 * `configManager.noFiles` and no Update and no Restart; the file and its
 * schema fetched together, the schema through the adapter's cached
 * `schema` the sidebar's configuration tree shares, the sections and
 * foldable subsections drawn through `ConfigSections`, their folds kept
 * per file under `table_prefs_admin_config`, and searched from
 * the navbar by title or key, every value validated through the schema on
 * blur and on Update with the summary above the sections, the URL's hash
 * read on mount and on every change as the map item the page arrived at,
 * `/admin/config/<name>#<key>`, handed through `ConfigArrivalContext` to
 * the map that holds the key, which opens its item dialog over that entry
 * and clears the hash when the dialog closes, the `PUT`
 * sending the merge patch `patchOf(before, after)` of the changed paths,
 * the refused write painted by pointer, every control id
 * `config:<name><pointer>`, the shared `RestartCard` fed by
 * `restart-status` on mount and after every write, and every `action`
 * through the adapter's `action(route, method, body)`, the restart and
 * every action running through the shell's `useGuard` so a
 * `403 step_up_required` opens the step-up dialog and retries.
 */
const AdminConfig = ({ config: configApi = null }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const guard = useGuard();
  const status = useStatus();
  const { name = '' } = useParams();
  const { hash, pathname, search } = useLocation();
  const navigate = useNavigate();
  const arrival = useMemo(
    () => ({
      key: decodeURIComponent(hash.slice(1)),
      clear: () => navigate(`${pathname}${search}`, { replace: true }),
    }),
    [hash, pathname, search, navigate]
  );
  const configNames = Array.isArray(status.config) ? status.config : EMPTY_NAMES;
  const selectedConfig = configNames.includes(name) ? name : configNames[0] || '';
  const [schemas, setSchemas] = useState({});
  const [loaded, setLoaded] = useState({ name: '', original: null, config: null });
  const [refresh, setRefresh] = useState(0);
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

AdminConfig.propTypes = {
  config: PropTypes.shape({
    get: PropTypes.func.isRequired,
    schema: PropTypes.func.isRequired,
    update: PropTypes.func.isRequired,
    restartStatus: PropTypes.func.isRequired,
    restart: PropTypes.func.isRequired,
    action: PropTypes.func.isRequired,
  }),
};

export default AdminConfig;
