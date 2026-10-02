import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import RecordRows from '../../../components/common/RecordRows';

import ToolFormDialog from './ToolFormDialog';

const ACTIONS = {
  activate: { scope: 'Activate', variant: 'success' },
  mount: { scope: 'Mount', variant: 'info' },
  unmount: { scope: 'Unmount', variant: 'warning' },
  delete: { scope: 'Delete', variant: 'danger' },
};

const statusOf = environment => {
  if (environment.is_active_now && environment.is_active_on_reboot) {
    return { key: 'statusActiveNowReboot', tone: 'success' };
  }
  if (environment.is_active_now) {
    return { key: 'statusActiveNow', tone: 'success' };
  }
  if (environment.is_active_on_reboot) {
    return { key: 'statusActiveOnReboot', tone: 'info' };
  }
  return { key: 'statusInactive', tone: 'secondary' };
};

const Check = ({ id, checked, onChange, titleKey, descKey, hintKey = '' }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-3">
      <div className="form-check">
        <input
          id={id}
          className="form-check-input"
          type="checkbox"
          checked={checked}
          onChange={event => onChange(event.target.checked)}
        />
        <label className="form-check-label" htmlFor={id}>
          <strong>{t(titleKey)}</strong> - {t(descKey)}
        </label>
      </div>
      {hintKey ? <p className="form-text text-muted">{t(hintKey)}</p> : null}
    </div>
  );
};

Check.propTypes = {
  id: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  titleKey: PropTypes.string.isRequired,
  descKey: PropTypes.string.isRequired,
  hintKey: PropTypes.string,
};

const Options = ({ action, options, set }) => {
  const { t } = useTranslation();
  if (action === 'activate') {
    return (
      <>
        <h6 className="fw-bold">{t('host.confirmActionModal.activationOptionsTitle')}</h6>
        <Check
          id="option-temporary"
          checked={options.temporary}
          onChange={value => set('temporary', value)}
          titleKey="host.confirmActionModal.temporaryActivationTitle"
          descKey="host.confirmActionModal.temporaryActivationDesc"
          hintKey="host.confirmActionModal.temporaryActivationHint"
        />
      </>
    );
  }
  if (action === 'mount') {
    return (
      <>
        <h6 className="fw-bold">{t('host.confirmActionModal.mountOptionsTitle')}</h6>
        <div className="mb-3">
          <label className="form-label" htmlFor="mountpoint-input">
            {t('host.confirmActionModal.mountpointLabel')}
          </label>
          <input
            id="mountpoint-input"
            className="form-control"
            type="text"
            value={options.mountpoint}
            onChange={event => set('mountpoint', event.target.value)}
          />
          <p className="form-text text-muted">{t('host.confirmActionModal.mountpointInputHint')}</p>
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="shared-mode-select">
            {t('host.confirmActionModal.sharedModeLabel')}
          </label>
          <select
            id="shared-mode-select"
            className="form-select"
            value={options.sharedMode}
            onChange={event => set('sharedMode', event.target.value)}
          >
            <option value="ro">{t('host.confirmActionModal.readOnlyOption')}</option>
            <option value="rw">{t('host.confirmActionModal.readWriteOption')}</option>
          </select>
          <p className="form-text text-muted">{t('host.confirmActionModal.mountAccessModeHint')}</p>
        </div>
      </>
    );
  }
  if (action === 'unmount') {
    return (
      <>
        <h6 className="fw-bold">{t('host.confirmActionModal.unmountOptionsTitle')}</h6>
        <Check
          id="option-force-unmount"
          checked={options.force}
          onChange={value => set('force', value)}
          titleKey="host.confirmActionModal.forceUnmountTitle"
          descKey="host.confirmActionModal.forceUnmountDesc"
          hintKey="host.confirmActionModal.forceUnmountHint"
        />
      </>
    );
  }
  if (action === 'delete') {
    return (
      <>
        <h6 className="fw-bold">{t('host.confirmActionModal.deleteOptionsTitle')}</h6>
        <Check
          id="option-force-delete"
          checked={options.force}
          onChange={value => set('force', value)}
          titleKey="host.confirmActionModal.forceDeleteTitle"
          descKey="host.confirmActionModal.forceDeleteDesc"
        />
        <Check
          id="option-snapshots"
          checked={options.snapshots}
          onChange={value => set('snapshots', value)}
          titleKey="host.confirmActionModal.deleteSnapshotsTitle"
          descKey="host.confirmActionModal.deleteSnapshotsDesc"
        />
      </>
    );
  }
  return null;
};

