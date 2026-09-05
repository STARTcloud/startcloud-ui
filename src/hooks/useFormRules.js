import PropTypes from 'prop-types';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { rules } from '../lib/runtime';
import { DEFS, messageFor, validateObject } from '../utils/validation';

const FALLBACK_DOCUMENT = { $defs: DEFS };
const CLIENT_KEYS = ['equals', 'custom', 'dependsOn', 'showWhen', 'title'];
const EMPTY_SERVER = { fields: {}, orphans: [] };

export const formRulesShape = PropTypes.shape({
  errors: PropTypes.objectOf(PropTypes.string).isRequired,
  touched: PropTypes.objectOf(PropTypes.bool).isRequired,
  summary: PropTypes.arrayOf(
    PropTypes.shape({ id: PropTypes.string.isRequired, message: PropTypes.string.isRequired })
  ).isRequired,
  onBlur: PropTypes.func.isRequired,
  validateAll: PropTypes.func.isRequired,
  applyServerErrors: PropTypes.func.isRequired,
  clear: PropTypes.func.isRequired,
  reset: PropTypes.func.isRequired,
  idFor: PropTypes.func.isRequired,
  labelFor: PropTypes.func.isRequired,
});

const pick = (source, keys) =>
  Object.fromEntries(Object.entries(source || {}).filter(([key]) => keys.includes(key)));

const requiredOnly = schema => ({
  required: schema.required || [],
  properties: Object.fromEntries(
    Object.entries(schema.properties || {}).map(([name, property]) => [
      name,
      pick(property, CLIENT_KEYS),
    ])
  ),
});

const declaredOnly = (host, page) => {
  const declared = Object.keys(page.properties || {});
  const properties = Object.fromEntries(
    declared.map(name => [
      name,
      { ...(host.properties[name] || {}), ...pick(page.properties[name], CLIENT_KEYS) },
    ])
  );
  const dependentRequired = Object.fromEntries(
    Object.entries(host.dependentRequired || {})
      .filter(([key]) => declared.includes(key))
      .map(([key, needs]) => [key, needs.filter(name => declared.includes(name))])
  );
  return {
    ...host,
    required: (host.required || []).filter(name => declared.includes(name)),
    dependentRequired,
    properties,
  };
};

const effectiveSchema = (formKey, schema) => {
  if (!formKey) {
    return schema;
  }
  const host = rules?.forms?.[formKey];
  return host && host.properties ? declaredOnly(host, schema) : requiredOnly(schema);
};

const readAt = (values, name) =>
  name
    .split('/')
    .reduce(
      (node, segment) => (node && typeof node === 'object' ? node[segment] : undefined),
      values
    );

const collectNames = ({ schema, values, base, names }) => {
  Object.entries(schema.properties || {}).forEach(([key, property]) => {
    const name = base ? `${base}/${key}` : key;
    if (property.properties) {
      collectNames({ schema: property, values: values?.[key], base: name, names });
      return;
    }
    if (property.additionalProperties && typeof property.additionalProperties === 'object') {
      Object.keys(values?.[key] && typeof values[key] === 'object' ? values[key] : {}).forEach(
        entry => names.push(`${name}/${entry}`)
      );
      return;
    }
    names.push(name);
  });
};

const fieldNames = (schema, values) => {
  const names = [];
  collectNames({ schema, values, base: '', names });
  return names;
};

const titleOf = (schema, name) => {
  const property = name.split('/').reduce((node, segment) => node?.properties?.[segment], schema);
  return property?.title || '';
};

const without = (map, name) =>
  Object.fromEntries(Object.entries(map).filter(([key]) => key !== name));

/**
 * The blur-and-submit validation of one form over the host's rules: the
 * host's `rules.forms[formKey]` when the host lists the form, applied to
 * the properties the page's `schema` declares and to no other (the page
 * contributes its client-only `equals`, `custom`, `dependsOn` and
 * `showWhen` entries), the page's `schema` reduced to `required` when the
 * host does not list it, and the `schema` itself when no `formKey` is
 * given (the config pages).
 * Nothing runs while typing; `onBlur(name)` marks a failing field, a marked
 * field is re-evaluated on every change so its error clears the moment the
 * value is right, `validateAll()` marks every failing field and answers
 * whether the form may submit, and `applyServerErrors(apiError)` paints an
 * `ApiError`'s `fieldErrors` by pointer, entries matching no field kept for
 * the summary. `labels` maps a field name to the translation key of its
 * label and must be a stable object; a config schema's `title` is the label
 * when no entry names it.
 *
 * @param {Object} options - The form
 * @param {string} [options.formKey] - The host form the values belong to
 * @param {Object} options.schema - The page's schema, or the config schema
 * @param {Object} options.values - The form's values, keyed by field name, nested for a config file
 * @param {Object} [options.labels] - Field name to translation key of the label
 * @param {string} [options.idPrefix] - The prefix of every control id, the form key by default
 * @returns {Object} `errors`, `touched`, `summary`, `onBlur`, `validateAll`, `applyServerErrors`, `clear`, `reset`, `idFor`, `labelFor`
 */
