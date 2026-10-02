import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronDown, FaGripVertical, FaPlus, FaTrash } from 'react-icons/fa6';

import { applyPatch } from '../utils/provisioning';

/**
 * The ordered card list the Folders, Playbooks, Scripts and Hooks tabs
 * share, hyperweaver-ui's step list: numbered cards, a drag to reorder,
 * a chevron that opens the full field set and a trash, the array order
 * the sync and run order on the wire; a fresh row opens straight into
 * its fields.
 */
const StepCardList = ({ rows, onChange, disabled, addLabel, makeRow, renderTitle, renderBody }) => {
  const { t } = useTranslation();
  const [dragId, setDragId] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());

  const toggleExpanded = uiId =>
    setExpanded(previous => {
      const next = new Set(previous);
      if (next.has(uiId)) {
        next.delete(uiId);
      } else {
        next.add(uiId);
      }
      return next;
    });

  const moveOver = overId => {
    if (dragId === null || dragId === overId) {
      return;
    }
    const from = rows.findIndex(row => row._ui_id === dragId);
    const to = rows.findIndex(row => row._ui_id === overId);
    if (from === -1 || to === -1) {
      return;
    }
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const patchRow = (uiId, patch) =>
    onChange(rows.map(row => (row._ui_id === uiId ? applyPatch(row, patch) : row)));

  const addRow = () => {
    const row = makeRow();
    setExpanded(previous => new Set(previous).add(row._ui_id));
    onChange([...rows, row]);
  };

  return (
    <div className="d-flex flex-column gap-2" role="list">
      {rows.map((row, index) => (
        <div
          key={row._ui_id}
          className={`hw-role-card ${dragId === row._ui_id ? 'hw-dragging' : ''}`}
          role="listitem"
          onDragOver={event => {
            event.preventDefault();
            moveOver(row._ui_id);
          }}
        >
          <div className="hw-rc-head">
            <button
              type="button"
              className="btn btn-link p-0 text-muted hw-grip"
              draggable={!disabled}
              title={t('provisioning.provisioningStepList.dragToReorder')}
              onDragStart={() => setDragId(row._ui_id)}
              onDragEnd={() => setDragId(null)}
            >
              <FaGripVertical aria-hidden="true" />
            </button>
            <span className="hw-run-num">{index + 1}</span>
            <div className="hw-rc-name">{renderTitle(row)}</div>
            <div className="hw-rc-actions">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary hw-expander"
                title={t('provisioning.provisioningStepList.details')}
                aria-expanded={expanded.has(row._ui_id)}
                disabled={disabled}
                onClick={() => toggleExpanded(row._ui_id)}
              >
                <FaChevronDown aria-hidden="true" />
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                aria-label={t('provisioning.provisioningStepList.remove')}
                title={t('provisioning.provisioningStepList.remove')}
                disabled={disabled}
                onClick={() => onChange(rows.filter(entry => entry._ui_id !== row._ui_id))}
              >
                <FaTrash aria-hidden="true" />
              </button>
            </div>
          </div>
          {expanded.has(row._ui_id) ? (
            <div className="hw-rc-body">
              {renderBody(row, patch => patchRow(row._ui_id, patch))}
            </div>
          ) : null}
        </div>
      ))}
      <div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          data-action="step-add"
          onClick={addRow}
          disabled={disabled}
        >
          <FaPlus className="me-2" aria-hidden="true" />
          {addLabel}
        </button>
      </div>
    </div>
  );
};

StepCardList.propTypes = {
  rows: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  addLabel: PropTypes.string.isRequired,
  makeRow: PropTypes.func.isRequired,
  renderTitle: PropTypes.func.isRequired,
  renderBody: PropTypes.func.isRequired,
};

export default StepCardList;
