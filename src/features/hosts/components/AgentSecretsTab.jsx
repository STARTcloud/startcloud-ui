import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCircleInfo, FaFloppyDisk, FaPlus, FaRotate, FaTrash } from 'react-icons/fa6';

import SectionCard, { foldsShape } from '../../../components/common/SectionCard';
import { useStatus } from '../../../contexts/StatusContext';
import { fetchSecrets, saveSecrets } from '../api/agentSettings';
import { useManageRead, useManageSend } from '../hooks/useHostManage';
import {
  SECRET_CATEGORIES,
  emptySecretEntry,
  savedSecretEntries,
  secretEntriesOf,
} from '../utils/agentSettings';

let keySeed = 0;

const freshKey = () => {
  keySeed += 1;
  return `s${keySeed}`;
};

const rowsOf = entries => entries.map(values => ({ key: freshKey(), values }));

const draftOf = document =>
  Object.fromEntries(
    SECRET_CATEGORIES.map(category => [
      category.key,
      rowsOf(secretEntriesOf(document, category.key)),
    ])
  );

const EntryField = ({ category, field, row, onChange }) => {
  const { t } = useTranslation();
  const inputId = `secret-${category.key}-${row.key}-${field.key}`;
  const value = row.values[field.key];
  if (field.type === 'checkbox') {
    return (
      <div className="col-6 col-md-2">
        <div className="form-check form-switch mt-4">
          <input
            id={inputId}
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={Boolean(value)}
            onChange={event => onChange(field.key, event.target.checked)}
          />
          <label className="form-check-label small" htmlFor={inputId}>
            {t(field.labelKey)}
          </label>
        </div>
      </div>
    );
  }
  return (
    <div className={field.multiline ? 'col-12 col-md-8' : 'col-12 col-md-3'}>
      <label className="form-label small mb-1" htmlFor={inputId}>
        {t(field.labelKey)}
      </label>
      {field.multiline ? (
        <textarea
          id={inputId}
          className="form-control form-control-sm font-monospace"
          rows={3}
          value={value ?? ''}
          onChange={event => onChange(field.key, event.target.value)}
        />
      ) : (
        <input
          id={inputId}
          className="form-control form-control-sm"
          type="text"
          value={value ?? ''}
          onChange={event => onChange(field.key, event.target.value)}
        />
      )}
    </div>
  );
};

EntryField.propTypes = {
  category: PropTypes.object.isRequired,
  field: PropTypes.object.isRequired,
  row: PropTypes.shape({ key: PropTypes.string.isRequired, values: PropTypes.object.isRequired })
    .isRequired,
  onChange: PropTypes.func.isRequired,
};

const CategoryActions = ({ busy, onAdd, onSave }) => {
  const { t } = useTranslation();
  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        data-action="secret-add"
        onClick={onAdd}
        disabled={busy}
      >
        <FaPlus className="me-2" aria-hidden="true" />
        {t('agentSettings.agentSecretsTab.addButton')}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        data-action="secret-save"
        onClick={onSave}
        disabled={busy}
      >
        <FaFloppyDisk className="me-2" aria-hidden="true" />
        {t('agentSettings.agentSecretsTab.saveButton')}
      </button>
    </>
  );
};

