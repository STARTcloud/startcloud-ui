import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ConfirmModal from '../../../components/common/ConfirmModal';
import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import SectionCard from '../../../components/common/SectionCard';
import SectionHeading from '../../../components/common/SectionHeading';
import SubTable from '../../../components/common/SubTable';
import { useNotify } from '../../../contexts/NoticeContext';
import { useArrival } from '../../../hooks/useArrival';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useFolds } from '../../../hooks/useFolds';
import { useFormRules } from '../../../hooks/useFormRules';
import { useSelection } from '../../../hooks/useSelection';
import { log } from '../../../lib/logger';
import { rules as hostRules } from '../../../lib/runtime';

const PREFS_KEY = 'table_prefs_profile';
const EXPIRATIONS = [30, 60, 90, 365];
const ROLES = ['member', 'admin', 'owner'];
const GATED_ROLE = 'superadmin';
const SCHEMA = {
  required: ['organization_id', 'description'],
  properties: {
    organization_id: { type: 'string' },
    description: { type: 'string' },
    expiration_days: { type: 'integer' },
    role: { type: 'string' },
  },
};
const LABELS = {
  organization_id: 'profile.serviceAccounts.organization',
  description: 'profile.serviceAccounts.descriptionPlaceholder',
  expiration_days: 'profile.serviceAccounts.expires',
  role: 'profile.serviceAccounts.role',
};

const rolesOffered = admin => {
  const listed = hostRules?.forms?.serviceAccount?.properties?.role?.enum;
  const offered = listed || (admin ? [...ROLES, GATED_ROLE] : ROLES);
  return admin ? offered : offered.filter(role => role !== GATED_ROLE);
};

const emptyForm = organizationId => ({
  organization_id: organizationId,
  description: '',
  expiration_days: 30,
  role: 'member',
});

const dateOf = (value, language) => {
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? '' : time.toLocaleDateString(language);
};

const matches = (row, needle) =>
  [row.username, row.description || '', row.organization?.name || ''].some(text =>
    text.toLowerCase().includes(needle)
  );

const COLUMNS = [
  {
    key: 'username',
    kind: 'name',
    labelKey: 'profile.serviceAccounts.username',
    sortValue: row => row.username.toLowerCase(),
    render: row => <strong>{row.username}</strong>,
  },
  {
    key: 'description',
    kind: 'text',
    labelKey: 'profile.serviceAccounts.description',
    sortValue: row => (row.description || '').toLowerCase(),
    render: row => row.description || '',
  },
  {
    key: 'role',
    kind: 'badge',
    labelKey: 'profile.serviceAccounts.role',
    sortValue: row => row.role || '',
    render: (row, ctx) =>
      row.role ? <span className="badge bg-secondary">{ctx.t(`roles.${row.role}`)}</span> : '',
  },
  {
    key: 'expiresAt',
    kind: 'date',
    labelKey: 'profile.serviceAccounts.expires',
    sortValue: row => new Date(row.expires_at || 0).getTime(),
    render: (row, ctx) => dateOf(row.expires_at, ctx.language),
  },
];

const groupsOf = rows => {
  const groups = new Map();
  rows.forEach(row => {
    const name = row.organization?.name || '';
    if (!groups.has(name)) {
      groups.set(name, {
        key: name,
        organization: { name, logo: row.organization?.logo || '' },
        items: [],
      });
    }
    groups.get(name).items.push(row);
  });
  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
};

const SelectField = ({ name, rules, value, onChange, children }) => {
  const { t } = useTranslation();
  return (
    <Field id={rules.idFor(name)} label={t(LABELS[name])} error={rules.errors[name] || ''}>
      {aria => (
        <select
          {...aria}
          className="form-select"
          value={value}
          onChange={event => onChange(event.target.value)}
          onBlur={() => rules.onBlur(name)}
        >
          {children}
        </select>
      )}
    </Field>
  );
};

