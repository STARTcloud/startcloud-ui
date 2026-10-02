import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck } from 'react-icons/fa6';

import { useNotify } from '../../../contexts/NoticeContext';
import { setSecureBoot } from '../api/machines';

/**
 * The Secure Boot panel of a VirtualBox machine's General tab,
 * hyperweaver-ui's: the toggle, the enrolment of the standard keys and
 * the re-initialisation of the variable store, applied at once through
 * `POST machines/{name}/nvram/secureboot` on a machine that is off, one
 * notice carrying the agent's answer; a BIOS machine is told to switch
 * to EFI first. The caller keys the panel by the machine, so a new
 * machine opens it fresh.
 */
const SecureBootPanel = ({ status, hostId, name, running, bootrom = '', disabled = false }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [enabled, setEnabled] = useState(true);
  const [enrollKeys, setEnrollKeys] = useState(true);
  const [initVarStore, setInitVarStore] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleToggle = value => {
    setEnabled(value);
    setEnrollKeys(value);
  };

  const apply = async () => {
    setBusy(true);
    try {
      const answer = await setSecureBoot(status, hostId, name, {
        enabled,
        enroll_default_keys: enrollKeys,
        ...(initVarStore && { init_var_store: true }),
      });
      notify(
        'success',
        answer?.message ||
          t('machine.secureBootPanel.appliedFallback', {
            state: enabled
              ? t('machine.secureBootPanel.enabledWord')
              : t('machine.secureBootPanel.disabledWord'),
            machineName: name,
          })
      );
      setInitVarStore(false);
    } catch (error) {
      notify(
        'danger',
        bootrom && bootrom !== 'efi'
          ? `${error.message} ${t('machine.secureBootPanel.efiRequiredSuffix')}`
          : error.message
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border rounded p-3" data-panel="secure-boot">
      <h6 className="fw-bold mb-2">{t('machine.secureBootPanel.heading')}</h6>
      {running ? (
        <p className="form-text text-warning mt-0">
          {t('machine.secureBootPanel.runningWarning', { machineName: name })}
        </p>
      ) : null}
      {bootrom && bootrom !== 'efi' ? (
        <p className="form-text text-warning mt-0">
          {t('machine.secureBootPanel.bootromMismatchPrefix')} <code>{bootrom}</code>{' '}
          {t('machine.secureBootPanel.bootromMismatchSuffix')} <code>efi</code>{' '}
          {t('machine.secureBootPanel.bootromMismatchTail')}
        </p>
      ) : null}
      <div className="row g-3 align-items-end">
        <div className="col-auto">
          <div className="form-check form-switch">
            <input
              id="secureboot-enabled"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={enabled}
              onChange={event => handleToggle(event.target.checked)}
              disabled={disabled || busy}
            />
            <label className="form-check-label" htmlFor="secureboot-enabled">
              {t('machine.secureBootPanel.secureBootLabel')}
            </label>
          </div>
        </div>
        <div className="col-auto">
          <div className="form-check">
            <input
              id="secureboot-enroll"
              className="form-check-input"
              type="checkbox"
              checked={enrollKeys}
              onChange={event => setEnrollKeys(event.target.checked)}
              disabled={disabled || busy}
            />
            <label
              className="form-check-label"
              htmlFor="secureboot-enroll"
              title={t('machine.secureBootPanel.enrollKeysTooltip')}
            >
              {t('machine.secureBootPanel.enrollKeysLabel')}
            </label>
          </div>
        </div>
        <div className="col-auto">
          <div className="form-check">
            <input
              id="secureboot-init"
              className="form-check-input"
              type="checkbox"
              checked={initVarStore}
              onChange={event => setInitVarStore(event.target.checked)}
              disabled={disabled || busy}
            />
            <label className="form-check-label text-danger" htmlFor="secureboot-init">
              {t('machine.secureBootPanel.reinitLabel')}
            </label>
          </div>
        </div>
        <div className="col-auto">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            data-action="apply-secure-boot"
            onClick={apply}
            disabled={disabled || busy || running}
          >
            {busy ? (
              <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
            ) : (
              <FaCheck className="me-2" aria-hidden="true" />
            )}
            {t('machine.secureBootPanel.applyButton')}
          </button>
        </div>
      </div>
      {initVarStore ? (
        <p className="form-text text-danger mb-0">{t('machine.secureBootPanel.reinitWarning')}</p>
      ) : null}
      <p className="form-text text-muted mb-0">{t('machine.secureBootPanel.applyNote')}</p>
    </div>
  );
};

SecureBootPanel.propTypes = {
  status: PropTypes.object.isRequired,
  hostId: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  running: PropTypes.bool.isRequired,
  bootrom: PropTypes.string,
  disabled: PropTypes.bool,
};

export default SecureBootPanel;