Options.propTypes = {
  action: PropTypes.string.isRequired,
  options: PropTypes.object.isRequired,
  set: PropTypes.func.isRequired,
};

/**
 * The confirmation of an action on a boot environment, hyperweaver-ui's
 * dialog over the form dialog of the pages contract, kept for the
 * boot environments section its sub-stage lands: the environment's
 * record, the sentence and the warning of the action, the options of
 * an activation, a mount, an unmount or a deletion, and the action as
 * the primary button, `onConfirm(name, action, options)` sending the
 * request.
 */
const ConfirmActionModal = ({ bootEnvironment, action, busy, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [options, setOptions] = useState({
    temporary: false,
    force: true,
    snapshots: false,
    mountpoint: `/mnt/${bootEnvironment.name}`,
    sharedMode: 'ro',
  });
  const set = (field, value) => setOptions(current => ({ ...current, [field]: value }));
  const { scope, variant } = ACTIONS[action] || { scope: 'Default', variant: 'info' };
  const active = statusOf(bootEnvironment);
  return (
    <ToolFormDialog
      dialog={`boot-environment-${action}`}
      title={t(`host.confirmActionModal.title${scope}`)}
      submitKey={`host.confirmActionModal.title${scope}`}
      variant={variant}
      busy={busy}
      onClose={onClose}
      onSubmit={() => onConfirm(bootEnvironment.name, action, options)}
    >
      <h6 className="fw-bold">{t('host.confirmActionModal.infoCardTitle')}</h6>
      <RecordRows
        rows={[
          {
            key: 'name',
            label: t('host.confirmActionModal.nameLabel'),
            value: <code>{bootEnvironment.name}</code>,
          },
          {
            key: 'status',
            label: t('host.confirmActionModal.activeStatusLabel'),
            value: (
              <span className={`badge text-bg-${active.tone}`}>
                {t(`host.confirmActionModal.${active.key}`)}
              </span>
            ),
          },
          {
            key: 'mountpoint',
            label: t('host.confirmActionModal.mountpointLabel'),
            value: (
              <code>
                {bootEnvironment.mountpoint === '-'
                  ? t('host.confirmActionModal.notMounted')
                  : bootEnvironment.mountpoint}
              </code>
            ),
          },
          {
            key: 'space',
            label: t('host.confirmActionModal.spaceUsedLabel'),
            value: bootEnvironment.space || t('host.confirmActionModal.notAvailable'),
          },
        ]}
      />
      <div className={`alert alert-${action === 'delete' ? 'danger' : 'info'}`} role="note">
        <p className="mb-1">
          <strong>{t('host.confirmActionModal.actionLabel')}</strong>{' '}
          {t(`host.confirmActionModal.description${scope}`, { action, name: bootEnvironment.name })}
        </p>
        <p className="mb-0">{t(`host.confirmActionModal.warning${scope}`)}</p>
      </div>
      <Options action={action} options={options} set={set} />
    </ToolFormDialog>
  );
};

ConfirmActionModal.propTypes = {
  bootEnvironment: PropTypes.shape({
    name: PropTypes.string.isRequired,
    is_active_now: PropTypes.bool,
    is_active_on_reboot: PropTypes.bool,
    mountpoint: PropTypes.string,
    space: PropTypes.string,
  }).isRequired,
  action: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default ConfirmActionModal;