export const useFormRules = ({ formKey = '', schema, values, labels = null, idPrefix = '' }) => {
  const { t } = useTranslation();
  const [marked, setMarked] = useState({});
  const [touched, setTouched] = useState({});
  const [server, setServer] = useState(EMPTY_SERVER);
  const [submitted, setSubmitted] = useState(false);
  const document = rules || FALLBACK_DOCUMENT;
  const prefix = idPrefix || formKey || 'form';

  const effective = useMemo(() => effectiveSchema(formKey, schema), [formKey, schema]);
  const names = useMemo(() => fieldNames(effective, values), [effective, values]);
  const evaluated = useMemo(
    () => validateObject(effective, values, document),
    [effective, values, document]
  );

  const idFor = useCallback(name => `${prefix}-${name.replace(/\//g, '-')}`, [prefix]);

  const labelFor = useCallback(
    name => {
      if (labels?.[name]) {
        return t(labels[name]);
      }
      return titleOf(effective, name) || name.split('/').pop();
    },
    [labels, effective, t]
  );

  const messageOf = useCallback(
    (name, error) => {
      const params =
        error.rule === 'equals'
          ? { ...error.params, other: labelFor(error.params.other) }
          : error.params;
      return messageFor({ ...error, params }, labelFor(name), t);
    },
    [labelFor, t]
  );

  const errors = useMemo(() => {
    const shown = {};
    evaluated.forEach(error => {
      const name = error.pointer.slice(1);
      if (marked[name] && !shown[name]) {
        shown[name] = messageOf(name, error);
      }
    });
    Object.entries(server.fields).forEach(([name, entry]) => {
      if (!shown[name] && readAt(values, name) === entry.value) {
        const params = { ...(entry.error.params || {}), value: entry.value };
        shown[name] = messageOf(name, { ...entry.error, params });
      }
    });
    return shown;
  }, [evaluated, marked, server, values, messageOf]);

  const summary = useMemo(() => {
    const serverSeen = Object.keys(server.fields).length > 0 || server.orphans.length > 0;
    if (!submitted && !serverSeen) {
      return [];
    }
    const listed = names
      .filter(name => errors[name])
      .map(name => ({ id: idFor(name), message: errors[name] }));
    const orphans = server.orphans.map(error => ({
      id: '',
      message: messageOf(error.pointer.slice(1), error),
    }));
    return [...listed, ...orphans];
  }, [submitted, server, names, errors, idFor, messageOf]);

  const onBlur = useCallback(
    name => {
      setTouched(current => ({ ...current, [name]: true }));
      if (evaluated.some(error => error.pointer === `/${name}`)) {
        setMarked(current => ({ ...current, [name]: true }));
      }
    },
    [evaluated]
  );

  const validateAll = useCallback(() => {
    const failing = evaluated.map(error => error.pointer.slice(1));
    setMarked(Object.fromEntries(failing.map(name => [name, true])));
    setServer(EMPTY_SERVER);
    setSubmitted(failing.length > 0);
    return failing.length === 0;
  }, [evaluated]);

  const applyServerErrors = useCallback(
    apiError => {
      const entries = Array.isArray(apiError?.fieldErrors) ? apiError.fieldErrors : [];
      if (entries.length === 0) {
        return false;
      }
      const fields = {};
      const orphans = [];
      entries.forEach(error => {
        const name = String(error.pointer || '').replace(/^\//, '');
        if (names.includes(name)) {
          fields[name] = { error, value: readAt(values, name) };
        } else {
          orphans.push({ ...error, pointer: `/${name}` });
        }
      });
      setServer({ fields, orphans });
      return true;
    },
    [names, values]
  );

  const clear = useCallback(name => {
    setMarked(current => without(current, name));
    setServer(current => ({ ...current, fields: without(current.fields, name) }));
  }, []);

  const reset = useCallback(() => {
    setMarked({});
    setTouched({});
    setServer(EMPTY_SERVER);
    setSubmitted(false);
  }, []);

  return useMemo(
    () => ({
      errors,
      touched,
      summary,
      onBlur,
      validateAll,
      applyServerErrors,
      clear,
      reset,
      idFor,
      labelFor,
    }),
    [
      errors,
      touched,
      summary,
      onBlur,
      validateAll,
      applyServerErrors,
      clear,
      reset,
      idFor,
      labelFor,
    ]
  );
};
