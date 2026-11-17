import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ConfirmModal from '../../../components/common/ConfirmModal';
import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import SectionCard from '../../../components/common/SectionCard';
import { errorKeys } from '../../../components/common/StepUpDialog';
import Tiles from '../../../components/common/Tiles';
import { useNotify } from '../../../contexts/NoticeContext';
import { useFolds } from '../../../hooks/useFolds';
import { useFormRules } from '../../../hooks/useFormRules';
import { integrationsShape } from '../api/integrations';

import ServiceStatusBadge from './ServiceStatusBadge';

export const SERVICE = 'hyperweaver';
const FORM_KEY = 'integration-hyperweaver';
const PREFS_KEY = 'table_prefs_integrations_hyperweaver';
const LOCAL = 'local';
const EMPTY_TYPED = { origin: '', label: '' };
const LABELS = {
  servers: 'integrations.hyperweaver.servers',
  deploy_target: 'integrations.hyperweaver.deployTarget',
};

const uniqueOrigins = servers => {
  const seen = new Set();
  const twice = (servers || []).find(row => {
    if (seen.has(row.origin)) {
      return true;
    }
    seen.add(row.origin);
    return false;
  });
  return twice ? { rule: 'unique', params: { scope: 'servers' } } : null;
};

const listedTarget = (value, values) =>
  value === LOCAL || (values.servers || []).some(row => row.origin === value)
    ? null
    : { rule: 'enum', params: {} };

const SCHEMA = {
  properties: {
    servers: {
      type: 'array',
      items: {
        type: 'object',
        required: ['origin'],
        properties: {
          origin: { type: 'string' },
          label: { type: 'string' },
          default: { type: 'boolean' },
        },
      },
      custom: uniqueOrigins,
    },
    deploy_target: { type: 'string', custom: listedTarget },
  },
};

/**
 * The `hyperweaver` row of a person's connected services, null while
 * the list carries none.
 *
 * @param {Array<Object>|undefined} rows - `services` of `GET /api/user/integrations` or `integrations` of `GET /api/user`
 * @returns {Object|null} The row
 */
export const hyperweaverServiceOf = rows =>
  (Array.isArray(rows) ? rows : []).find(row => row?.id === SERVICE) || null;

const serverOf = row => ({
  origin: String(row.origin || ''),
  label: String(row.label || ''),
  default: Boolean(row.default),
});

const settingsOf = service => ({
  servers: (service?.settings?.servers || []).map(serverOf),
  deploy_target: service?.settings?.deploy_target || LOCAL,
});

const withDefault = servers =>
  servers.some(row => row.default) || servers.length === 0
    ? servers
    : servers.map((row, index) => ({ ...row, default: index === 0 }));

const ServerRow = ({ row, readOnly, busy, onDefault, onRemove }) => {
  const { t } = useTranslation();
  return (
    <div className="pref-row" data-row="server">
      <div className="pref-row-text">
        <span className="pref-row-name">{row.label || row.origin}</span>
        {row.label ? <span className="pref-row-sub">{row.origin}</span> : null}
      </div>
      {row.default ? (
        <span className="badge bg-primary" data-badge="server-default">
          {t('integrations.hyperweaver.default')}
        </span>
      ) : null}
      {readOnly || row.default ? null : (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          disabled={busy}
          onClick={() => onDefault(row.origin)}
          aria-label={t('integrations.hyperweaver.makeDefault', { origin: row.origin })}
          data-action="server-default"
        >
          {t('integrations.hyperweaver.setDefault')}
        </button>
      )}
      {readOnly ? null : (
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          disabled={busy}
          onClick={() => onRemove(row.origin)}
          data-action="server-remove"
        >
          {t('integrations.hyperweaver.remove')}
        </button>
      )}
    </div>
  );
};