CategoryActions.propTypes = {
  busy: PropTypes.bool.isRequired,
  onAdd: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

const CategoryCard = ({ category, rows, busy, folds, onRows, onSave }) => {
  const { t } = useTranslation();
  const fold = `secrets-${category.key}`;
  const title = t(category.labelKey);
  const actions = (
    <CategoryActions
      busy={busy}
      onAdd={() =>
        onRows(current => [...current, { key: freshKey(), values: emptySecretEntry(category) }])
      }
      onSave={onSave}
    />
  );
  return (
    <SectionCard
      id={fold}
      title={title}
      badge={<span className="badge text-bg-light">{rows.length}</span>}
      actions={actions}
      folded={folds.folded(fold)}
      onFold={() => folds.toggle(fold)}
    >
      {rows.length === 0 ? (
        <p className="text-muted small mb-0">{t('agentSettings.agentSecretsTab.noEntries')}</p>
      ) : null}
      {rows.map(row => (
        <div className="row g-2 align-items-end border-bottom py-2" key={row.key}>
          {category.fields.map(field => (
            <EntryField
              key={field.key}
              category={category}
              field={field}
              row={row}
              onChange={(fieldKey, value) =>
                onRows(current =>
                  current.map(other =>
                    other.key === row.key
                      ? { ...other, values: { ...other.values, [fieldKey]: value } }
                      : other
                  )
                )
              }
            />
          ))}
          <div className="col-auto ms-auto">
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              data-action="secret-remove"
              aria-label={t('agentSettings.agentSecretsTab.removeEntryAriaLabel', {
                category: t(category.labelKey),
              })}
              onClick={() => onRows(current => current.filter(other => other.key !== row.key))}
              disabled={busy}
            >
              <FaTrash aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
    </SectionCard>
  );
};

CategoryCard.propTypes = {
  category: PropTypes.object.isRequired,
  rows: PropTypes.arrayOf(PropTypes.object).isRequired,
  busy: PropTypes.bool.isRequired,
  folds: foldsShape.isRequired,
  onRows: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

/**
 * The Global secrets tab of the Agent settings page, hyperweaver-ui's
 * `AgentSecretsTab`, behind the host's `secrets` token: the six
 * categories of `GET secrets`, one section card each, its entries
 * edited plain, added and removed, and saved per category as
 * `PUT secrets` with the category's entries that carry a name, one
 * request and one notice, the document read again once after it. The
 * document reads once as the tab draws, again when the stream opens
 * fresh or answers `reset`, on the page's Refresh and on Reload.
 */
const AgentSecretsTab = ({ id, folds }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const secrets = useManageRead(
    useCallback(() => fetchSecrets(status, id), [status, id]),
    true
  );
  const { send, busy } = useManageSend(id);
  const [held, setHeld] = useState({ source: undefined, draft: null });
  const source = secrets.loaded && !secrets.failed ? secrets.data : null;
  if (held.source !== source) {
    setHeld({ source, draft: source ? draftOf(source) : null });
  }
  const { draft } = held;

  const setRows = (categoryKey, update) =>
    setHeld(current => ({
      ...current,
      draft: { ...current.draft, [categoryKey]: update(current.draft[categoryKey]) },
    }));

  const save = async category => {
    const entries = savedSecretEntries(draft[category.key].map(row => row.values));
    const { error } = await send({
      call: () => saveSecrets(status, id, { [category.key]: entries }),
      doneKey: 'agentSettings.agentSecretsTab.categorySaved',
      values: { category: t(category.labelKey) },
      failKey: 'agentSettings.agentSecretsTab.failedSaveCategory',
    });
    if (!error) {
      secrets.refresh();
    }
  };

  return (
    <div data-panel="secrets">
      <div className="alert alert-info py-2 d-flex justify-content-between align-items-start gap-3">
        <span>
          <FaCircleInfo className="me-2" aria-hidden="true" />
          {t('agentSettings.agentSecretsTab.infoPart1')}
          <code>SECRETS_*</code>
          {t('agentSettings.agentSecretsTab.infoPart2')}
          <code>[a-zA-Z0-9_-]+</code>
          {t('agentSettings.agentSecretsTab.infoPart3')}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary flex-shrink-0"
          data-action="secrets-reload"
          onClick={secrets.refresh}
          disabled={busy}
        >
          <FaRotate className="me-2" aria-hidden="true" />
          {t('agentSettings.agentSecretsTab.reloadButton')}
        </button>
      </div>
      {secrets.failed ? (
        <div className="alert alert-danger py-2" role="alert" data-note="secrets-failed">
          {t('agentSettings.agentSecretsTab.failedLoadSecrets', { message: secrets.message })}
        </div>
      ) : null}
      {!secrets.loaded ? (
        <p className="text-muted">{t('agentSettings.agentSecretsTab.loadingText')}</p>
      ) : null}
      {draft
        ? SECRET_CATEGORIES.map(category => (
            <CategoryCard
              key={category.key}
              category={category}
              rows={draft[category.key]}
              busy={busy}
              folds={folds}
              onRows={update => setRows(category.key, update)}
              onSave={() => save(category)}
            />
          ))
        : null}
    </div>
  );
};

AgentSecretsTab.propTypes = {
  id: PropTypes.string.isRequired,
  folds: foldsShape.isRequired,
};

export default AgentSecretsTab;
