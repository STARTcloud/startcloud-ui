import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBuildingUser, FaPen, FaTrash } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import ConfirmModal from '../../../components/common/ConfirmModal';
import CopyButton from '../../../components/common/CopyButton';
import SectionCard, { foldsShape } from '../../../components/common/SectionCard';
import { useNotify } from '../../../contexts/NoticeContext';
import { useEventStream } from '../../../hooks/useEventStream';
import {
  addServer,
  fetchServersWithKeys,
  removeServer,
  testServer,
  updateServer,
} from '../api/servers';
import { useServers } from '../hooks/useServers';

import OrgAssignmentModal from './OrgAssignmentModal';

const EMPTY_FORM = {
  hostname: '',
  port: '5001',
  protocol: 'https',
  entityName: 'Hyperweaver-Production',
  apiKey: '',
  useExistingApiKey: false,
  allowInsecure: false,
};

const NO_KEYS = {};

const KEY_HEAD = 6;

const KEY_TAIL = 4;

const KEY_MIN = 10;

const messageOf = error => error?.data?.message || error?.message || '';

/**
 * An API key masked as hyperweaver-ui drew it, its first six and last
 * four characters, empty for a key too short to mask.
 *
 * @param {string} apiKey - The key
 * @returns {string} The masked key, or the empty string
 */
export const maskApiKey = apiKey => {
  const key = String(apiKey || '');
  if (key.length < KEY_MIN) {
    return '';
  }
  return `${key.slice(0, KEY_HEAD)}...${key.slice(-KEY_TAIL)}`;
};

/**
 * Whether the registry already holds a server at the same hostname,
 * port and protocol, hyperweaver-ui's duplicate check.
 *
 * @param {Array<Object>} servers - The registry rows
 * @param {{ hostname: string, port: string, protocol: string }} form - The form
 * @returns {boolean} True for a duplicate
 */
export const isDuplicateServer = (servers, form) =>
  servers.some(
    server =>
      server.hostname === form.hostname &&
      Number(server.port) === Number(form.port) &&
      server.protocol === form.protocol
  );

/**
 * The body of `POST /api/servers` hyperweaver-ui's form sends: the
 * hostname, the port as a number, the protocol, the entity name or its
 * default, `allowInsecure`, and the pasted key while one is used.
 *
 * @param {Object} form - The form
 * @returns {Object} The body
 */
export const serverBodyOf = form => ({
  hostname: form.hostname,
  port: Number.parseInt(form.port, 10),
  protocol: form.protocol,
  entityName: form.entityName || EMPTY_FORM.entityName,
  allowInsecure: form.allowInsecure,
  ...(form.useExistingApiKey ? { apiKey: form.apiKey } : {}),
});

/**
 * The registry's columns the hosts table gains for a super-admin, the
 * ones hyperweaver-ui's servers list drew beside the hostname and the
 * entity name the hosts table already carries: the protocol, the port,
 * the API key masked with Copy, the self-signed switch writing
 * `PATCH /api/servers/{id}` through `ctx.onToggleInsecure`, and when the
 * server last used the row.
 */
export const REGISTRY_COLUMNS = [
  {
    key: 'protocol',
    kind: 'word',
    labelKey: 'host.serverTable.columns.protocol',
    value: row => row.protocol || '',
  },
  {
    key: 'port',
    kind: 'count',
    labelKey: 'host.serverTable.columns.port',
    value: row => Number(row.port) || 0,
  },
  {
    key: 'apiKey',
    kind: 'text',
    labelKey: 'host.serverTable.columns.apiKey',
    value: row => maskApiKey(row.api_key),
    render: (row, ctx) => {
      const masked = maskApiKey(row.api_key);
      return masked ? (
        <span className="d-inline-flex align-items-center gap-2">
          <CopyButton
            text={row.api_key}
            label={ctx.t('host.serverTable.copyApiKey')}
            className="btn btn-sm btn-light"
          />
          <span className="badge text-bg-light">{masked}</span>
        </span>
      ) : (
        <span className="badge text-bg-light">{ctx.t('host.serverTable.notSet')}</span>
      );
    },
  },
  {
    key: 'allowInsecure',
    kind: 'badge',
    labelKey: 'host.serverTable.columns.selfSignedTls',
    value: row => (row.allow_insecure ? 1 : 0),
    render: (row, ctx) => (
      <div className="form-check form-switch mb-0">
        <input
          type="checkbox"
          role="switch"
          className="form-check-input"
          checked={Boolean(row.allow_insecure)}
          onChange={() => ctx.onToggleInsecure(row)}
          disabled={ctx.busy}
          title={ctx.t('host.serverTable.allowSelfSignedTls')}
          aria-label={ctx.t('host.serverTable.allowSelfSignedTlsLabel', { hostname: row.hostname })}
        />
      </div>
    ),
  },
  {
    key: 'lastUsed',
    kind: 'date',
    labelKey: 'host.serverTable.columns.lastUsed',
    value: row => new Date(row.lastUsed || row.last_used || 0).getTime(),
    render: (row, ctx) => {
      const when = row.lastUsed || row.last_used;
      return when
        ? new Date(when).toLocaleDateString(ctx.language)
        : ctx.t('host.serverTable.never');
    },
  },
];

