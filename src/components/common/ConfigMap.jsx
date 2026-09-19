import PropTypes from 'prop-types';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaTrash } from 'react-icons/fa6';

import { formRulesShape, useFormRules } from '../../hooks/useFormRules';
import { fieldOf, schemaSections, setValueAt, valueAt } from '../../utils/schemaSections';

import ConfigAction, { refusalOf } from './ConfigAction';
import ConfigField from './ConfigField';
import Field from './Field';
import FormErrorSummary from './FormErrorSummary';
import MethodList, { MethodRow } from './MethodList';
import SectionHeading from './SectionHeading';

const KEY_LABELS = { key: 'configManager.map.key' };
const ROW_LABELS = { key: 'configManager.map.key', value: 'configManager.map.value' };
const EMPTY_KEY_FORM = { key: '' };
const EMPTY_ROW_FORM = { key: '', value: undefined };
const FIRST_FIELD = 'input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

const NO_ARRIVAL = { key: '', clear: () => undefined };

/**
 * The map item a page arrived at: `key` the entry the URL's hash names,
 * empty when none, and `clear` the page's way of dropping the hash once
 * the item dialog closes; the config page provides it from
 * `/admin/config/<name>#<key>` and the map that holds the key opens its
 * dialog over that entry.
 */
export const ConfigArrivalContext = createContext(NO_ARRIVAL);

const isSchema = value => value !== null && typeof value === 'object';

const kindOf = item => {
  if (item.properties) {
    return 'object';
  }
  return isSchema(item.additionalProperties) ? 'map' : 'scalar';
};

const entriesOf = value =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {};

const without = (map, key) =>
  Object.fromEntries(Object.entries(map).filter(([entry]) => entry !== key));

const orderOf = value => (typeof value === 'number' ? value : Infinity);

const keyRule = ({ propertyNames, taken, scope }) => ({
  ...(propertyNames || { type: 'string' }),
  custom: value => (taken.includes(value) ? { rule: 'unique', params: { scope, value } } : null),
});

const byOrder = (a, b) => orderOf(a.order) - orderOf(b.order) || a.index - b.index;

const onCard = property => property.order === 1 || property.order === 2;

const cardFields = (node, base) =>
  Object.entries(node.properties || {})
    .flatMap(([key, property], index) => {
      const pointer = `${base}/${key}`;
      if (property.properties) {
        return cardFields(property, pointer);
      }
      if (property.type === 'object' || !onCard(property)) {
        return [];
      }
      const required = (node.required || []).includes(key);
      return [fieldOf({ pointer, key, property, required, index })];
    })
    .sort(byOrder);

const nameOf = pointer => pointer.slice(1);

const errorsUnder = (errors, name, inline) =>
  Object.entries(errors)
    .filter(([entry]) => entry.startsWith(`${name}/`) && !inline.includes(entry))
    .map(([, message]) => message);

const mapShape = {
  pointer: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  item: PropTypes.object.isRequired,
  propertyNames: PropTypes.object,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  rules: formRulesShape.isRequired,
  nameFor: PropTypes.func.isRequired,
  callAction: PropTypes.func,
  guard: PropTypes.func,
};

const entryShape = {
  pointer: PropTypes.string.isRequired,
  entryKey: PropTypes.string.isRequired,
  entryName: PropTypes.string.isRequired,
  entry: PropTypes.object.isRequired,
  item: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  nameFor: PropTypes.func.isRequired,
  callAction: PropTypes.func,
  guard: PropTypes.func,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

const configMapShape = {
  ...mapShape,
  Sections: PropTypes.elementType.isRequired,
  nested: PropTypes.bool,
};

const MapHeader = ({ id, title, count, error, onAdd }) => {
  const { t } = useTranslation();
  return (
    <div className="card-header d-flex justify-content-between align-items-center" id={id}>
      <h6 className="mb-0">
        {title}
        <span className="badge bg-light text-dark ms-2">{count}</span>
        {error ? <span className="d-block small text-danger fw-normal">{error}</span> : null}
      </h6>
      <button type="button" className="btn btn-primary btn-sm" onClick={onAdd}>
        <FaPlus className="me-1" />
        {t('configManager.map.add')}
      </button>
    </div>
  );
};

MapHeader.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
  error: PropTypes.string,
  onAdd: PropTypes.func.isRequired,
};

