import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaPen, FaPlus, FaTrash, FaXmark } from 'react-icons/fa6';

import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import RevealInput from '../../../components/common/RevealInput';
import { formRulesShape, useFormRules } from '../../../hooks/useFormRules';
import { log } from '../../../lib/logger';
import { itemShape } from '../../../utils/itemShape';
import { refusalMessage } from '../../../utils/validation';

const KIND_VALUES = { desktop: true, server: false };

const KIND_WORDS = { true: 'desktop', false: 'server' };

const FIXED_KEYS = ['providers'];

const ENTRY_MEMBERS = ['name', 'size', 'controller'];

const ENTRY_COLS = { name: 'col-5', size: 'col-3', controller: 'col-3' };

const FACT_FIELDS = [
  { name: 'distro', kind: 'text' },
  { name: 'distro_version', kind: 'text' },
  { name: 'os_name', kind: 'text' },
  { name: 'vm_type', kind: 'text' },
  { name: 'desktop', kind: 'kind' },
  { name: 'username', kind: 'text' },
  { name: 'password', kind: 'secret' },
  { name: 'communicator', kind: 'text' },
  { name: 'cpus', kind: 'integer' },
  { name: 'memory_mb', kind: 'integer' },
  { name: 'built', kind: 'text' },
  { name: 'core_provisioner_version', kind: 'text' },
];

const FACT_LISTS = [
  {
    name: 'disks',
    row: 'disk',
    labelKey: 'pages.facts.disks',
    addKey: 'pages.facts.addDisk',
    removeKey: 'pages.facts.removeDisk',
  },
  {
    name: 'cdroms',
    row: 'cdrom',
    labelKey: 'pages.facts.cdroms',
    addKey: 'pages.facts.addCdrom',
    removeKey: 'pages.facts.removeCdrom',
  },
];

const FACTS_LABELS = {
  distro: 'pages.facts.distro',
  distro_version: 'pages.facts.distroVersion',
  os_name: 'pages.facts.osName',
  vm_type: 'pages.facts.vmType',
  desktop: 'pages.facts.kind',
  username: 'pages.facts.username',
  password: 'pages.facts.password',
  communicator: 'pages.facts.communicator',
  cpus: 'pages.facts.cpus',
  memory_mb: 'pages.facts.memoryMb',
  built: 'pages.facts.built',
  core_provisioner_version: 'pages.facts.driver',
  driver_version: 'pages.facts.driver',
  disks: 'pages.facts.disks',
  cdroms: 'pages.facts.cdroms',
};

const ENTRY_SCHEMA = {
  type: 'array',
  items: {
    properties: {
      name: { type: 'string' },
      size: { type: 'string' },
      controller: { type: 'string' },
    },
  },
};

const FACTS_SCHEMA = {
  properties: {
    distro: { type: 'string' },
    distro_version: { type: 'string' },
    os_name: { type: 'string' },
    vm_type: { type: 'string' },
    desktop: { type: 'string' },
    username: { type: 'string' },
    password: { type: 'string' },
    communicator: { type: 'string' },
    cpus: { type: 'integer', minimum: 1 },
    memory_mb: { type: 'integer', minimum: 1 },
    built: { type: 'string' },
    core_provisioner_version: { type: 'string' },
    driver_version: { type: 'string' },
    disks: ENTRY_SCHEMA,
    cdroms: ENTRY_SCHEMA,
  },
};

let rowKeys = 0;

const nextRowKey = () => {
  rowKeys += 1;
  return `row-${rowKeys}`;
};

const fieldShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  kind: PropTypes.oneOf(['text', 'kind', 'secret', 'integer']).isRequired,
});

const listShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  row: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  addKey: PropTypes.string.isRequired,
  removeKey: PropTypes.string.isRequired,
});

const entryRowShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  plain: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
  size: PropTypes.string.isRequired,
  controller: PropTypes.string.isRequired,
});