/**
 * The registry's row actions of the hosts table for a super-admin: Edit
 * opening the host's Manage page, the organizations in the assignment
 * dialog and Remove behind the typed confirmation.
 */
export const RegistryRowActions = ({ server, busy, onEdit, onAssignOrgs, onDelete }) => {
  const { t } = useTranslation();
  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-warning"
        data-action="edit"
        onClick={() => onEdit(server)}
        disabled={busy}
        title={t('host.serverTable.editServer')}
        aria-label={t('host.serverTable.editServer')}
      >
        <FaPen aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-info"
        data-action="assign-orgs"
        onClick={() => onAssignOrgs(server)}
        disabled={busy}
        title={t('host.serverTable.assignOrgs')}
        aria-label={t('host.serverTable.assignOrgs')}
      >
        <FaBuildingUser aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-danger"
        data-action="delete"
        onClick={() => onDelete(server)}
        disabled={busy}
        title={t('host.serverTable.removeServer')}
        aria-label={t('host.serverTable.removeServer')}
      >
        <FaTrash aria-hidden="true" />
      </button>
    </>
  );
};

RegistryRowActions.propTypes = {
  server: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onEdit: PropTypes.func.isRequired,
  onAssignOrgs: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

const Check = ({ id, labelKey, helpKey, checked, onChange, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-3">
      <div className="form-check">
        <input
          type="checkbox"
          id={id}
          className="form-check-input"
          checked={checked}
          onChange={event => onChange(event.target.checked)}
          disabled={disabled}
        />
        <label className="form-check-label" htmlFor={id}>
          {t(labelKey)}
        </label>
      </div>
      <p className="form-text text-muted">{t(helpKey)}</p>
    </div>
  );
};

Check.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  helpKey: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

const ServerForm = ({ form, onChange, loading }) => {
  const { t } = useTranslation();
  const set = (member, value) => onChange({ ...form, [member]: value });
  return (
    <>
      <h3 className="fs-6 fw-bold mb-3">{t('host.serverForm.title')}</h3>
      <div className="row g-3">
        <div className="col-12 col-lg-3">
          <div className="mb-3">
            <label className="form-label" htmlFor="server-protocol">
              {t('host.serverForm.protocol')}
            </label>
            <select
              id="server-protocol"
              className="form-select"
              value={form.protocol}
              onChange={event => set('protocol', event.target.value)}
              disabled={loading}
            >
              <option value="https">{t('host.serverForm.httpsOption')}</option>
              <option value="http">{t('host.serverForm.httpOption')}</option>
            </select>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="mb-3">
            <label className="form-label" htmlFor="server-hostname">
              {t('host.serverForm.hostname')}
            </label>
            <input
              type="text"
              id="server-hostname"
              className="form-control"
              placeholder={t('host.serverForm.hostnamePlaceholder')}
              value={form.hostname}
              onChange={event => set('hostname', event.target.value)}
              disabled={loading}
              required
            />
          </div>
        </div>
        <div className="col-12 col-lg-3">
          <div className="mb-3">
            <label className="form-label" htmlFor="server-port">
              {t('host.serverForm.port')}
            </label>
            <input
              type="number"
              id="server-port"
              className="form-control"
              placeholder={t('host.serverForm.portPlaceholder')}
              value={form.port}
              onChange={event => set('port', event.target.value)}
              disabled={loading}
              required
            />
          </div>
        </div>
      </div>
      <Check
        id="use-existing-api-key-checkbox"
        labelKey="host.serverForm.hasApiKey"
        helpKey="host.serverForm.hasApiKeyHelp"
        checked={form.useExistingApiKey}
        onChange={value => set('useExistingApiKey', value)}
        disabled={loading}
      />
      {form.protocol === 'https' ? (
        <Check
          id="allow-insecure-checkbox"
          labelKey="host.serverForm.allowSelfSigned"
          helpKey="host.serverForm.allowSelfSignedHelp"
          checked={form.allowInsecure}
          onChange={value => set('allowInsecure', value)}
          disabled={loading}
        />
      ) : null}
      {form.useExistingApiKey ? (
        <div className="mb-3">
          <label className="form-label" htmlFor="api-key-input">
            {t('host.serverForm.apiKey')}
          </label>
          <input
            type="password"
            id="api-key-input"
            className="form-control"
            placeholder={t('host.serverForm.apiKeyPlaceholder')}
            value={form.apiKey}
            onChange={event => set('apiKey', event.target.value)}
            disabled={loading}
            required
          />
          <p className="form-text text-muted">{t('host.serverForm.apiKeyHelp')}</p>
        </div>
      ) : (
        <div className="mb-3">
          <label className="form-label" htmlFor="entity-name-input">
            {t('host.serverForm.entityName')}
          </label>
          <input
            type="text"
            id="entity-name-input"
            className="form-control"
            placeholder={t('host.serverForm.entityNamePlaceholder')}
            value={form.entityName}
            onChange={event => set('entityName', event.target.value)}
            disabled={loading}
            required
          />
          <p className="form-text text-muted">{t('host.serverForm.entityNameHelp')}</p>
        </div>
      )}
      <div className="mb-3">
        <label className="form-label" htmlFor="connection-url-display">
          {t('host.serverForm.connectionUrl')}
        </label>
        <input
          id="connection-url-display"
          type="text"
          className="form-control-plaintext"
          value={
            form.hostname
              ? `${form.protocol}://${form.hostname}:${form.port}`
              : t('host.serverForm.connectionUrlPlaceholder')
          }
          readOnly
        />
      </div>
    </>
  );
};

ServerForm.propTypes = {
  form: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

const ServerHelp = ({ useExistingApiKey, testResult }) => {
  const { t } = useTranslation();
  const mode = useExistingApiKey ? 'existing' : 'bootstrap';
  return (
    <div>
      <h3 className="fs-6 fw-bold mb-3">{t('host.serverHelpPanel.title')}</h3>
      <div className="small">
        <p>
          <strong>{t('host.serverHelpPanel.stepsLabel')}</strong>
        </p>
        <ol>
          <li>{t('host.serverHelpPanel.step1')}</li>
          <li>{t('host.serverHelpPanel.step2')}</li>
          <li>{t('host.serverHelpPanel.step3')}</li>
          <li>{t(`host.serverHelpPanel.step4.${mode}`)}</li>
          <li>{t('host.serverHelpPanel.step5')}</li>
        </ol>
        <p className="mt-4">
          <strong>{t('host.serverHelpPanel.requirementsLabel')}</strong>
        </p>
        <ul>
          <li>{t('host.serverHelpPanel.req1')}</li>
          {useExistingApiKey ? null : <li>{t('host.serverHelpPanel.req2')}</li>}
          <li>{t('host.serverHelpPanel.req3')}</li>
          {useExistingApiKey ? <li>{t('host.serverHelpPanel.req4')}</li> : null}
        </ul>
        <p className="mt-4">
          <strong>{t('host.serverHelpPanel.securityLabel')}</strong>
        </p>
        <ul>
          <li>{t('host.serverHelpPanel.sec1')}</li>
          {useExistingApiKey ? null : <li>{t('host.serverHelpPanel.sec2')}</li>}
          <li>{t('host.serverHelpPanel.sec3')}</li>
        </ul>
      </div>
      {testResult ? (
        <div className="mt-3" data-note={`test-${testResult}`}>
          <h3 className="fs-6 fw-bold mb-2">{t('host.serverStatusCard.title')}</h3>
          <div className={`alert alert-${testResult === 'success' ? 'success' : 'danger'}`}>
            <p>
              <strong>
                {t(
                  testResult === 'success'
                    ? 'host.serverStatusCard.successTitle'
                    : 'host.serverStatusCard.errorTitle'
                )}
              </strong>
            </p>
            <p>
              {testResult === 'success'
                ? t('host.serverStatusCard.successMsg', {
                    mode: useExistingApiKey ? 'setup' : 'bootstrap',
                  })
                : t('host.serverStatusCard.errorMsg')}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

ServerHelp.propTypes = {
  useExistingApiKey: PropTypes.bool.isRequired,
  testResult: PropTypes.string,
};

const keysOf = rows => Object.fromEntries(rows.map(row => [String(row.id), row.api_key || '']));

const problemOf = form => {
  if (!(form.hostname && form.port && form.protocol)) {
    return 'settings.serverManagementTab.hostPortProtocolRequired';
  }
  if (form.useExistingApiKey && !form.apiKey) {
    return 'settings.serverManagementTab.apiKeyRequired';
  }
  if (!form.useExistingApiKey && !form.entityName) {
    return 'settings.serverManagementTab.entityNameRequired';
  }
  return '';
};

/**
 * The registry of agents on the hosts page, hyperweaver-ui's Servers
 * tab, held for a super-admin alone (`enabled`): the API keys of
 * `GET /api/servers?includeApiKeys=true` joined onto the page's rows by
 * id, read once as the page draws, again when the stream opens fresh or
 * answers `reset`, on the page's Refresh through `refresh` and after
 * every write; the self-signed switch writing
 * `PATCH /api/servers/{id}`, Remove `DELETE /api/servers/{id}` behind the
 * typed confirmation, Edit opening the host's Manage page and the
 * organizations the assignment dialog; the form of a new host, Test
 * connection sending `POST /api/servers/test` and Add or Bootstrap
 * sending `POST /api/servers`, a duplicate refused before it is sent.
 * Every write is one request and one notice, the keys and the hosts
 * feature's list read again after a success. Answers the rows with their
 * keys, the registry's columns and row actions for the one table, the
 * `ctx` members the switch reads, and the state `ServersPanel` draws.
 *
 * @param {Object} options - The page's side
 * @param {boolean} options.enabled - Whether the person may manage the registry
 * @param {Array<Object>} options.servers - The page's rows from `useServers`
 * @param {Function} options.onAdded - Called once a host was added
 * @returns {Object} The rows, columns, row actions, `ctx` members and the panel's state
 */
export const useRegistry = ({ enabled, servers, onAdded }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const navigate = useNavigate();
  const { refresh: refreshRegistry } = useServers();
  const [keys, setKeys] = useState(NO_KEYS);
  const [form, setForm] = useState(EMPTY_FORM);
  const [testResult, setTestResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [orgTarget, setOrgTarget] = useState(null);

  const load = useCallback(() => {
    if (!enabled) {
      return;
    }
    fetchServersWithKeys()
      .then(rows => setKeys(keysOf(rows)))
      .catch(error => notify('danger', messageOf(error) || t('hosts.page.loadError')));
  }, [enabled, notify, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEventStream('ready', (data, resumed) => {
    if (data && !resumed) {
      load();
    }
  });

  useEventStream('reset', () => load());

  const rows = useMemo(
    () => servers.map(row => ({ ...row, api_key: keys[String(row.id)] || '' })),
    [servers, keys]
  );

  const changed = () => {
    load();
    refreshRegistry();
  };

  const write = async ({ call, doneText, failKey }) => {
    setBusy(true);
    try {
      const answer = await call();
      notify('success', doneText || answer?.message || '');
      changed();
      return true;
    } catch (error) {
      notify('danger', messageOf(error) || t(failKey));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    const server = deleting;
    setDeleting(null);
    write({
      call: () => removeServer(server.id),
      doneText: t('settings.serverManagementTab.serverRemoved'),
      failKey: 'settings.serverManagementTab.errorRemoving',
    });
  };

  const toggleInsecure = server =>
    write({
      call: () => updateServer(server.id, !server.allow_insecure),
      doneText: t(
        server.allow_insecure
          ? 'settings.serverManagementTab.insecureRevoked'
          : 'settings.serverManagementTab.insecureAccepted',
        { hostname: server.hostname }
      ),
      failKey: 'settings.serverManagementTab.errorUpdating',
    });

  const test = async () => {
    if (!(form.hostname && form.port && form.protocol)) {
      notify('warning', t('settings.serverManagementTab.fillHostPortProtocol'));
      return;
    }
    setBusy(true);
    setTestResult(null);
    try {
      const answer = await testServer({
        hostname: form.hostname,
        port: Number.parseInt(form.port, 10),
        protocol: form.protocol,
        allowInsecure: form.allowInsecure,
      });
      const ok = answer?.success !== false;
      setTestResult(ok ? 'success' : 'error');
      notify(
        ok ? 'success' : 'danger',
        ok
          ? t('settings.serverManagementTab.testSuccess')
          : t('settings.serverManagementTab.testFailed', { message: answer?.message || '' })
      );
    } catch (error) {
      setTestResult('error');
      notify('danger', t('settings.serverManagementTab.testFailed', { message: messageOf(error) }));
    } finally {
      setBusy(false);
    }
  };

  const submit = async event => {
    event.preventDefault();
    const problem = problemOf(form);
    if (problem) {
      notify('warning', t(problem));
      return;
    }
    if (isDuplicateServer(rows, form)) {
      setTestResult('error');
      notify('danger', t('settings.serverManagementTab.duplicateServer', form));
      return;
    }
    setTestResult(null);
    const added = await write({
      call: () => addServer(serverBodyOf(form)),
      doneText: t('settings.serverManagementTab.serverAdded'),
      failKey: 'settings.serverManagementTab.unexpectedError',
    });
    setTestResult(added ? 'success' : 'error');
    if (added) {
      setForm(EMPTY_FORM);
      onAdded();
    }
  };

  const reset = () => {
    setForm(EMPTY_FORM);
    setTestResult(null);
  };

  return {
    rows,
    columns: REGISTRY_COLUMNS,
    refresh: load,
    ctx: { busy, onToggleInsecure: toggleInsecure },
    RowActions: RegistryRowActions,
    actionsProps: {
      busy,
      onEdit: server => navigate(`/hosts/${server.id}/manage`),
      onAssignOrgs: setOrgTarget,
      onDelete: setDeleting,
    },
    busy,
    form,
    setForm,
    testResult,
    test,
    submit,
    reset,
    deleting,
    setDeleting,
    remove,
    orgTarget,
    setOrgTarget,
  };
};

/**
 * The registry panel of the hosts page for a super-admin, over the state
 * `useRegistry` holds: the form of a new host in a section card while
 * `adding`, hyperweaver-ui's fields with its help beside them and Test
 * connection and Add or Bootstrap under them; the organization
 * assignment dialog of the row that asked for it; and the typed
 * confirmation of a Remove.
 */
const ServersPanel = ({ registry, adding, folds }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const { form, setForm, busy, testResult, test, submit } = registry;
  return (
    <>
      {adding ? (
        <SectionCard
          title={t('settings.serverManagementTab.addServer')}
          folded={folds.folded('server-add')}
          onFold={() => folds.toggle('server-add')}
        >
          <form onSubmit={submit} autoComplete="off" data-form="server-add">
            <div className="row g-3">
              <div className="col-12 col-lg-8">
                <ServerForm form={form} onChange={setForm} loading={busy} />
              </div>
              <div className="col-12 col-lg-4">
                <ServerHelp useExistingApiKey={form.useExistingApiKey} testResult={testResult} />
              </div>
            </div>
            <div className="d-flex justify-content-center gap-2">
              <button
                type="button"
                className="btn btn-info"
                data-action="server-test"
                onClick={test}
                disabled={busy}
              >
                {t('settings.serverManagementTab.testConnection')}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                data-action="server-submit"
                disabled={busy}
              >
                {t(
                  form.useExistingApiKey
                    ? 'settings.serverManagementTab.addServer'
                    : 'settings.serverManagementTab.bootstrapServer'
                )}
              </button>
            </div>
          </form>
        </SectionCard>
      ) : null}
      {registry.orgTarget ? (
        <OrgAssignmentModal
          serverId={registry.orgTarget.id}
          targetLabel={registry.orgTarget.hostname}
          onClose={saved => {
            if (saved) {
              notify('success', t('settings.serverManagementTab.orgsUpdated'));
            }
            registry.setOrgTarget(null);
          }}
        />
      ) : null}
      <ConfirmModal
        show={registry.deleting !== null}
        handleClose={() => registry.setDeleting(null)}
        handleConfirm={registry.remove}
        title={t('settings.serverManagementTab.removeServerTitle')}
        message={t('settings.serverManagementTab.removeServerMessage')}
        confirmText={t('settings.serverManagementTab.removeServerTitle')}
        variant="delete"
      />
    </>
  );
};

export const registryShape = PropTypes.shape({
  rows: PropTypes.array.isRequired,
  columns: PropTypes.array.isRequired,
  refresh: PropTypes.func.isRequired,
  ctx: PropTypes.object.isRequired,
  RowActions: PropTypes.elementType.isRequired,
  actionsProps: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  form: PropTypes.object.isRequired,
  setForm: PropTypes.func.isRequired,
  testResult: PropTypes.string,
  test: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
  reset: PropTypes.func.isRequired,
  deleting: PropTypes.object,
  setDeleting: PropTypes.func.isRequired,
  remove: PropTypes.func.isRequired,
  orgTarget: PropTypes.object,
  setOrgTarget: PropTypes.func.isRequired,
});

ServersPanel.propTypes = {
  registry: registryShape.isRequired,
  adding: PropTypes.bool.isRequired,
  folds: foldsShape.isRequired,
};

export default ServersPanel;
