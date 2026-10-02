import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCircleInfo, FaPlus, FaTrash } from 'react-icons/fa6';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import {
  ROLE_NAME_PATTERN,
  VAR_NAME_PATTERN,
  applyPatch,
  structureOf,
  textToVar,
  varToText,
} from '../utils/provisioning';

export { VAR_NAME_PATTERN, ROLE_NAME_PATTERN, applyPatch, varToText, textToVar };

const LINES_ROWS = 3;

const YAML_ROWS = 6;

/**
 * A one-entry-per-line editor over a string list, the rsync arguments,
 * the excludes and the collections; it edits locally and commits the
 * cleaned list on blur, an empty list committed as undefined.
 */
export const LinesField = ({ id, label, lines, onCommit, disabled, placeholder }) => {
  const [draft, setDraft] = useState((lines || []).join('\n'));
  return (
    <div className="hw-lines-field">
      <label className="form-label small mb-1" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className="form-control form-control-sm font-monospace"
        rows={LINES_ROWS}
        value={draft}
        placeholder={placeholder}
        spellCheck={false}
        disabled={disabled}
        onChange={event => setDraft(event.target.value)}
        onBlur={() => {
          const list = draft
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);
          onCommit(list.length > 0 ? list : undefined);
        }}
      />
    </div>
  );
};

LinesField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  lines: PropTypes.array,
  onCommit: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  placeholder: PropTypes.string,
};

/**
 * A tri-state select over an optional boolean key: not set, true or
 * false.
 */
export const OptionalBoolSelect = ({ id, label, value, onChange, disabled }) => {
  const { t } = useTranslation();
  return (
    <span className="hw-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="form-select form-select-sm w-auto"
        value={value === undefined ? '' : String(value)}
        disabled={disabled}
        onChange={event =>
          onChange(event.target.value === '' ? undefined : event.target.value === 'true')
        }
      >
        <option value="">{t('provisioning.provisioningVarRows.notSetOption')}</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    </span>
  );
};

OptionalBoolSelect.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const yamlFromText = text => {
  const parsed = structureOf(text);
  return parsed ? stringifyYaml(parsed) : text;
};

const previewOf = text => {
  const parsed = structureOf(text);
  if (!parsed) {
    return text;
  }
  if (Array.isArray(parsed)) {
    return `[ ${parsed.length} item${parsed.length === 1 ? '' : 's'} ]`;
  }
  const keys = Object.keys(parsed).length;
  return `{ ${keys} key${keys === 1 ? '' : 's'} }`;
};

const specInfoText = (option, t) => {
  if (!option || !option.description) {
    return '';
  }
  const description = Array.isArray(option.description)
    ? option.description.join(' ')
    : String(option.description);
  const extras = [];
  if (option.default !== undefined) {
    extras.push(
      t('provisioning.provisioningVarRows.specDefault', { value: varToText(option.default) })
    );
  }
  if (option.required) {
    extras.push(t('provisioning.provisioningVarRows.specRequired'));
  }
  return extras.length > 0 ? `${description} (${extras.join(', ')})` : description;
};

const InfoTip = ({ text }) => {
  const { t } = useTranslation();
  const [pinned, setPinned] = useState(false);
  return (
    <span className={`hw-tip-wrap ${pinned ? 'hw-tip-pinned' : ''}`}>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        aria-label={t('provisioning.provisioningVarRows.aboutVariableAriaLabel')}
        onClick={() => setPinned(previous => !previous)}
      >
        <FaCircleInfo aria-hidden="true" />
      </button>
      <span className="hw-tip" role="tooltip">
        {text}
      </span>
    </span>
  );
};

InfoTip.propTypes = {
  text: PropTypes.string.isRequired,
};

const parses = value => {
  if (value.trim() === '') {
    return false;
  }
  try {
    parseYaml(value);
    return true;
  } catch {
    return false;
  }
};

