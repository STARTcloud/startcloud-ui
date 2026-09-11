import PropTypes from 'prop-types';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import ConfigSections, {
  countFields,
  filterSections,
} from '../../../components/common/ConfigSections';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import RestartCard from '../../../components/common/RestartCard';
import { useGuard } from '../../../contexts/GuardContext';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useFormRules } from '../../../hooks/useFormRules';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { log } from '../../../lib/logger';
import { patchOf, schemaSections, setValueAt } from '../../../utils/schemaSections';

const EMPTY_CONFIG = {};
const EMPTY_SCHEMA = { properties: {} };
const EMPTY_NAMES = [];
const NO_FILTERS = [];
const clearNothing = () => undefined;

const nameOf = pointer => pointer.slice(1);

/**
 * The Configuration page of the admin feature: one tab per name in the
 * host's `status.config`, labelled by the file's schema root `title`, no
 * tab strip while the names number one, Update alone in its place;
 * `config: []`, a missing member and an adapter without `config` draw the
 * empty state `configManager.noFiles` and no tab, no Update and no
 * Restart; the selected file and its schema fetched together, the sections
 * and foldable subsections drawn through `ConfigSections` and searched
 * from the navbar by title or key, every value validated through the
 * schema on blur and on Update with the summary above the sections, the
 * `PUT` sending the merge patch `patchOf(before, after)` of the changed
 * paths, the refused write painted by pointer, the tab that carries an
 * error marked, every control id `config:<name><pointer>`, the shared
 * `RestartCard` fed by `restart-status` on mount and after every write,
 * and every `action` through the adapter's `action(route, method, body)`,
 * the restart and every action running through the shell's `useGuard` so a
 * `403 step_up_required` opens the step-up dialog and retries.
 */
const AdminConfig = ({ config: configApi = null }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const guard = useGuard();
  const status = useStatus();
  const configNames = Array.isArray(status.config) ? status.config : EMPTY_NAMES;
  const [selectedConfig, setSelectedConfig] = useState(configNames[0] || '');
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
    if (!configApi) {
      return undefined;
    }
    let mounted = true;
    configNames.forEach(configName => {
      configApi.schema(configName).then(
        fileSchema => {
          if (mounted) {
            setSchemas(current => ({ ...current, [configName]: fileSchema }));
          }
        },
        error => {
          log.api.error('Error fetching config schema', { configName, error: error.message });
        }
      );
    });
    return () => {
      mounted = false;
    };
  }, [configApi, configNames]);

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
    <div className="mt-5">
      {configNames.length > 1 ? (
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
                {schemas[configName]?.title || configName}
              </button>
            </li>
          ))}
          <li className="nav-item ms-auto">
            <button type="button" className="nav-link cursor-pointer" onClick={updateConfig}>
              {t('configManager.buttons.update')}
            </button>
          </li>
        </ul>
      ) : (
        <div className="d-flex justify-content-end">
          <button type="button" className="btn btn-link" onClick={updateConfig}>
            {t('configManager.buttons.update')}
          </button>
        </div>
      )}
      <div className="config-container mt-3">
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
          <ConfigSections
            sections={visibleSections}
            config={config}
            rules={rules}
            nameFor={nameOf}
            onChange={handleFieldChange}
            callAction={configApi.action}
            guard={guard}
          />
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
