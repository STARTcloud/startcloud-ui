import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import Field from '../../../../components/common/Field';
import FormErrorSummary from '../../../../components/common/FormErrorSummary';
import { useFormRules } from '../../../../hooks/useFormRules';
import { downloadsAdapter } from '../api/adapter';
import { BULK_FORMS, MOVE_LEVELS, bulkSchemaOf } from '../bulkForms';

import { SelectField, TextAreaField, TextField } from './fields';

const DIALOG_LEVELS = ['items', 'versions', 'providers', 'architectures'];

const emptyDraft = level =>
  Object.fromEntries(BULK_FORMS[level].fields.map(field => [field.name, '']));

const BulkField = ({ field, draft, rules, onChange, blank }) => {
  if (field.control === 'textarea') {
    return <TextAreaField name={field.name} draft={draft} rules={rules} onChange={onChange} />;
  }
  if (field.control === 'select') {
    return (
      <SelectField
        name={field.name}
        group={field.group}
        options={field.options}
        draft={draft}
        rules={rules}
        onChange={onChange}
        blank={blank}
      />
    );
  }
  return (
    <TextField
      name={field.name}
      type={field.type || 'text'}
      draft={draft}
      rules={rules}
      onChange={onChange}
    />
  );
};

BulkField.propTypes = {
  field: PropTypes.shape({
    name: PropTypes.string.isRequired,
    control: PropTypes.string.isRequired,
    type: PropTypes.string,
    options: PropTypes.arrayOf(PropTypes.string),
    group: PropTypes.string,
  }).isRequired,
  draft: PropTypes.object.isRequired,
  rules: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  blank: PropTypes.string.isRequired,
};

/**
 * The Set values dialog of one downloads level: the level's fields from
 * `BULK_FORMS`, validated against the host's bulk form, every member
 * blank until typed and only the touched ones sent as `values`, so a
 * member left alone stays as it is on every picked row and a link typed
 * then emptied clears.
 */