const KeyField = ({ rules, form, onChange, disabled = false }) => {
  const { t } = useTranslation();
  return (
    <Field
      id={rules.idFor('key')}
      label={t('configManager.map.key')}
      error={rules.errors.key || ''}
      required
    >
      {aria => (
        <input
          {...aria}
          type="text"
          className="form-control"
          value={form.key}
          disabled={disabled}
          onChange={event => onChange(event.target.value)}
          onBlur={() => rules.onBlur('key')}
        />
      )}
    </Field>
  );
};

KeyField.propTypes = {
  rules: formRulesShape.isRequired,
  form: PropTypes.shape({ key: PropTypes.string.isRequired }).isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const EntryAction = ({ pointer, entryKey, entry, item, rules, nameFor, callAction, guard }) => {
  if (!isSchema(item.action) || !callAction) {
    return null;
  }
  const base = `${pointer}/${entryKey}`;
  return (
    <ConfigAction
      action={item.action}
      title={entryKey}
      pointer={base}
      values={entry}
      call={callAction}
      guard={guard}
      onRefused={error => rules.applyServerErrors(refusalOf(error, base, nameFor))}
      className=""
    />
  );
};

EntryAction.propTypes = {
  pointer: PropTypes.string.isRequired,
  entryKey: PropTypes.string.isRequired,
  entry: PropTypes.object.isRequired,
  item: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  nameFor: PropTypes.func.isRequired,
  callAction: PropTypes.func,
  guard: PropTypes.func,
};

const EntryCard = ({
  pointer,
  entryKey,
  entryName,
  entry,
  item,
  rules,
  nameFor,
  callAction = null,
  guard,
  onChange,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const fields = cardFields(item, '');
  const inline = fields.map(field => `${entryName}${field.pointer}`);
  const errors = errorsUnder(rules.errors, entryName, inline);
  return (
    <div className="col-md-6 mb-3">
      <div className="card border-secondary h-100">
        <div className="card-header">
          <h6 className="mb-0">{entryKey}</h6>
        </div>
        <div className="card-body">
          {fields.map(field => {
            const name = `${entryName}${field.pointer}`;
            return (
              <ConfigField
                key={field.pointer}
                field={field}
                id={rules.idFor(name)}
                value={valueAt(entry, field.pointer)}
                error={rules.errors[name] || ''}
                onChange={next => onChange(setValueAt(entry, field.pointer, next))}
                onBlur={() => rules.onBlur(name)}
              />
            );
          })}
          {errors.map(message => (
            <div key={message} className="small text-danger">
              {message}
            </div>
          ))}
        </div>
        <div className="card-footer d-flex justify-content-end gap-2">
          <EntryAction
            pointer={pointer}
            entryKey={entryKey}
            entry={entry}
            item={item}
            rules={rules}
            nameFor={nameFor}
            callAction={callAction}
            guard={guard}
          />
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onEdit}>
            {t('configManager.map.edit')}
          </button>
          <button type="button" className="btn btn-outline-danger btn-sm" onClick={onDelete}>
            <FaTrash className="me-1" />
            {t('configManager.map.delete')}
          </button>
        </div>
      </div>
    </div>
  );
};

EntryCard.propTypes = {
  ...entryShape,
  onChange: PropTypes.func.isRequired,
};

const summaryValues = (item, entry) =>
  cardFields(item, '')
    .map(field => valueAt(entry, field.pointer))
    .filter(value => value !== undefined && value !== null && value !== '');

const EntryRow = ({
  pointer,
  entryKey,
  entryName,
  entry,
  item,
  rules,
  nameFor,
  callAction = null,
  guard,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const fields = cardFields(item, '');
  const inline = fields.map(field => `${entryName}${field.pointer}`);
  const errors = errorsUnder(rules.errors, entryName, inline);
  const values = summaryValues(item, entry);
  const subline =
    values.length > 0 || errors.length > 0 ? (
      <>
        {values.length > 0 ? <span>{values.join(' · ')}</span> : null}
        {errors.map(message => (
          <span key={message} className="d-block text-danger">
            {message}
          </span>
        ))}
      </>
    ) : null;
  const actions = (
    <>
      <EntryAction
        pointer={pointer}
        entryKey={entryKey}
        entry={entry}
        item={item}
        rules={rules}
        nameFor={nameFor}
        callAction={callAction}
        guard={guard}
      />
      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onEdit}>
        {t('configManager.map.edit')}
      </button>
      <button type="button" className="btn btn-outline-danger btn-sm" onClick={onDelete}>
        <FaTrash className="me-1" />
        {t('configManager.map.delete')}
      </button>
    </>
  );
  return <MethodRow label={entryKey} subline={subline} actions={actions} />;
};

EntryRow.propTypes = entryShape;

const ObjectMap = ({
  pointer,
  title,
  item,
  propertyNames = null,
  value,
  onChange,
  rules,
  nameFor,
  callAction = null,
  guard,
  Sections,
  nested = false,
}) => {
  const { t } = useTranslation();
  const name = nameFor(pointer);
  const id = rules.idFor(name);
  const entries = entriesOf(value);
  const summaryFields = useMemo(() => cardFields(item, ''), [item]);
  const listMode = nested || summaryFields.length === 0;
  const formRef = useRef(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_KEY_FORM);
  const sections = useMemo(() => schemaSections(item), [item]);
  const schema = useMemo(
    () => ({
      required: ['key', ...(item.required || [])],
      properties: {
        key: keyRule({
          propertyNames,
          taken: editing ? [] : Object.keys(entriesOf(value)),
          scope: title,
        }),
        ...(item.properties || {}),
      },
    }),
    [item, propertyNames, value, title, editing]
  );
  const dialog = useFormRules({
    schema,
    values: form,
    labels: KEY_LABELS,
    idPrefix: `${id}:dialog`,
  });
  const arrival = useContext(ConfigArrivalContext);
  const arrivalKey = Object.hasOwn(entries, arrival.key) ? arrival.key : '';
  const opened = useRef('');
  const { reset } = dialog;
  const openEdit = key => {
    setForm({ ...entriesOf(entries[key]), key });
    reset();
    setEditing(key);
  };
  const close = () => {
    setEditing(null);
    if (editing === arrivalKey) {
      arrival.clear();
    }
  };
  const focusFirst = () => formRef.current?.querySelector(FIRST_FIELD)?.focus();
  const openAdd = () => {
    setForm(EMPTY_KEY_FORM);
    dialog.reset();
    setEditing('');
  };

  useEffect(() => {
    if (!arrivalKey) {
      opened.current = '';
      return;
    }
    if (opened.current !== arrivalKey) {
      opened.current = arrivalKey;
      setForm({ ...entriesOf(entries[arrivalKey]), key: arrivalKey });
      reset();
      setEditing(arrivalKey);
    }
  }, [arrivalKey, entries, reset]);

  const save = event => {
    event.preventDefault();
    if (!dialog.validateAll()) {
      return;
    }
    const { key, ...entry } = form;
    onChange({ ...entries, [key]: entry });
    close();
  };

  const addButton = (
    <button type="button" className="btn btn-primary btn-sm" onClick={openAdd}>
      <FaPlus className="me-1" />
      {t('configManager.map.add')}
    </button>
  );

  return (
    <>
      {listMode ? (
        <div className="mb-4">
          <SectionHeading
            id={id}
            title={title}
            count={Object.keys(entries).length}
            actions={addButton}
          />
          {rules.errors[name] ? <p className="small text-danger">{rules.errors[name]}</p> : null}
          {Object.keys(entries).length === 0 ? (
            <p className="text-muted mb-0">{t('configManager.map.empty')}</p>
          ) : (
            <MethodList>
              {Object.entries(entries).map(([key, entry]) => (
                <EntryRow
                  key={key}
                  pointer={pointer}
                  entryKey={key}
                  entryName={`${name}/${key}`}
                  entry={entriesOf(entry)}
                  item={item}
                  rules={rules}
                  nameFor={nameFor}
                  callAction={callAction}
                  guard={guard}
                  onEdit={() => openEdit(key)}
                  onDelete={() => onChange(without(entries, key))}
                />
              ))}
            </MethodList>
          )}
        </div>
      ) : (
        <div className="card mb-4">
          <MapHeader
            id={id}
            title={title}
            count={Object.keys(entries).length}
            error={rules.errors[name] || ''}
            onAdd={openAdd}
          />
          <div className="card-body">
            {Object.keys(entries).length === 0 ? (
              <p className="text-muted mb-0">{t('configManager.map.empty')}</p>
            ) : (
              <div className="row">
                {Object.entries(entries).map(([key, entry]) => (
                  <EntryCard
                    key={key}
                    pointer={pointer}
                    entryKey={key}
                    entryName={`${name}/${key}`}
                    entry={entriesOf(entry)}
                    item={item}
                    rules={rules}
                    nameFor={nameFor}
                    callAction={callAction}
                    guard={guard}
                    onChange={next => onChange({ ...entries, [key]: next })}
                    onEdit={() => openEdit(key)}
                    onDelete={() => onChange(without(entries, key))}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <Modal
        show={editing !== null}
        onHide={close}
        onEntered={focusFirst}
        dialogClassName="form-modal"
        scrollable
      >
        <form ref={formRef} onSubmit={save} noValidate>
          <Modal.Header closeButton>
            <Modal.Title as="h5">
              {editing
                ? t('configManager.map.editTitle', { key: editing })
                : t('configManager.map.addTitle', { title })}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <FormErrorSummary errors={dialog.summary} />
            <div className="row">
              <div className="col-md-6">
                <KeyField
                  rules={dialog}
                  form={form}
                  disabled={Boolean(editing)}
                  onChange={key => setForm(previous => ({ ...previous, key }))}
                />
              </div>
            </div>
            <Sections
              sections={sections}
              config={form}
              rules={dialog}
              nameFor={nameOf}
              callAction={callAction}
              guard={guard}
              nested
              onChange={(fieldPointer, next) =>
                setForm(previous => setValueAt(previous, fieldPointer, next))
              }
            />
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn btn-secondary" onClick={close}>
              {t('admin.buttons.cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {t('configManager.map.save')}
            </button>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  );
};

ObjectMap.propTypes = configMapShape;

const ScalarMap = ({
  pointer,
  title,
  item,
  propertyNames = null,
  value,
  onChange,
  rules,
  nameFor,
}) => {
  const { t } = useTranslation();
  const name = nameFor(pointer);
  const id = rules.idFor(name);
  const entries = entriesOf(value);
  const [form, setForm] = useState(EMPTY_ROW_FORM);
  const valueProperty = useMemo(
    () => ({ ...item, title: item.title || t('configManager.map.value') }),
    [item, t]
  );
  const schema = useMemo(
    () => ({
      required: ['key', 'value'],
      properties: {
        key: keyRule({ propertyNames, taken: Object.keys(entriesOf(value)), scope: title }),
        value: valueProperty,
      },
    }),
    [propertyNames, value, title, valueProperty]
  );
  const row = useFormRules({ schema, values: form, labels: ROW_LABELS, idPrefix: `${id}:add` });
  const valueField = useMemo(
    () => fieldOf({ pointer: '/value', key: 'value', property: valueProperty, required: true }),
    [valueProperty]
  );

  const add = event => {
    event.preventDefault();
    if (!row.validateAll()) {
      return;
    }
    onChange({ ...entries, [form.key]: form.value });
    setForm(EMPTY_ROW_FORM);
    row.reset();
  };

  return (
    <div className="card mb-4">
      <div className="card-header" id={id}>
        <h6 className="mb-0">
          {title}
          <span className="badge bg-light text-dark ms-2">{Object.keys(entries).length}</span>
          {rules.errors[name] ? (
            <span className="d-block small text-danger fw-normal">{rules.errors[name]}</span>
          ) : null}
        </h6>
      </div>
      <div className="card-body">
        {Object.keys(entries).map(key => {
          const entryName = `${name}/${key}`;
          const entryField = fieldOf({
            pointer: `${pointer}/${key}`,
            key,
            property: item,
            required: false,
          });
          return (
            <div key={key} className="row align-items-end">
              <div className="col-md-4">
                <Field id={`${rules.idFor(entryName)}:key`} label={t('configManager.map.key')}>
                  {aria => (
                    <input {...aria} type="text" className="form-control" value={key} readOnly />
                  )}
                </Field>
              </div>
              <div className="col-md-6">
                <ConfigField
                  field={entryField}
                  id={rules.idFor(entryName)}
                  value={entries[key]}
                  error={rules.errors[entryName] || ''}
                  onChange={next => onChange({ ...entries, [key]: next })}
                  onBlur={() => rules.onBlur(entryName)}
                />
              </div>
              <div className="col-md-2 mb-3">
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => onChange(without(entries, key))}
                >
                  {t('configManager.map.remove')}
                </button>
              </div>
            </div>
          );
        })}
        <form onSubmit={add} noValidate>
          <FormErrorSummary errors={row.summary} />
          <div className="row align-items-end">
            <div className="col-md-4">
              <KeyField
                rules={row}
                form={form}
                onChange={key => setForm(previous => ({ ...previous, key }))}
              />
            </div>
            <div className="col-md-6">
              <ConfigField
                field={valueField}
                id={row.idFor('value')}
                value={form.value}
                error={row.errors.value || ''}
                onChange={next => setForm(previous => ({ ...previous, value: next }))}
                onBlur={() => row.onBlur('value')}
              />
            </div>
            <div className="col-md-2 mb-3">
              <button type="submit" className="btn btn-primary btn-sm">
                <FaPlus className="me-1" />
                {t('configManager.map.add')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

ScalarMap.propTypes = mapShape;

/**
 * The generic map component over one `additionalProperties` field: an item
 * with `properties` draws as cards, one per key, each showing the key and
 * every item property carrying `order` 1 or 2 as its field drawn inline
 * and edited in place, a leaf at any depth inside the item reached through
 * its nested `properties` included, the other errors of the entry listed
 * under them, with Add opening the form dialog (`form-modal`, the
 * `modal-xl` metric, its body scrolling inside it) over a key field
 * validated against `propertyNames` and the existing keys with `unique`,
 * `params.scope` the map's `title`, and the item's fields drawn through
 * `Sections` (the page's `ConfigSections`) grouped by the item schema's
 * sections and foldable subsections as the page groups the file's, two
 * columns where the page draws two, the `description` under each control,
 * a nested `additionalProperties` item as this component nested, and the
 * first enabled field focused when the dialog opens, the dialog opened on
 * arrival over the entry whose key `ConfigArrivalContext` names and that
 * context's `clear` called when that dialog closes, and a Delete on each
 * card, drawn only while `nested` is false and the item schema carries a
 * leaf of `order` 1 or 2; while `nested` is true (a map inside the item
 * dialog `Sections` draws) or the item schema carries no such leaf, the
 * map draws instead as a `SectionHeading` line (`title`, the count, Add
 * as its action) over one row per entry straight on the ground, the row's
 * key, its `order` 1 or 2 values as muted text where the item schema
 * carries them, and Edit and Delete at the row's right (config contract
 * decision 90); an `action` declared on the item schema draws through
 * `ConfigAction` on every card's footer before Edit and Delete, and first
 * among a list row's actions, titled by the entry's key, calling
 * `callAction(route, method, body)` through `guard` with `body: form` the
 * entry's own current values, unsaved, and a 422 painted under the
 * entry's pointers, drawn only while `callAction` is given; `callAction`
 * and `guard` reach the item dialog's `Sections` too, so a subsection or
 * leaf action inside the dialog sends the dialog form's values; a scalar
 * item draws as key and value rows with Add and Remove; an item that is
 * itself a map draws this component nested per entry; Add, Delete and
 * Remove change the form alone through `onChange` with the whole map,
 * which reaches the backend in the next Update's merge patch.
 */
const ConfigMap = ({
  pointer,
  title,
  item,
  propertyNames = null,
  value,
  onChange,
  rules,
  nameFor,
  callAction = null,
  guard,
  Sections,
  nested = false,
}) => {
  const { t } = useTranslation();
  const kind = kindOf(item);
  const name = nameFor(pointer);
  const id = rules.idFor(name);
  const entries = entriesOf(value);
  const [form, setForm] = useState(EMPTY_KEY_FORM);
  const schema = useMemo(
    () => ({
      required: ['key'],
      properties: {
        key: keyRule({ propertyNames, taken: Object.keys(entriesOf(value)), scope: title }),
      },
    }),
    [propertyNames, value, title]
  );
  const row = useFormRules({ schema, values: form, labels: KEY_LABELS, idPrefix: `${id}:add` });

  if (kind === 'object') {
    return (
      <ObjectMap
        pointer={pointer}
        title={title}
        item={item}
        propertyNames={propertyNames}
        value={value}
        onChange={onChange}
        rules={rules}
        nameFor={nameFor}
        callAction={callAction}
        guard={guard}
        Sections={Sections}
        nested={nested}
      />
    );
  }
  if (kind === 'scalar') {
    return (
      <ScalarMap
        pointer={pointer}
        title={title}
        item={item}
        propertyNames={propertyNames}
        value={value}
        onChange={onChange}
        rules={rules}
        nameFor={nameFor}
      />
    );
  }

  const add = event => {
    event.preventDefault();
    if (!row.validateAll()) {
      return;
    }
    onChange({ ...entries, [form.key]: {} });
    setForm(EMPTY_KEY_FORM);
    row.reset();
  };

  return (
    <div className="card mb-4">
      <div className="card-header" id={id}>
        <h6 className="mb-0">
          {title}
          <span className="badge bg-light text-dark ms-2">{Object.keys(entries).length}</span>
          {rules.errors[name] ? (
            <span className="d-block small text-danger fw-normal">{rules.errors[name]}</span>
          ) : null}
        </h6>
      </div>
      <div className="card-body">
        {Object.keys(entries).map(key => (
          <div key={key} className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <strong>{key}</strong>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() => onChange(without(entries, key))}
              >
                {t('configManager.map.remove')}
              </button>
            </div>
            <ConfigMap
              pointer={`${pointer}/${key}`}
              title={key}
              item={item.additionalProperties}
              propertyNames={isSchema(item.propertyNames) ? item.propertyNames : null}
              value={entries[key]}
              onChange={next => onChange({ ...entries, [key]: next })}
              rules={rules}
              nameFor={nameFor}
              callAction={callAction}
              guard={guard}
              Sections={Sections}
              nested={nested}
            />
          </div>
        ))}
        <form onSubmit={add} noValidate>
          <FormErrorSummary errors={row.summary} />
          <div className="row align-items-end">
            <div className="col-md-6">
              <KeyField
                rules={row}
                form={form}
                onChange={key => setForm(previous => ({ ...previous, key }))}
              />
            </div>
            <div className="col-md-2 mb-3">
              <button type="submit" className="btn btn-primary btn-sm">
                <FaPlus className="me-1" />
                {t('configManager.map.add')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

ConfigMap.propTypes = configMapShape;

export default ConfigMap;
