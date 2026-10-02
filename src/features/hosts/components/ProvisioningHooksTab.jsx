import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import StepCardList from './ProvisioningStepList';

const HOOK_TARGETS = ['guest', 'host'];
const HOOK_FAILURE = ['abort', 'continue'];
const HOOK_RUN = ['always', 'once'];

const HookTitle = ({ hook }) => {
  const { t } = useTranslation();
  return (
    <>
      <span className="hw-rc-role">{hook.script || '—'}</span>
      <span className="hw-chip">{hook.target || 'guest'}</span>
      <span className="hw-chip hw-chip-tag">
        {t('provisioning.provisioningHooksTab.runChip', { run: hook.run || 'always' })}
      </span>
      {(hook.on_failure || 'abort') === 'continue' ? (
        <span className="hw-chip hw-chip-when">
          {t('provisioning.provisioningHooksTab.failureContinueChip')}
        </span>
      ) : null}
    </>
  );
};

HookTitle.propTypes = {
  hook: PropTypes.object.isRequired,
};

const HookBody = ({ hook, patch, disabled }) => {
  const { t } = useTranslation();
  const uiId = hook._ui_id;
  return (
    <div className="hw-rc-fields">
      <span className="hw-field">
        <label htmlFor={`hook-script-${uiId}`}>
          {t('provisioning.provisioningHooksTab.scriptLabel')}
        </label>
        <input
          id={`hook-script-${uiId}`}
          className="form-control form-control-sm font-monospace hw-field-wide"
          type="text"
          placeholder="./scripts/snapshot.sh"
          value={hook.script ?? ''}
          disabled={disabled}
          onChange={event => patch({ script: event.target.value })}
        />
      </span>
      <span className="hw-field">
        <label htmlFor={`hook-target-${uiId}`}>
          {t('provisioning.provisioningHooksTab.targetLabel')}
        </label>
        <select
          id={`hook-target-${uiId}`}
          className="form-select form-select-sm w-auto"
          value={hook.target ?? 'guest'}
          disabled={disabled}
          onChange={event => patch({ target: event.target.value })}
        >
          {HOOK_TARGETS.map(target => (
            <option key={target} value={target}>
              {target}
            </option>
          ))}
        </select>
      </span>
      <span className="hw-field">
        <label htmlFor={`hook-failure-${uiId}`}>
          {t('provisioning.provisioningHooksTab.onFailureLabel')}
        </label>
        <select
          id={`hook-failure-${uiId}`}
          className="form-select form-select-sm w-auto"
          value={hook.on_failure ?? 'abort'}
          disabled={disabled}
          onChange={event => patch({ on_failure: event.target.value })}
        >
          {HOOK_FAILURE.map(mode => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </span>
      <span className="hw-field">
        <label htmlFor={`hook-run-${uiId}`}>
          {t('provisioning.provisioningHooksTab.runFieldLabel')}
        </label>
        <select
          id={`hook-run-${uiId}`}
          className="form-select form-select-sm w-auto"
          value={hook.run ?? 'always'}
          disabled={disabled}
          onChange={event => patch({ run: event.target.value })}
        >
          {HOOK_RUN.map(mode => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </span>
    </div>
  );
};

HookBody.propTypes = {
  hook: PropTypes.object.isRequired,
  patch: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/**
 * The Hooks tab of the provisioning editor: the sequence hooks of
 * `provisioning.pre[]` and `provisioning.post[]` around the whole run,
 * each a script, a target, an on_failure and a run mode, in list order.
 */
const ProvisioningHooksTab = ({
  preHooks,
  postHooks,
  onPreChange,
  onPostChange,
  makeRow,
  disabled,
}) => {
  const { t } = useTranslation();
  return (
    <div>
      <p className="form-text text-muted mt-0 mb-2">
        {t('provisioning.provisioningHooksTab.intro')} <strong>pre</strong>{' '}
        {t('provisioning.provisioningHooksTab.beforeFirst')} <strong>post</strong>{' '}
        {t('provisioning.provisioningHooksTab.afterLast')} <code>target: host</code>{' '}
        {t('provisioning.provisioningHooksTab.targetHostRuns')} <code>host_hooks</code>{' '}
        {t('provisioning.provisioningHooksTab.gateAllows')}
      </p>

      <h6 className="fw-bold">{t('provisioning.provisioningHooksTab.preHooksHeading')}</h6>
      <StepCardList
        rows={preHooks}
        onChange={onPreChange}
        disabled={disabled}
        addLabel={t('provisioning.provisioningHooksTab.addPreHook')}
        makeRow={makeRow}
        renderTitle={hook => <HookTitle hook={hook} />}
        renderBody={(hook, patch) => <HookBody hook={hook} patch={patch} disabled={disabled} />}
      />

      <h6 className="fw-bold mt-3">{t('provisioning.provisioningHooksTab.postHooksHeading')}</h6>
      <StepCardList
        rows={postHooks}
        onChange={onPostChange}
        disabled={disabled}
        addLabel={t('provisioning.provisioningHooksTab.addPostHook')}
        makeRow={makeRow}
        renderTitle={hook => <HookTitle hook={hook} />}
        renderBody={(hook, patch) => <HookBody hook={hook} patch={patch} disabled={disabled} />}
      />
    </div>
  );
};

ProvisioningHooksTab.propTypes = {
  preHooks: PropTypes.array.isRequired,
  postHooks: PropTypes.array.isRequired,
  onPreChange: PropTypes.func.isRequired,
  onPostChange: PropTypes.func.isRequired,
  makeRow: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default ProvisioningHooksTab;