export const SetValuesDialog = ({ level, count, onSubmit, onClose }) => {
  const { t } = useTranslation();
  const form = BULK_FORMS[level];
  const schema = useMemo(() => bulkSchemaOf(level), [level]);
  const [draft, setDraft] = useState(() => emptyDraft(level));
  const [touched, setTouched] = useState(() => new Set());
  const rules = useFormRules({
    formKey: form.formKey,
    schema,
    values: draft,
    labels: form.labels,
    idPrefix: `bulk-${level}`,
  });

  const onChange = useCallback(event => {
    const { name, value } = event.target;
    setDraft(current => ({ ...current, [name]: value }));
    setTouched(current => new Set([...current, name]));
  }, []);

  const submit = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    const values = Object.fromEntries([...touched].map(name => [name, draft[name]]));
    onSubmit({ values });
  };

  return (
    <Modal show onHide={onClose} dialogClassName="list-modal" scrollable>
      <form onSubmit={submit} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h5">{t('pages.bulk.valuesTitle', { count })}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormErrorSummary errors={rules.summary} />
          {form.fields.map(field => (
            <BulkField
              key={field.name}
              field={field}
              draft={draft}
              rules={rules}
              onChange={onChange}
              blank={t('pages.bulk.unchanged')}
            />
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            {t('pages.confirm.cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={touched.size === 0}>
            {t('pages.bulk.apply')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

SetValuesDialog.propTypes = {
  level: PropTypes.oneOf(DIALOG_LEVELS).isRequired,
  count: PropTypes.number.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

const useOrgProducts = org => {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let mounted = true;
    downloadsAdapter
      .listOrg(org)
      .then(loaded => {
        if (mounted) {
          setItems(loaded);
        }
      })
      .catch(() => null);
    return () => {
      mounted = false;
    };
  }, [org]);
  return items;
};

const releasesOf = (items, product) => items.find(item => item.name === product)?.versions || [];

const patchesOf = (items, product, release) =>
  releasesOf(items, product).find(version => version.version === release)?.providers || [];

const namesFor = (part, items, target) => {
  if (part === 'product') {
    return items.map(item => item.name);
  }
  if (part === 'release') {
    return releasesOf(items, target.product).map(version => version.version);
  }
  return patchesOf(items, target.product, target.release).map(patch => patch.name);
};

const TargetSelect = ({ part, names, value, onChange }) => {
  const { t } = useTranslation();
  const id = `move-${part}`;
  return (
    <Field id={id} label={t(`downloads.place.${part}`)} className="mb-2">
      {aria => (
        <select
          {...aria}
          className="form-select"
          value={value}
          onChange={event => onChange(part, event.target.value)}
        >
          {names.map(name => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
};

TargetSelect.propTypes = {
  part: PropTypes.oneOf(['product', 'release', 'patch']).isRequired,
  names: PropTypes.arrayOf(PropTypes.string).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

const settled = (names, value) => (names.includes(value) ? value : names[0] || '');

/**
 * The Move to dialog of a downloads release, patch or file: one picker per
 * level above the row, product alone for a release, product and release
 * for a patch, all three for a file, each defaulting to the row's current
 * place and the lower pickers following the higher ones; answers the
 * target as the wire's `download`, `release` and `patch` members.
 */
export const MoveDialog = ({ level, scope, count, onSubmit, onClose }) => {
  const { t } = useTranslation();
  const items = useOrgProducts(scope.org);
  const parts = MOVE_LEVELS[level];
  const [target, setTarget] = useState({
    product: scope.name || '',
    release: scope.version || '',
    patch: scope.provider || '',
  });

  const onChange = (part, value) => {
    setTarget(current => {
      const next = { ...current, [part]: value };
      if (part === 'product') {
        next.release = settled(namesFor('release', items, next), current.release);
      }
      if (part !== 'patch') {
        next.patch = settled(namesFor('patch', items, next), current.patch);
      }
      return next;
    });
  };

  const submit = event => {
    event.preventDefault();
    onSubmit({
      download: target.product,
      ...(parts.includes('release') ? { release: target.release } : {}),
      ...(parts.includes('patch') ? { patch: target.patch } : {}),
    });
  };

  return (
    <Modal show onHide={onClose} dialogClassName="list-modal">
      <form onSubmit={submit} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h5">{t('pages.bulk.moveTitle', { count })}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {parts.map(part => (
            <TargetSelect
              key={part}
              part={part}
              names={namesFor(part, items, target)}
              value={target[part]}
              onChange={onChange}
            />
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            {t('pages.confirm.cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={!target.product}>
            {t('pages.bulk.move')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

MoveDialog.propTypes = {
  level: PropTypes.oneOf(Object.keys(MOVE_LEVELS)).isRequired,
  scope: PropTypes.shape({
    org: PropTypes.string.isRequired,
    name: PropTypes.string,
    version: PropTypes.string,
    provider: PropTypes.string,
  }).isRequired,
  count: PropTypes.number.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * The downloads collection's `BulkDialog` slot: the Set values dialog for
 * an action naming `values`, the Move to dialog for one naming `move`,
 * the picked rows' one scope handed to the latter.
 */
export const DownloadBulkDialog = ({ action, level, groups, count, onSubmit, onClose }) => {
  if (action.dialog === 'move') {
    return (
      <MoveDialog
        level={level}
        scope={groups[0].scope}
        count={count}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    );
  }
  return <SetValuesDialog level={level} count={count} onSubmit={onSubmit} onClose={onClose} />;
};

DownloadBulkDialog.propTypes = {
  action: PropTypes.shape({ dialog: PropTypes.string.isRequired }).isRequired,
  level: PropTypes.oneOf(DIALOG_LEVELS).isRequired,
  groups: PropTypes.arrayOf(PropTypes.shape({ scope: PropTypes.object.isRequired })).isRequired,
  count: PropTypes.number.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