SelectField.propTypes = {
  name: PropTypes.string.isRequired,
  rules: PropTypes.object.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

const CreateForm = ({ organizations, admin, onCreate, rules, form, onChange }) => {
  const { t } = useTranslation();
  const set = (field, value) => onChange({ ...form, [field]: value });
  return (
    <form onSubmit={onCreate} noValidate>
      <div className="col-md-3">
        <FormErrorSummary errors={rules.summary} />
        <SelectField
          name="organization_id"
          rules={rules}
          value={form.organization_id}
          onChange={value => set('organization_id', value)}
        >
          {organizations.map(org => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </SelectField>
        <Field
          id={rules.idFor('description')}
          label={t(LABELS.description)}
          error={rules.errors.description || ''}
        >
          {aria => (
            <input
              {...aria}
              type="text"
              className="form-control"
              value={form.description}
              onChange={event => set('description', event.target.value)}
              onBlur={() => rules.onBlur('description')}
            />
          )}
        </Field>
        <SelectField
          name="expiration_days"
          rules={rules}
          value={form.expiration_days}
          onChange={value => set('expiration_days', Number(value))}
        >
          {EXPIRATIONS.map(days => (
            <option key={days} value={days}>
              {t(`profile.serviceAccounts.expiration.${days}`)}
            </option>
          ))}
        </SelectField>
        <SelectField
          name="role"
          rules={rules}
          value={form.role}
          onChange={value => set('role', value)}
        >
          {rolesOffered(admin).map(role => (
            <option key={role} value={role}>
              {t(`roles.${role}`)}
            </option>
          ))}
        </SelectField>
      </div>
      <button className="btn btn-primary" type="submit">
        {t('profile.serviceAccounts.createButton')}
      </button>
    </form>
  );
};

CreateForm.propTypes = {
  organizations: PropTypes.array.isRequired,
  admin: PropTypes.bool.isRequired,
  onCreate: PropTypes.func.isRequired,
  rules: PropTypes.object.isRequired,
  form: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

const RowActions = ({ entry, onDelete }) => {
  const { t } = useTranslation();
  return (
    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onDelete(entry)}>
      {t('profile.buttons.delete')}
    </button>
  );
};

RowActions.propTypes = {
  entry: PropTypes.object.isRequired,
  onDelete: PropTypes.func.isRequired,
};

/**
 * The Service accounts section of the profile page on a UI backend with
 * service accounts of its own: the create form in a `SectionCard` (the
 * organization, the active one preselected, the description, the expiry
 * and the role from the host's serviceAccount rules enum, the superadmin
 * role offered to a global admin alone), the
 * one-time token notice after a create, then the keys in the one
 * `SubTable` of the pages contract, one organization group row per
 * organization the way the listings group their rows, the select column a
 * real checkbox header, the username, description, role and expiry
 * columns, Delete in the Actions column, and while rows are picked the
 * heading's action pane reading "N selected", Clear selection and Delete
 * behind the confirm; the navbar search narrows the rows and the Columns
 * group shows or hides them under `table_prefs_profile`, and a `#<id>` in
 * the URL lands on that row.
 */
const ServiceAccountsTab = ({ account, activeOrgUuid, admin }) => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const folds = useFolds(PREFS_KEY);
  const { serviceAccounts } = account;
  const [rows, setRows] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [form, setForm] = useState(() => emptyForm(''));
  const [token, setToken] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const selection = useSelection(rows, { labelOf: row => row.username });
  const arrival = useArrival(rows);
  const rules = useFormRules({
    formKey: 'serviceAccount',
    schema: SCHEMA,
    values: form,
    labels: LABELS,
  });
  const search = useDetailSearch({
    rows,
    matches,
    placeholderKey: 'profile.search.serviceAccounts',
    columns: COLUMNS,
    prefsKey: PREFS_KEY,
    filterGroups: [],
  });
  const groups = useMemo(() => groupsOf(search.rows), [search.rows]);

  const fail = (message, error) => {
    log.api.error(message, { error: error.message });
    notify('danger', t(error.messageKey || 'errors.request'));
  };

  const loadRows = useCallback(
    () =>
      serviceAccounts
        .list()
        .then(list => setRows(Array.isArray(list) ? list : []))
        .catch(error => {
          log.api.error('Error loading service accounts', { error: error.message });
          notify('danger', t(error.messageKey || 'errors.request'));
        }),
    [notify, serviceAccounts, t]
  );

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    let mounted = true;
    serviceAccounts
      .organizations()
      .then(list => {
        if (!mounted) {
          return;
        }
        const orgs = Array.isArray(list) ? list : [];
        setOrganizations(orgs);
        const active = orgs.find(org => org.name === activeOrgUuid) || orgs[0];
        setForm(previous => ({ ...previous, organization_id: active ? String(active.id) : '' }));
      })
      .catch(() => null);
    return () => {
      mounted = false;
    };
  }, [activeOrgUuid, serviceAccounts]);

  const resetRules = rules.reset;

  const create = async event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    const target = organizations.find(org => String(org.id) === form.organization_id);
    if (!target) {
      notify('danger', t('profile.errors.activeOrgNotFound'));
      return;
    }
    try {
      const created = await serviceAccounts.create(
        form.description,
        form.expiration_days,
        target.id,
        form.role
      );
      setToken(created?.token || '');
      setForm(emptyForm(form.organization_id));
      resetRules();
      notify('success', t('profile.messages.serviceAccountCreated'));
      await loadRows();
    } catch (error) {
      if (!rules.applyServerErrors(error)) {
        fail('Error creating service account', error);
      }
    }
  };

  const remove = async entry => {
    try {
      await serviceAccounts.remove(entry.id);
      await loadRows();
    } catch (error) {
      fail('Error deleting service account', error);
    }
  };

  const removeSelected = async () => {
    const ids = [...selection.selected];
    try {
      await Promise.all(ids.map(id => serviceAccounts.remove(id)));
      notify('success', t('profile.messages.serviceAccountsDeleted'));
    } catch (error) {
      fail('Error deleting service accounts', error);
    }
    selection.clear();
    await loadRows();
  };

  const headingActions = selection.someSelected ? (
    <>
      <strong>
        {t('profile.serviceAccounts.bulk.selected', { count: selection.selected.size })}
      </strong>
      <button type="button" className="btn btn-sm btn-link" onClick={selection.clear}>
        {t('profile.serviceAccounts.bulk.clearSelection')}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        onClick={() => setConfirming(true)}
      >
        {t('profile.serviceAccounts.bulk.delete')}
      </button>
    </>
  ) : null;

  return (
    <div className="tab-pane fade show active">
      <SectionCard
        title={t('profile.serviceAccounts.createTitle')}
        folded={folds.folded('serviceAccount')}
        onFold={() => folds.toggle('serviceAccount')}
      >
        <CreateForm
          organizations={organizations}
          admin={admin}
          onCreate={create}
          rules={rules}
          form={form}
          onChange={setForm}
        />
      </SectionCard>
      {token ? (
        <div className="alert alert-warning" role="alert">
          <strong>{t('profile.serviceAccounts.token')}:</strong> <code>{token}</code>
          <br />
          <small>{t('profile.serviceAccounts.tokenShownOnce')}</small>
        </div>
      ) : null}
      <SectionHeading
        title={t('profile.serviceAccounts.title')}
        count={rows.length}
        actions={headingActions}
      />
      <SubTable
        columns={COLUMNS}
        rows={search.rows}
        rowKey={row => row.id}
        rowRef={arrival.ref}
        RowActions={RowActions}
        actionsProps={{ onDelete: remove }}
        rowProp="entry"
        sort={search.sort}
        onSort={search.setSort}
        hiddenColumns={search.hiddenColumns}
        widths={search.widths}
        onResize={search.setColumnWidth}
        ctx={{ t, language: i18n.language }}
        emptyText={search.filtering ? t('pages.noMatches') : t('pages.empty')}
        selection={selection.subtable}
        groups={groups}
        collapsed={collapsed}
        onToggleGroup={key => setCollapsed(current => ({ ...current, [key]: !current[key] }))}
        countKey="profile.serviceAccounts.count"
      />
      <ConfirmModal
        show={confirming}
        handleClose={() => setConfirming(false)}
        handleConfirm={removeSelected}
        title={t('profile.serviceAccounts.deleteSelectedModal.title')}
        message={t('profile.serviceAccounts.deleteSelectedModal.message')}
      />
    </div>
  );
};

ServiceAccountsTab.propTypes = {
  account: PropTypes.shape({
    serviceAccounts: PropTypes.shape({
      list: PropTypes.func.isRequired,
      organizations: PropTypes.func.isRequired,
      create: PropTypes.func.isRequired,
      remove: PropTypes.func.isRequired,
    }).isRequired,
  }).isRequired,
  activeOrgUuid: PropTypes.string.isRequired,
  admin: PropTypes.bool.isRequired,
};

export default ServiceAccountsTab;