const factsShape = PropTypes.shape({
  editable: PropTypes.bool.isRequired,
  save: PropTypes.func,
  notify: PropTypes.func.isRequired,
});

const formatMemory = memoryMb => {
  const mb = Number(memoryMb);
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  }
  return `${mb} MB`;
};

const formatDiskEntry = entry => {
  if (typeof entry === 'string') {
    return entry;
  }
  if (!entry || typeof entry !== 'object') {
    return String(entry ?? '');
  }
  return [entry.name, entry.size, entry.controller].filter(Boolean).join(' · ');
};

const osRow = (item, rows) => {
  const label = item.os?.label || '';
  const iconUrl = item.os?.iconUrl || '';
  if (!label && !iconUrl) {
    return;
  }
  rows.push({
    key: 'os',
    content: (
      <>
        {iconUrl ? <img src={iconUrl} alt="" className="me-2 avatar-lg v-align-middle" /> : null}
        {label}
      </>
    ),
  });
};

const metadataRows = (item, t) => {
  const metadata = item.metadata || {};
  const rows = [];
  osRow(item, rows);
  const desktopLabel =
    typeof metadata.desktop === 'boolean'
      ? t(metadata.desktop ? 'pages.facts.desktop' : 'pages.facts.server')
      : null;
  const typeValue = [metadata.vm_type, desktopLabel].filter(Boolean).join(' · ');
  if (typeValue) {
    rows.push({ key: 'type', content: typeValue });
  }
  if (metadata.username) {
    rows.push({ key: 'username', content: <code>{metadata.username}</code> });
  }
  if (metadata.password) {
    rows.push({ key: 'password', value: metadata.password });
  }
  if (metadata.communicator) {
    rows.push({ key: 'communicator', content: metadata.communicator });
  }
  if (metadata.cpus) {
    rows.push({ key: 'cpus', content: metadata.cpus });
  }
  if (metadata.memory_mb) {
    rows.push({ key: 'memory', content: formatMemory(metadata.memory_mb) });
  }
  const disks = [
    ...(Array.isArray(metadata.disks) ? metadata.disks : []),
    ...(Array.isArray(metadata.cdroms) ? metadata.cdroms : []),
  ].map(formatDiskEntry);
  if (disks.length > 0) {
    rows.push({ key: 'disks', content: disks.map(entry => <div key={entry}>{entry}</div>) });
  }
  if (Array.isArray(metadata.providers) && metadata.providers.length > 0) {
    rows.push({ key: 'providers', content: metadata.providers.join(', ') });
  }
  if (metadata.built) {
    rows.push({ key: 'built', content: metadata.built });
  }
  const driver = metadata.core_provisioner_version || metadata.driver_version;
  if (driver) {
    rows.push({ key: 'driver', content: driver });
  }
  return rows;
};

const fieldsOf = metadata =>
  FACT_FIELDS.map(field =>
    field.name === 'core_provisioner_version' &&
    metadata.core_provisioner_version === undefined &&
    metadata.driver_version !== undefined
      ? { ...field, name: 'driver_version' }
      : field
  );

const textOf = (value, kind) => {
  if (kind === 'kind') {
    return typeof value === 'boolean' ? KIND_WORDS[value] : '';
  }
  return value === undefined || value === null ? '' : String(value);
};

const valueOf = (text, kind) => {
  const trimmed = kind === 'secret' ? text : text.trim();
  if (trimmed === '') {
    return undefined;
  }
  if (kind === 'kind') {
    return KIND_VALUES[trimmed];
  }
  if (kind === 'integer') {
    return Number(trimmed);
  }
  return trimmed;
};

const newEntryRow = () => ({ key: nextRowKey(), plain: false, name: '', size: '', controller: '' });

const entryRowOf = entry => {
  if (entry && typeof entry === 'object') {
    return {
      key: nextRowKey(),
      plain: false,
      name: textOf(entry.name, 'text'),
      size: textOf(entry.size, 'text'),
      controller: textOf(entry.controller, 'text'),
    };
  }
  return { ...newEntryRow(), plain: true, name: textOf(entry, 'text') };
};

