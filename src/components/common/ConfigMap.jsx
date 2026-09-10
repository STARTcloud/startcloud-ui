import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaTrash } from 'react-icons/fa6';

import { formRulesShape, useFormRules } from '../../hooks/useFormRules';
import { fieldOf, setValueAt, valueAt } from '../../utils/schemaSections';

import ConfigField from './ConfigField';
import Field from './Field';
import FormErrorSummary from './FormErrorSummary';

const KEY_LABELS = { key: 'configManager.map.key' };
const ROW_LABELS = { key: 'configManager.map.key', value: 'configManager.map.value' };
const EMPTY_KEY_FORM = { key: '' };
const EMPTY_ROW_FORM = { key: '', value: undefined };

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

const cardProperties = item =>
  Object.entries(item.properties || {})
    .filter(([, property]) => property.order === 1 || property.order === 2)
    .sort((a, b) => a[1].order - b[1].order);

const byOrder = (a, b) => orderOf(a.order) - orderOf(b.order) || a.index - b.index;

const dialogFields = (node, base) =>
  Object.entries(node.properties || {})
    .map(([key, property], index) =>
      fieldOf({
        pointer: `${base}/${key}`,
        key,
        property,
        required: (node.required || []).includes(key),
        index,
      })
    )
    .sort(byOrder);

const nameOf = pointer => pointer.slice(1);

const errorsUnder = (errors, name) =>
  Object.entries(errors)
    .filter(([entry]) => entry.startsWith(`${name}/`))
    .map(([, message]) => message);

const textOf = value => {
  if (value === null || value === undefined) {
    return '';
  }
  return Array.isArray(value) ? value.join(',') : String(value);
};

const mapShape = {
  pointer: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  item: PropTypes.object.isRequired,
  propertyNames: PropTypes.object,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  rules: formRulesShape.isRequired,
  nameFor: PropTypes.func.isRequired,
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

const EntryCard = ({ entryKey, entry, item, errors, onEdit, onDelete }) => {
  const { t } = useTranslation();
  return (
    <div className="col-md-6 mb-3">
      <div className="card border-secondary h-100">
        <div className="card-header">
          <h6 className="mb-0">{entryKey}</h6>
        </div>
        <div className="card-body">
          <small className="text-muted">
            {cardProperties(item).map(([key, property]) => (
              <span key={key} className="d-block">
                <strong>{property.title || key}:</strong> {textOf(entry[key])}
              </span>
            ))}
          </small>
          {errors.map(message => (
            <div key={message} className="small text-danger">
              {message}
            </div>
          ))}
        </div>
        <div className="card-footer d-flex justify-content-end gap-2">
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
  entryKey: PropTypes.string.isRequired,
  entry: PropTypes.object.isRequired,
  item: PropTypes.object.isRequired,
  errors: PropTypes.arrayOf(PropTypes.string).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

const DialogFields = ({ node, base, form, setForm, rules, Nested }) => (
  <>
    {dialogFields(node, base).map(field => {
      const name = nameOf(field.pointer);
      if (field.type === 'object' && field.additionalProperties) {
        return (
          <div key={field.pointer} className="col-12">
            <Nested
              pointer={field.pointer}
              title={field.title}
              item={field.additionalProperties}
              propertyNames={field.propertyNames}
              value={valueAt(form, field.pointer)}
              onChange={next => setForm(previous => setValueAt(previous, field.pointer, next))}
              rules={rules}
              nameFor={nameOf}
            />
          </div>
        );
      }
      if (field.type === 'object') {
        const child = node.properties[field.key];
        if (!child.properties) {
          return null;
        }
        return (
          <div key={field.pointer} className="col-12 mb-3">
            <h6>{field.title}</h6>
            <div className="row">
              <DialogFields
                node={child}
                base={field.pointer}
                form={form}
                setForm={setForm}
                rules={rules}
                Nested={Nested}
              />
            </div>
          </div>
        );
      }
      return (
        <div key={field.pointer} className={field.type === 'array' ? 'col-12' : 'col-md-6'}>
          <ConfigField
            field={field}
            id={rules.idFor(name)}
            value={valueAt(form, field.pointer)}
            error={rules.errors[name] || ''}
            onChange={next => setForm(previous => setValueAt(previous, field.pointer, next))}
            onBlur={() => rules.onBlur(name)}
          />
        </div>
      );
    })}
  </>
);

DialogFields.propTypes = {
  node: PropTypes.object.isRequired,
  base: PropTypes.string.isRequired,
  form: PropTypes.object.isRequired,
  setForm: PropTypes.func.isRequired,
  rules: formRulesShape.isRequired,
  Nested: PropTypes.elementType.isRequired,
};

const ObjectMap = ({
  pointer,
  title,
  item,
  propertyNames = null,
  value,
  onChange,
  rules,
  nameFor,
  Nested,
}) => {
  const { t } = useTranslation();
  const name = nameFor(pointer);
  const id = rules.idFor(name);
  const entries = entriesOf(value);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_KEY_FORM);
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
  const close = () => setEditing(null);
  const openAdd = () => {
    setForm(EMPTY_KEY_FORM);
    dialog.reset();
    setEditing('');
  };
  const openEdit = key => {
    setForm({ ...entriesOf(entries[key]), key });
    dialog.reset();
    setEditing(key);
  };
  const save = event => {
    event.preventDefault();
    if (!dialog.validateAll()) {
      return;
    }
    const { key, ...entry } = form;
    onChange({ ...entries, [key]: entry });
    close();
  };

  return (
    <>
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
                  entryKey={key}
                  entry={entriesOf(entry)}
                  item={item}
                  errors={errorsUnder(rules.errors, `${name}/${key}`)}
                  onEdit={() => openEdit(key)}
                  onDelete={() => onChange(without(entries, key))}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <Modal show={editing !== null} onHide={close} size="lg">
        <form onSubmit={save} noValidate>
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
              <DialogFields
                node={item}
                base=""
                form={form}
                setForm={setForm}
                rules={dialog}
                Nested={Nested}
              />
            </div>
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

ObjectMap.propTypes = { ...mapShape, Nested: PropTypes.elementType.isRequired };

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
 * every item property carrying `order` 1 or 2, with Add opening a dialog of
 * the item's fields (an object property with `properties` as a titled group
 * of its fields, recursively, and a nested `additionalProperties` item as
 * this component nested) and a key field validated against `propertyNames`
 * and the existing keys with `unique`, `params.scope` the map's `title`, and a
 * Delete on each card; a scalar item draws as key and value rows with Add
 * and Remove; an item that is itself a map draws this component nested per
 * entry; Add, Delete and Remove change the form alone through `onChange`
 * with the whole map, which reaches the backend in the next Update's merge
 * patch.
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
        Nested={ConfigMap}
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

ConfigMap.propTypes = mapShape;

export default ConfigMap;
