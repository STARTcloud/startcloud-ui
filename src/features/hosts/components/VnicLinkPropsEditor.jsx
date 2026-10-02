import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { fetchVnicProperties, setVnicProperties } from '../api/network';

const SPOOF_GUARDS = ['mac-nospoof', 'ip-nospoof', 'dhcp-nospoof', 'restricted'];

const displayValue = row => {
  if (row.value === null || row.value === undefined || row.value === '') {
    return row.default === null || row.default === undefined || row.default === ''
      ? 'n/a'
      : String(row.default);
  }
  return row.value;
};

const ProtectionRow = ({ row, value, onChange, disabled }) => {
  const { t } = useTranslation();
  const active = String(value ?? row.value ?? '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
  const guards = row.possible?.length > 0 ? row.possible : SPOOF_GUARDS;
  const toggle = guard => {
    const next = active.includes(guard)
      ? active.filter(entry => entry !== guard)
      : [...active, guard];
    onChange(next.join(','));
  };
  return (
    <div className="col-12">
      <span className="form-label small mb-1 d-block">
        protection{' '}
        <span className="text-muted">{t('machineEdit.vnicLinkPropsEditor.antiSpoofGuards')}</span>
      </span>
      <div className="d-flex flex-wrap gap-2">
        {guards.map(guard => (
          <div className="form-check" key={guard}>
            <input
              id={`vnic-protection-${guard}`}
              className="form-check-input"
              type="checkbox"
              checked={active.includes(guard)}
              onChange={() => toggle(guard)}
              disabled={disabled}
            />
            <label className="form-check-label small" htmlFor={`vnic-protection-${guard}`}>
              {guard}
            </label>
          </div>
        ))}
      </div>
      <span className="form-text text-muted small">
        {t('machineEdit.vnicLinkPropsEditor.protectionFooterIntro')} <code>mac-nospoof</code> +{' '}
        <code>ip-nospoof</code> {t('machineEdit.vnicLinkPropsEditor.protectionFooterTail')}
      </span>
    </div>
  );
};

ProtectionRow.propTypes = {
  row: PropTypes.object.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const PropertyField = ({ vnic, row, value, onChange, disabled }) => {
  const inputId = `vnic-${vnic}-${row.property}`;
  const shown = displayValue(row);
  return (
    <div className="col-6 col-md-3">
      <label className="form-label small mb-1" htmlFor={inputId}>
        {row.property}
      </label>
      {row.possible?.length > 0 ? (
        <select
          id={inputId}
          className="form-select form-select-sm"
          value={value}
          onChange={event => onChange(event.target.value)}
          disabled={disabled}
        >
          <option value="">
            {row.possible.some(option => String(option) === shown) ? `${shown} - Default` : shown}
          </option>
          {row.possible
            .filter(option => String(option) !== shown)
            .map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
        </select>
      ) : (
        <input
          id={inputId}
          className="form-control form-control-sm"
          placeholder={shown}
          value={value}
          onChange={event => onChange(event.target.value)}
          disabled={disabled}
        />
      )}
    </div>
  );
};

PropertyField.propTypes = {
  vnic: PropTypes.string.isRequired,
  row: PropTypes.object.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/**
 * The dladm link properties of one VNIC, hyperweaver-ui's editor under a
 * fold of the NIC's row: read once the fold opens, `GET
 * network/vnics/{vnic}/properties`, `protection` drawn as the anti-spoof
 * guards it lists and every other property as its value over its
 * default; Apply sends the changed properties alone, `PUT` on the same
 * path, its own queued task outside the machine's Apply, and one notice
 * says so.
 */
const VnicLinkPropsEditor = ({ status, hostId, vnic, disabled = false }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState({ rows: null, failed: false });
  const [edits, setEdits] = useState({});
  const [temporary, setTemporary] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      fetchVnicProperties(status, hostId, vnic).then(
        answer => {
          setRead({
            rows: Array.isArray(answer?.properties) ? answer.properties : [],
            failed: false,
          });
          setEdits({});
        },
        error => {
          setRead({ rows: [], failed: true });
          notify(
            'danger',
            t('machineEdit.vnicLinkPropsEditor.loadFailed', {
              vnic,
              status: error.status || '?',
              message: error.message,
            })
          );
        }
      ),
    [status, hostId, vnic, notify, t]
  );

  useEffect(() => {
    if (open) {
      load();
    }
  }, [open, load]);

  const save = async () => {
    const properties = Object.fromEntries(
      Object.entries(edits).filter(([, value]) => value !== undefined)
    );
    if (Object.keys(properties).length === 0) {
      notify('warning', t('machineEdit.vnicLinkPropsEditor.nothingChanged'));
      return;
    }
    setBusy(true);
    try {
      const answer = await setVnicProperties(status, hostId, vnic, {
        properties,
        ...(temporary && { temporary: true }),
      });
      notify(
        'success',
        `${answer?.message || t('machineEdit.vnicLinkPropsEditor.linkPropertiesQueued')}${
          answer?.task_id
            ? t('machineEdit.vnicLinkPropsEditor.taskSuffix', { taskId: answer.task_id })
            : ''
        }.`
      );
      setRead({ rows: null, failed: false });
      load();
    } catch (error) {
      notify('danger', error.message);
    } finally {
      setBusy(false);
    }
  };

  const { rows, failed } = read;
  const editable = (rows || []).filter(row => row.property !== 'protection');
  const protection = (rows || []).find(row => row.property === 'protection') || null;

  return (
    <div className="device-row device-child device-child-form" data-vnic-props={vnic}>
      <details className="w-100" onToggle={event => setOpen(event.currentTarget.open)}>
        <summary className="small fw-semibold">
          {t('machineEdit.vnicLinkPropsEditor.summary')}
        </summary>
        {open && rows === null ? (
          <p className="text-muted small mt-2 mb-0">
            <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
            {t('machineEdit.vnicLinkPropsEditor.readingLink')}
          </p>
        ) : null}
        {rows !== null && rows.length > 0 ? (
          <>
            <div className="row g-2 align-items-end mt-0">
              {protection ? (
                <ProtectionRow
                  row={protection}
                  value={edits.protection}
                  onChange={value => setEdits(prev => ({ ...prev, protection: value }))}
                  disabled={disabled || busy}
                />
              ) : null}
              {editable.map(row => (
                <PropertyField
                  key={row.property}
                  vnic={vnic}
                  row={row}
                  value={edits[row.property] ?? ''}
                  onChange={value => setEdits(prev => ({ ...prev, [row.property]: value }))}
                  disabled={disabled || busy}
                />
              ))}
            </div>
            <div className="d-flex align-items-center gap-3 mt-2">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                data-action="apply-link-properties"
                onClick={save}
                disabled={disabled || busy}
              >
                {t('machineEdit.vnicLinkPropsEditor.applyLinkProperties')}
              </button>
              <div className="form-check mb-0">
                <input
                  id={`vnic-${vnic}-temporary`}
                  className="form-check-input"
                  type="checkbox"
                  checked={temporary}
                  onChange={event => setTemporary(event.target.checked)}
                  disabled={disabled || busy}
                />
                <label className="form-check-label small" htmlFor={`vnic-${vnic}-temporary`}>
                  {t('machineEdit.vnicLinkPropsEditor.temporary')}
                </label>
              </div>
              <span className="text-muted small">
                {t('machineEdit.vnicLinkPropsEditor.appliesNow')}
              </span>
            </div>
          </>
        ) : null}
        {rows !== null && rows.length === 0 && !failed ? (
          <p className="text-muted small mt-2 mb-0">
            {t('machineEdit.vnicLinkPropsEditor.noProperties')}
          </p>
        ) : null}
      </details>
    </div>
  );
};

VnicLinkPropsEditor.propTypes = {
  status: PropTypes.object.isRequired,
  hostId: PropTypes.string.isRequired,
  vnic: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
};

export default VnicLinkPropsEditor;