const entryRowsOf = entries => (Array.isArray(entries) ? entries.map(entryRowOf) : []);

const entryOf = row => {
  if (row.plain) {
    return row.name.trim() || undefined;
  }
  const entry = Object.fromEntries(
    ENTRY_MEMBERS.map(member => [member, row[member].trim()]).filter(([, value]) => value)
  );
  return Object.keys(entry).length > 0 ? entry : undefined;
};

const entriesOf = rows => rows.map(entryOf).filter(entry => entry !== undefined);

const draftOf = (metadata, fields) => ({
  ...Object.fromEntries(
    fields.map(field => [field.name, textOf(metadata[field.name], field.kind)])
  ),
  ...Object.fromEntries(FACT_LISTS.map(list => [list.name, entryRowsOf(metadata[list.name])])),
});

const withValue = (next, name, value) => {
  if (value === undefined) {
    delete next[name];
  } else {
    next[name] = value;
  }
};

const factsOf = (metadata, draft, fields) => {
  const next = { ...metadata };
  fields.forEach(field => withValue(next, field.name, valueOf(draft[field.name], field.kind)));
  FACT_LISTS.forEach(list => {
    const entries = entriesOf(draft[list.name]);
    withValue(next, list.name, entries.length > 0 ? entries : undefined);
  });
  return next;
};

const PasswordRow = ({ password }) => {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  return (
    <div className="row mb-1">
      <dt className="col-sm-4">{t('pages.facts.password')}</dt>
      <dd className="col-sm-8 mb-1">
        <code className="me-2">{show ? password : '••••••••'}</code>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => setShow(current => !current)}
        >
          {show ? t('pages.facts.hide') : t('pages.facts.show')}
        </button>
      </dd>
    </div>
  );
};

PasswordRow.propTypes = {
  password: PropTypes.string.isRequired,
};

const FactRows = ({ rows }) => {
  const { t } = useTranslation();
  return (
    <dl className="mb-0">
      {rows.map(row =>
        row.key === 'password' ? (
          <PasswordRow key="password" password={row.value} />
        ) : (
          <div className="row mb-1" key={row.key}>
            <dt className="col-sm-4">{t(`pages.facts.${row.key}`)}</dt>
            <dd className="col-sm-8 mb-1">{row.content}</dd>
          </div>
        )
      )}
    </dl>
  );
};

FactRows.propTypes = {
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      content: PropTypes.node,
      value: PropTypes.string,
    })
  ).isRequired,
};