const YamlValueEditor = ({ initialText, onCommit, disabled }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(() => yamlFromText(initialText));
  const [invalid, setInvalid] = useState(false);
  return (
    <>
      <textarea
        className={`form-control form-control-sm font-monospace hw-yaml-edit ${
          invalid ? 'is-invalid' : ''
        }`}
        rows={YAML_ROWS}
        value={draft}
        spellCheck={false}
        disabled={disabled}
        aria-label={t('provisioning.provisioningVarRows.variableValueYamlAriaLabel')}
        onChange={event => {
          setDraft(event.target.value);
          setInvalid(!parses(event.target.value) && event.target.value.trim() !== '');
        }}
        onBlur={() => {
          if (parses(draft)) {
            onCommit(JSON.stringify(parseYaml(draft)));
          }
        }}
      />
      {invalid ? (
        <div className="hw-invalid-msg">{t('provisioning.provisioningVarRows.notValidYaml')}</div>
      ) : null}
    </>
  );
};

YamlValueEditor.propTypes = {
  initialText: PropTypes.string.isRequired,
  onCommit: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const ValueArea = ({ valueText, valText, expanded, disabled, onValText, onExpand, onDone }) => {
  const { t } = useTranslation();
  const structured = structureOf(valueText) !== null;
  if (expanded) {
    return (
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={onDone}
        disabled={disabled}
      >
        {t('provisioning.provisioningVarRows.doneButton')}
      </button>
    );
  }
  if (structured) {
    return (
      <>
        <span
          className="hw-val-preview"
          title={t('provisioning.provisioningVarRows.structurePreviewTitle', {
            type: Array.isArray(structureOf(valueText)) ? 'list' : 'dict',
          })}
        >
          {previewOf(valueText)}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary font-monospace"
          title={t('provisioning.provisioningVarRows.editAsYaml')}
          onClick={onExpand}
          disabled={disabled}
        >
          {'{ }'}
        </button>
      </>
    );
  }
  return (
    <>
      <input
        className="form-control form-control-sm font-monospace hw-var-value"
        type="text"
        placeholder={t('provisioning.provisioningVarRows.valuePlaceholder')}
        aria-label={t('provisioning.provisioningVarRows.variableValueAriaLabel')}
        value={valText}
        disabled={disabled}
        onChange={event => onValText(event.target.value)}
        onBlur={() => onValText(valText, true)}
      />
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary font-monospace"
        title={t('provisioning.provisioningVarRows.editAsYamlListsDicts')}
        onClick={onExpand}
        disabled={disabled}
      >
        {'{ }'}
      </button>
    </>
  );
};

ValueArea.propTypes = {
  valueText: PropTypes.string.isRequired,
  valText: PropTypes.string.isRequired,
  expanded: PropTypes.bool.isRequired,
  disabled: PropTypes.bool,
  onValText: PropTypes.func.isRequired,
  onExpand: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
};

const VarRow = ({ name, valueText, info, listId, disabled, onRename, onValueText, onRemove }) => {
  const { t } = useTranslation();
  const [keyText, setKeyText] = useState(name);
  const [valText, setValText] = useState(valueText);
  const [expanded, setExpanded] = useState(false);
  const trimmedKey = keyText.trim();
  const badKey = trimmedKey !== '' && !VAR_NAME_PATTERN.test(trimmedKey);

  const commitKey = () => {
    if (trimmedKey !== name && !badKey) {
      onRename(trimmedKey);
    }
  };

  const changeValue = (text, commit = false) => {
    setValText(text);
    if (commit && text !== valueText) {
      onValueText(text);
    }
  };

  return (
    <div className="hw-var-row-box">
      <div className="hw-var-row">
        <input
          className={`form-control form-control-sm font-monospace hw-var-key ${
            badKey ? 'is-invalid' : ''
          }`}
          type="text"
          list={listId}
          placeholder={t('provisioning.provisioningVarRows.variableNamePlaceholder')}
          aria-label={t('provisioning.provisioningVarRows.variableNameAriaLabel')}
          value={keyText}
          disabled={disabled}
          onChange={event => setKeyText(event.target.value)}
          onBlur={commitKey}
        />
        <ValueArea
          valueText={valueText}
          valText={valText}
          expanded={expanded}
          disabled={disabled}
          onValText={changeValue}
          onExpand={() => setExpanded(true)}
          onDone={() => setExpanded(false)}
        />
        {info ? <InfoTip text={info} /> : null}
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          aria-label={t('provisioning.provisioningVarRows.removeVariableAriaLabel')}
          onClick={onRemove}
          disabled={disabled}
        >
          <FaTrash aria-hidden="true" />
        </button>
      </div>
      {expanded ? (
        <YamlValueEditor initialText={valueText} onCommit={onValueText} disabled={disabled} />
      ) : null}
      {badKey ? (
        <div className="hw-invalid-msg">{t('provisioning.provisioningVarRows.varNameRule')}</div>
      ) : null}
    </div>
  );
};

VarRow.propTypes = {
  name: PropTypes.string.isRequired,
  valueText: PropTypes.string.isRequired,
  info: PropTypes.string,
  listId: PropTypes.string,
  disabled: PropTypes.bool,
  onRename: PropTypes.func.isRequired,
  onValueText: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

/**
 * The free key and value rows over one variables map, hyperweaver-ui's
 * variable rows, the document's `vars` and `environment` verbatim: a
 * scalar edits inline, a list or a dict collapses to a preview and opens
 * a YAML editor, the registry's argument spec offering name completion
 * and an info tip where it documents the variable; committed rows write
 * through `onChange`, a draft added by the plus button living locally
 * until its name commits.
 */
export const VarRowList = ({ idPrefix, entries, onChange, specOptions, disabled, addLabel }) => {
  const { t } = useTranslation();
  const [drafts, setDrafts] = useState([]);
  const [draftSeq, setDraftSeq] = useState(0);
  const knownNames = specOptions ? Object.keys(specOptions) : [];
  const listId = knownNames.length > 0 ? `${idPrefix}-known-vars` : undefined;

  const renameEntry = (oldName, nextName) => {
    const next = {};
    Object.entries(entries).forEach(([key, value]) => {
      if (key === oldName) {
        if (nextName) {
          next[nextName] = value;
        }
      } else {
        next[key] = value;
      }
    });
    onChange(next);
  };

  const commitDraft = (draft, name) => {
    setDrafts(previous => previous.filter(entry => entry.id !== draft.id));
    if (name) {
      onChange({ ...entries, [name]: textToVar(draft.value) });
    }
  };

  const addDraft = () => {
    setDrafts(previous => [...previous, { id: `draft-${draftSeq}`, key: '', value: '' }]);
    setDraftSeq(previous => previous + 1);
  };

  return (
    <div className="hw-var-rows">
      {listId ? (
        <datalist id={listId}>
          {knownNames.map(known => (
            <option key={known} value={known} />
          ))}
        </datalist>
      ) : null}
      {Object.entries(entries).map(([name, value]) => (
        <VarRow
          key={`${name}:${varToText(value)}`}
          name={name}
          valueText={varToText(value)}
          info={specInfoText(specOptions?.[name], t)}
          listId={listId}
          disabled={disabled}
          onRename={next => renameEntry(name, next)}
          onValueText={text => onChange({ ...entries, [name]: textToVar(text) })}
          onRemove={() => renameEntry(name, '')}
        />
      ))}
      {drafts.map(draft => (
        <VarRow
          key={draft.id}
          name={draft.key}
          valueText={draft.value}
          info={specInfoText(specOptions?.[draft.key], t)}
          listId={listId}
          disabled={disabled}
          onRename={next => commitDraft(draft, next)}
          onValueText={text =>
            setDrafts(previous =>
              previous.map(entry => (entry.id === draft.id ? { ...entry, value: text } : entry))
            )
          }
          onRemove={() => setDrafts(previous => previous.filter(entry => entry.id !== draft.id))}
        />
      ))}
      <div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={addDraft}
          disabled={disabled}
        >
          <FaPlus className="me-2" aria-hidden="true" />
          {addLabel}
        </button>
      </div>
    </div>
  );
};

VarRowList.propTypes = {
  idPrefix: PropTypes.string.isRequired,
  entries: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  specOptions: PropTypes.object,
  disabled: PropTypes.bool,
  addLabel: PropTypes.string.isRequired,
};

export default VarRowList;