ServerRow.propTypes = {
  row: PropTypes.shape({
    origin: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    default: PropTypes.bool.isRequired,
  }).isRequired,
  readOnly: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  onDefault: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

const ServerRows = ({ servers, readOnly, busy, onDefault, onRemove }) => {
  const { t } = useTranslation();
  if (servers.length === 0) {
    return <div className="pref-empty">{t('integrations.hyperweaver.none')}</div>;
  }
  return (
    <div className="pref-rows" data-panel="hyperweaver-servers">
      {servers.map(row => (
        <ServerRow
          key={row.origin}
          row={row}
          readOnly={readOnly}
          busy={busy}
          onDefault={onDefault}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

ServerRows.propTypes = {
  servers: PropTypes.arrayOf(PropTypes.object).isRequired,
  readOnly: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  onDefault: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

const DeployTargetTiles = ({ rules, servers, target, readOnly, onChange }) => {
  const { t } = useTranslation();
  return (
    <Tiles
      id={rules.idFor('deploy_target')}
      label={t('integrations.hyperweaver.deployTarget')}
      hint={t('integrations.hyperweaver.deployTargetHint')}
      error={rules.errors.deploy_target || ''}
      dim={readOnly}
      className="pref-tiles-words"
      options={[
        { value: LOCAL, label: t('integrations.hyperweaver.local') },
        ...servers.map(row => ({
          value: row.origin,
          label: row.label || row.origin,
          sub: row.label ? row.origin : '',
        })),
      ]}
      value={target}
      onChange={onChange}
      onBlur={() => rules.onBlur('deploy_target')}
    />
  );
};

DeployTargetTiles.propTypes = {
  rules: PropTypes.object.isRequired,
  servers: PropTypes.arrayOf(PropTypes.object).isRequired,
  target: PropTypes.string.isRequired,
  readOnly: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

const TextField = ({ id, label, value, error, onChange, onBlur, field }) => (
  <Field id={id} label={label} error={error}>
    {aria => (
      <input
        {...aria}
        type="text"
        className="form-control"
        value={value}
        onChange={event => onChange(event.target.value)}
        onBlur={onBlur}
        data-field={field}
      />
    )}
  </Field>
);

TextField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.node.isRequired,
  value: PropTypes.string.isRequired,
  error: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func.isRequired,
  field: PropTypes.string.isRequired,
};

const useHyperweaverForm = ({ integrations, service, onSaved }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [draft, setDraft] = useState(() => settingsOf(service));
  const [typed, setTyped] = useState(EMPTY_TYPED);
  const [busy, setBusy] = useState(false);
  const typing = Boolean(typed.origin || typed.label);
  const typedIndex = draft.servers.length;
  const values = useMemo(
    () => ({
      servers: typing ? [...draft.servers, { ...typed, default: false }] : draft.servers,
      deploy_target: draft.deploy_target,
    }),
    [draft, typed, typing]
  );
  const rules = useFormRules({ formKey: FORM_KEY, schema: SCHEMA, values, labels: LABELS });

  const write = async (call, messageKey) => {
    setBusy(true);
    try {
      await call();
      setTyped(EMPTY_TYPED);
      rules.reset();
      notify('success', t(messageKey));
      await onSaved();
    } catch (error) {
      if (!rules.applyServerErrors(error)) {
        notify('danger', t(errorKeys(error)));
      }
    } finally {
      setBusy(false);
    }
  };

  const save = settings =>
    write(() => integrations.save(SERVICE, settings), 'integrations.hyperweaver.saved');

  const addServer = () => {
    if (!rules.validateAll()) {
      return Promise.resolve();
    }
    const server = { origin: typed.origin, label: typed.label, default: typedIndex === 0 };
    if (!service) {
      return write(
        () => integrations.connect(SERVICE, { origin: server.origin, label: server.label }),
        'integrations.hyperweaver.connected'
      );
    }
    return save({ servers: [...draft.servers, server], deploy_target: draft.deploy_target });
  };

  const removeServer = origin => {
    const servers = withDefault(draft.servers.filter(row => row.origin !== origin));
    const listed = servers.some(row => row.origin === draft.deploy_target);
    return save({ servers, deploy_target: listed ? draft.deploy_target : LOCAL });
  };

  const setDefault = origin =>
    setDraft(current => ({
      ...current,
      servers: current.servers.map(row => ({ ...row, default: row.origin === origin })),
    }));

  const setTarget = deploy_target => setDraft(current => ({ ...current, deploy_target }));

  const submit = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return Promise.resolve();
    }
    return save({ servers: draft.servers, deploy_target: draft.deploy_target });
  };

  const disconnect = () =>
    write(() => integrations.disconnect(SERVICE), 'integrations.hyperweaver.disconnected');

  return {
    draft,
    typed,
    setTyped,
    typedIndex,
    busy,
    rules,
    addServer,
    removeServer,
    setDefault,
    setTarget,
    submit,
    disconnect,
  };
};

const AddServerRow = ({ form }) => {
  const { t } = useTranslation();
  const { typed, setTyped, typedIndex, rules, busy } = form;
  const originName = `servers/${typedIndex}/origin`;
  const labelName = `servers/${typedIndex}/label`;
  return (
    <div className="row align-items-end">
      <div className="col-md-5">
        <TextField
          id={rules.idFor(originName)}
          label={t('integrations.hyperweaver.origin')}
          value={typed.origin}
          error={rules.errors[originName] || ''}
          onChange={origin => setTyped(current => ({ ...current, origin }))}
          onBlur={() => rules.onBlur(originName)}
          field="origin"
        />
      </div>
      <div className="col-md-4">
        <TextField
          id={rules.idFor(labelName)}
          label={t('integrations.hyperweaver.label')}
          value={typed.label}
          error={rules.errors[labelName] || ''}
          onChange={label => setTyped(current => ({ ...current, label }))}
          onBlur={() => rules.onBlur(labelName)}
          field="label"
        />
      </div>
      <div className="col-md-3 mb-3">
        <button
          type="button"
          className="btn btn-outline-primary"
          disabled={busy || !typed.origin}
          onClick={form.addServer}
          data-action="server-add"
        >
          {t('integrations.hyperweaver.addServer')}
        </button>
      </div>
    </div>
  );
};

AddServerRow.propTypes = {
  form: PropTypes.object.isRequired,
};

const DisconnectButton = ({ busy, onClick }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-danger"
      disabled={busy}
      onClick={onClick}
      data-action="disconnect"
    >
      {t('integrations.hyperweaver.disconnect')}
    </button>
  );
};

DisconnectButton.propTypes = {
  busy: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

/**
 * The Hyperweaver connected service of the identity contract, one
 * `SectionCard` titled Hyperweaver drawn from the `hyperweaver` row of
 * the person's services: the status badge and the row's `error_message`
 * as the Integrations page draws them, the servers as rows (the label
 * over the origin, the Default badge on the default, Make default on the
 * others, Remove on each), Add server with an origin and a label, the
 * deploy target as tiles, This computer and one per server, Save
 * preferences at the form's foot and Disconnect. Every write is one
 * request in the issuer's own shape: Add server sends
 * `POST /api/user/integrations/hyperweaver/connect` `{ origin, label }`
 * while the person is not yet connected (no `hyperweaver` row) and
 * otherwise, like Remove, `PATCH /api/user/integrations/hyperweaver`
 * with the whole `settings`, the removed default passing to the first
 * server and a deploy target that named the removed origin falling back
 * to `local`; Save sends the same `PATCH` with the picked default and
 * target; Disconnect waits behind a plain confirmation and sends
 * `DELETE /api/user/integrations/hyperweaver`. The form is evaluated
 * through the host's `integration-hyperweaver` rules form, the typed
 * server as the next element of `servers`, so a bad origin is refused at
 * its field before any request and a `422` paints its pointer,
 * `servers/0/origin` and the like, on the field it names; a duplicate
 * origin and a target outside the list are refused client-side. After
 * every write the record is read again through `onSaved`. While
 * `readOnly` the rows draw with no write control.
 */
const HyperweaverServiceCard = ({
  integrations,
  service,
  onSaved,
  readOnly = false,
  className = 'mb-3',
}) => {
  const { t } = useTranslation();
  const folds = useFolds(PREFS_KEY);
  const [confirming, setConfirming] = useState(false);
  const form = useHyperweaverForm({ integrations, service, onSaved });
  const { draft, rules, busy } = form;
  const actions =
    service && !readOnly ? (
      <DisconnectButton busy={busy} onClick={() => setConfirming(true)} />
    ) : null;

  return (
    <SectionCard
      title={t('integrations.hyperweaver.title')}
      badge={service ? <ServiceStatusBadge status={service.status} /> : null}
      actions={actions}
      className={className}
      folded={folds.folded('hyperweaver')}
      onFold={() => folds.toggle('hyperweaver')}
      id="hyperweaver-service"
    >
      <div data-panel="hyperweaver-service">
        {service?.status === 'error' && service.error_message ? (
          <div className="alert alert-danger" role="alert">
            {service.error_message}
          </div>
        ) : null}
        <form onSubmit={form.submit} noValidate>
          <FormErrorSummary errors={rules.summary} />
          <ServerRows
            servers={draft.servers}
            readOnly={readOnly}
            busy={busy}
            onDefault={form.setDefault}
            onRemove={form.removeServer}
          />
          {rules.errors.servers ? (
            <p className="text-danger small mt-2" role="alert">
              {rules.errors.servers}
            </p>
          ) : null}
          {readOnly ? null : <AddServerRow form={form} />}
          <DeployTargetTiles
            rules={rules}
            servers={draft.servers}
            target={draft.deploy_target}
            readOnly={readOnly}
            onChange={form.setTarget}
          />
          {readOnly || !service ? null : (
            <button type="submit" className="btn btn-primary" disabled={busy} data-action="save">
              {t('profile.preferences.save')}
            </button>
          )}
        </form>
        {service && !readOnly ? (
          <ConfirmModal
            show={confirming}
            handleClose={() => setConfirming(false)}
            handleConfirm={form.disconnect}
            title={t('integrations.hyperweaver.disconnectTitle')}
            message={t('integrations.hyperweaver.disconnectBody')}
            typed={false}
            confirmText={t('integrations.hyperweaver.disconnect')}
          />
        ) : null}
      </div>
    </SectionCard>
  );
};

HyperweaverServiceCard.propTypes = {
  integrations: integrationsShape.isRequired,
  service: PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.string,
    error_message: PropTypes.string,
    settings: PropTypes.shape({
      servers: PropTypes.arrayOf(PropTypes.object),
      deploy_target: PropTypes.string,
    }),
  }),
  onSaved: PropTypes.func.isRequired,
  readOnly: PropTypes.bool,
  className: PropTypes.string,
};

export default HyperweaverServiceCard;