const FactInput = ({ field, aria, value, onChange, onBlur }) => {
  const { t } = useTranslation();
  if (field.kind === 'kind') {
    return (
      <select
        {...aria}
        className="form-select"
        name={field.name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
      >
        <option value="">{t('pages.facts.unset')}</option>
        <option value="server">{t('pages.facts.server')}</option>
        <option value="desktop">{t('pages.facts.desktop')}</option>
      </select>
    );
  }
  if (field.kind === 'secret') {
    return (
      <RevealInput
        id={aria.id}
        name={field.name}
        value={value}
        onChange={onChange}
        autoComplete="off"
      />
    );
  }
  return (
    <input
      {...aria}
      type={field.kind === 'integer' ? 'number' : 'text'}
      className="form-control"
      name={field.name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
    />
  );
};

FactInput.propTypes = {
  field: fieldShape.isRequired,
  aria: PropTypes.object.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func.isRequired,
};

/**
 * One entry of a disks or CD-ROMs list as a row of inputs: the name alone
 * for an entry the block holds as a string, name, size and controller for
 * one it holds as an object, and the button that drops the row.
 */
const EntryRow = ({ list, row, index, rules, onChange, onRemove }) => {
  const { t } = useTranslation();
  const members = row.plain ? ['name'] : ENTRY_MEMBERS;
  return (
    <div className="row g-2 align-items-end" data-row={list.row}>
      {members.map(member => {
        const pointer = `${list.name}/${index}/${member}`;
        return (
          <div className={row.plain ? 'col' : ENTRY_COLS[member]} key={member}>
            <Field
              id={rules.idFor(pointer)}
              label={t(`pages.facts.${member}`)}
              error={rules.errors[pointer] || ''}
              className="mb-0"
            >
              {aria => (
                <input
                  {...aria}
                  type="text"
                  className="form-control form-control-sm"
                  value={row[member]}
                  onChange={event => onChange(row.key, member, event.target.value)}
                  onBlur={() => rules.onBlur(pointer)}
                />
              )}
            </Field>
          </div>
        );
      })}
      <div className="col-auto">
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          aria-label={t(list.removeKey)}
          title={t(list.removeKey)}
          onClick={() => onRemove(row.key)}
        >
          <FaTrash aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

EntryRow.propTypes = {
  list: listShape.isRequired,
  row: entryRowShape.isRequired,
  index: PropTypes.number.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

/**
 * One list fact of the form, Disks or CD-ROMs: its rows, each an
 * `EntryRow`, and the button that adds an empty object row under them.
 */
const EntryList = ({ list, rows, rules, onChange, onRemove, onAdd }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-2" data-list={list.name}>
      <span className="form-label d-block">{t(list.labelKey)}</span>
      <div className="d-flex flex-column gap-2">
        {rows.map((row, index) => (
          <EntryRow
            key={row.key}
            list={list}
            row={row}
            index={index}
            rules={rules}
            onChange={onChange}
            onRemove={onRemove}
          />
        ))}
        <div>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            data-action={`add-${list.row}`}
            onClick={onAdd}
          >
            <FaPlus className="me-2" aria-hidden="true" />
            {t(list.addKey)}
          </button>
        </div>
      </div>
    </div>
  );
};

EntryList.propTypes = {
  list: listShape.isRequired,
  rows: PropTypes.arrayOf(entryRowShape).isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
};

/**
 * The facts card as a form: one field per scalar fact, the Disks and
 * CD-ROMs lists as rows, then Providers as it is drawn at rest.
 */
const FactsForm = ({ fields, fixedRows, draft, rules, onChange, lists, onSubmit }) => (
  <form onSubmit={onSubmit} noValidate>
    <FormErrorSummary errors={rules.summary} />
    {fields.map(field => (
      <Field
        key={field.name}
        id={rules.idFor(field.name)}
        label={rules.labelFor(field.name)}
        error={rules.errors[field.name] || ''}
        className="mb-2"
      >
        {aria => (
          <FactInput
            field={field}
            aria={aria}
            value={draft[field.name]}
            onChange={onChange}
            onBlur={() => rules.onBlur(field.name)}
          />
        )}
      </Field>
    ))}
    {FACT_LISTS.map(list => (
      <EntryList
        key={list.name}
        list={list}
        rows={draft[list.name]}
        rules={rules}
        onChange={(key, member, value) => lists.change(list.name, key, member, value)}
        onRemove={key => lists.remove(list.name, key)}
        onAdd={() => lists.add(list.name)}
      />
    ))}
    {fixedRows.length > 0 ? <FactRows rows={fixedRows} /> : null}
  </form>
);

FactsForm.propTypes = {
  fields: PropTypes.arrayOf(fieldShape).isRequired,
  fixedRows: PropTypes.arrayOf(PropTypes.object).isRequired,
  draft: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  lists: PropTypes.shape({
    change: PropTypes.func.isRequired,
    remove: PropTypes.func.isRequired,
    add: PropTypes.func.isRequired,
  }).isRequired,
  onSubmit: PropTypes.func.isRequired,
};

const FactsControls = ({ editing, onEdit, onSave, onCancel }) => {
  const { t } = useTranslation();
  if (!editing) {
    return (
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        data-action="edit-facts"
        onClick={onEdit}
        title={t('pages.facts.edit')}
        aria-label={t('pages.facts.edit')}
      >
        <FaPen />
      </button>
    );
  }
  return (
    <span className="d-inline-flex gap-1">
      <button
        type="button"
        className="btn btn-sm btn-success"
        data-action="save-facts"
        onClick={onSave}
        title={t('pages.facts.save')}
        aria-label={t('pages.facts.save')}
      >
        <FaCheck />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-secondary"
        data-action="cancel-facts"
        onClick={onCancel}
        title={t('pages.facts.cancel')}
        aria-label={t('pages.facts.cancel')}
      >
        <FaXmark />
      </button>
    </span>
  );
};

FactsControls.propTypes = {
  editing: PropTypes.bool.isRequired,
  onEdit: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

/**
 * The facts card of an item page: the rows of the item's `metadata` at
 * rest and, while `facts.editable`, a pencil that turns them into the
 * form, Save handing the whole facts block to `facts.save`, the page
 * merging what the host answered back into the item.
 */
const ItemFacts = ({ item, facts }) => {
  const { t } = useTranslation();
  const metadata = item.metadata || {};
  const fields = fieldsOf(metadata);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => draftOf(metadata, fields));
  const rules = useFormRules({
    schema: FACTS_SCHEMA,
    values: draft,
    labels: FACTS_LABELS,
    idPrefix: 'facts',
  });
  const rows = metadataRows(item, t);
  if (rows.length === 0 && !facts.editable) {
    return null;
  }

  const onChange = event => {
    const { name, value } = event.target;
    setDraft(current => ({ ...current, [name]: value }));
  };

  const lists = {
    change: (name, key, member, value) =>
      setDraft(current => ({
        ...current,
        [name]: current[name].map(row => (row.key === key ? { ...row, [member]: value } : row)),
      })),
    remove: (name, key) =>
      setDraft(current => ({ ...current, [name]: current[name].filter(row => row.key !== key) })),
    add: name => setDraft(current => ({ ...current, [name]: [...current[name], newEntryRow()] })),
  };

  const beginEdit = () => {
    setDraft(draftOf(metadata, fields));
    rules.reset();
    setEditing(true);
  };

  const endEdit = () => {
    setEditing(false);
    rules.reset();
  };

  const save = () => {
    if (!rules.validateAll()) {
      return;
    }
    const next = factsOf(metadata, draft, fields);
    if (JSON.stringify(next) === JSON.stringify(metadata)) {
      endEdit();
      return;
    }
    facts
      .save(next)
      .then(() => {
        facts.notify('success', t('pages.facts.saved'));
        endEdit();
      })
      .catch(error => {
        if (rules.applyServerErrors(error)) {
          return;
        }
        log.api.error('Error updating facts', { itemName: item.name, error: error.message });
        facts.notify('danger', refusalMessage({ error, t }));
      });
  };

  const submit = event => {
    event.preventDefault();
    save();
  };

  return (
    <div className="card h-100">
      <div className="card-header d-flex align-items-center">
        <h5 className="mb-0 me-auto">{t('pages.item.facts')}</h5>
        {facts.editable ? (
          <FactsControls editing={editing} onEdit={beginEdit} onSave={save} onCancel={endEdit} />
        ) : null}
      </div>
      <div className="card-body">
        {editing ? (
          <FactsForm
            fields={fields}
            fixedRows={rows.filter(row => FIXED_KEYS.includes(row.key))}
            draft={draft}
            rules={rules}
            onChange={onChange}
            lists={lists}
            onSubmit={submit}
          />
        ) : (
          <FactRows rows={rows} />
        )}
      </div>
    </div>
  );
};

ItemFacts.propTypes = {
  item: itemShape.isRequired,
  facts: factsShape.isRequired,
};

export default ItemFacts;
