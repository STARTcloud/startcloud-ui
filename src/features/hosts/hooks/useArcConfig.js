import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { applyArcConfig, fetchArcConfig, resetArcConfig, validateArcConfig } from '../api/arc';
import {
  ARC_FORM,
  arcApplyBody,
  arcFormOf,
  arcValidateBody,
  hasArcSettings,
} from '../utils/arcUtils';

import { useManageRead, useManageSend } from './useHostManage';

/**
 * The state of the ZFS ARC configuration, hyperweaver-ui's
 * `useArcConfig` over the Manage page's reads and sender: the
 * configuration read once, again on the page's Refresh and after every
 * write, the form filled from its tunables whenever it answers; Validate
 * sends `POST system/zfs/arc/validate` and holds the answer, Apply
 * `PUT system/zfs/arc/config` and Reset `POST system/zfs/arc/reset`,
 * each one request and one notice, the warning of a reboot required
 * raised beside the success. Nothing polls.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Object} The state and the handlers
 */
export const useArcConfig = id => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const { send, busy, task, closeTask } = useManageSend(id);
  const reading = useManageRead(
    useCallback(() => fetchArcConfig(status, id), [status, id]),
    true
  );
  const [formData, setFormData] = useState(ARC_FORM);
  const [seen, setSeen] = useState(null);
  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const currentConfig = reading.data;

  if (currentConfig !== seen) {
    setSeen(currentConfig);
    setFormData(arcFormOf(currentConfig?.available_tunables));
  }

  const handleFormChange = (field, value) => {
    setFormData(current => ({ ...current, [field]: value }));
    setValidation(null);
  };

  const validateConfiguration = async () => {
    setValidating(true);
    const { answer, error } = await send({
      call: () => validateArcConfig(status, id, arcValidateBody(formData)),
      doneKey: 'hosts.manage.arc.validated',
      failKey: 'hosts.manage.arc.failed',
    });
    setValidating(false);
    setValidation(error ? null : answer);
  };

  const applyConfiguration = async () => {
    const { answer, error } = await send({
      call: () => applyArcConfig(status, id, arcApplyBody(formData)),
      doneKey: 'hosts.manage.arc.applied',
      failKey: 'hosts.manage.arc.failed',
    });
    if (!error) {
      if (answer?.results?.reboot_required) {
        notify('warning', t('hosts.manage.arc.rebootRequired'));
      }
      reading.refresh();
    }
  };

  const confirmResetToDefaults = async () => {
    setShowResetConfirm(false);
    const { error } = await send({
      call: () => resetArcConfig(status, id, formData.apply_method),
      doneKey: 'hosts.manage.arc.reset',
      failKey: 'hosts.manage.arc.failed',
    });
    if (!error) {
      setValidation(null);
      reading.refresh();
    }
  };

  return {
    currentConfig,
    reading,
    formData,
    validation,
    busy,
    validating,
    task,
    closeTask,
    canValidate: Boolean(formData.arc_max_gb || formData.arc_min_gb),
    canApply: hasArcSettings(formData),
    handleFormChange,
    validateConfiguration,
    applyConfiguration,
    showResetConfirm,
    requestResetToDefaults: () => setShowResetConfirm(true),
    cancelReset: () => setShowResetConfirm(false),
    confirmResetToDefaults,
  };
};
