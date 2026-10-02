import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import StepCardList from './ProvisioningStepList';

const ScriptTitle = ({ row }) => {
  const { t } = useTranslation();
  return (
    <>
      <span className="hw-rc-role font-monospace">{row.script || '—'}</span>
      <span className="hw-chip hw-chip-tag">
        {t('provisioning.provisioningScriptsTab.runsEveryWalk')}
      </span>
    </>
  );
};

ScriptTitle.propTypes = {
  row: PropTypes.object.isRequired,
};

const ScriptBody = ({ row, patch, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="hw-rc-fields">
      <span className="hw-field">
        <label htmlFor={`script-path-${row._ui_id}`}>
          {t('provisioning.provisioningScriptsTab.scriptLabel')}
        </label>
        <input
          id={`script-path-${row._ui_id}`}
          className="form-control form-control-sm font-monospace hw-field-wide"
          type="text"
          placeholder="./scripts/aliases.sh"
          value={row.script ?? ''}
          disabled={disabled}
          onChange={event => patch({ script: event.target.value })}
        />
      </span>
    </div>
  );
};

ScriptBody.propTypes = {
  row: PropTypes.object.isRequired,
  patch: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/**
 * The Scripts tab of the provisioning editor: `provisioning.shell`, its
 * enabled switch and one card per script path in run order, each path a
 * bare string on the wire.
 */
const ProvisioningScriptsTab = ({ shell, onChange, makeRow, disabled }) => {
  const { t } = useTranslation();
  const scripts = Array.isArray(shell?.scripts) ? shell.scripts : [];
  return (
    <div>
      <p className="form-text text-muted mt-0 mb-2">
        {t('provisioning.provisioningScriptsTab.intro1')} <code>./scripts/aliases.sh</code>{' '}
        {t('provisioning.provisioningScriptsTab.intro2')} <code>shell</code>{' '}
        {t('provisioning.provisioningScriptsTab.intro3')} <code>vars</code>{' '}
        {t('provisioning.provisioningScriptsTab.intro4')}
      </p>
      <div className="form-check form-switch mb-2">
        <input
          id="prov-shell-enabled"
          className="form-check-input"
          type="checkbox"
          role="switch"
          checked={shell?.enabled === true || shell?.enabled === 'true'}
          disabled={disabled}
          onChange={event => onChange({ ...(shell || {}), enabled: event.target.checked })}
        />
        <label className="form-check-label" htmlFor="prov-shell-enabled">
          {t('provisioning.provisioningScriptsTab.enabledLabel')}
        </label>
      </div>
      <StepCardList
        rows={scripts}
        onChange={next => onChange({ ...(shell || {}), scripts: next })}
        disabled={disabled}
        addLabel={t('provisioning.provisioningScriptsTab.addScript')}
        makeRow={makeRow}
        renderTitle={row => <ScriptTitle row={row} />}
        renderBody={(row, patch) => <ScriptBody row={row} patch={patch} disabled={disabled} />}
      />
    </div>
  );
};

ProvisioningScriptsTab.propTypes = {
  shell: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  makeRow: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default ProvisioningScriptsTab;
