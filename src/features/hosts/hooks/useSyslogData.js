import { useCallback, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import {
  applySyslogConfig,
  fetchSyslogFacilities,
  reloadSyslog,
  switchSyslog,
  validateSyslogConfig,
} from '../api/logs';
import { DEFAULT_TARGETS, RULE_BUILDER, getServiceType, ruleLine } from '../utils/syslogUtils';

import { useManageRead, useManageSend } from './useHostManage';

/**
 * The state of the syslog configuration, hyperweaver-ui's
 * `useSyslogData` over the Manage page's reads and sender: the
 * configuration is the page's read, `reading`, its text copied into the
 * editor whenever it answers; the facilities are read once here; the
 * rule builder's fields and the line it adds; Validate sends
 * `POST system/syslog/validate` and holds the answer, Apply
 * `PUT system/syslog/config`, Reload `POST system/syslog/reload` and
 * the switch `POST system/syslog/switch`, each one request and one
 * notice, the configuration read again on a success. Nothing polls.
 *
 * @param {Object} options - The host and the page's read
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {Object} options.reading - The page's read of the configuration
 * @returns {Object} The state and the handlers
 */
export const useSyslogData = ({ id, reading }) => {
  const status = useStatus();
  const { send, busy, task, closeTask } = useManageSend(id);
  const facilities = useManageRead(
    useCallback(() => fetchSyslogFacilities(status, id), [status, id]),
    true
  );
  const [configContent, setConfigContent] = useState('');
  const [seen, setSeen] = useState(null);
  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);
  const [activeView, setActiveView] = useState('current');
  const [pendingSwitchTarget, setPendingSwitchTarget] = useState(null);
  const [ruleBuilder, setRuleBuilder] = useState(RULE_BUILDER);
  const config = reading.data;

  if (config !== seen) {
    setSeen(config);
    setConfigContent(config?.config_content || '');
  }

  const write = async ({ call, doneKey, values = {} }) => {
    const { error } = await send({ call, doneKey, values, failKey: 'hosts.manage.syslog.failed' });
    if (!error) {
      reading.refresh();
    }
  };

  const validateConfiguration = async () => {
    setValidating(true);
    const { answer, error } = await send({
      call: () => validateSyslogConfig(status, id, configContent),
      doneKey: 'hosts.manage.syslog.validated',
      failKey: 'hosts.manage.syslog.failed',
    });
    setValidating(false);
    setValidation(error ? null : answer);
  };

  const applyConfiguration = () =>
    write({
      call: () => applySyslogConfig(status, id, configContent),
      doneKey: 'hosts.manage.syslog.applied',
    });

  const reload = () =>
    write({ call: () => reloadSyslog(status, id), doneKey: 'hosts.manage.syslog.reloaded' });

  const confirmSwitchService = () => {
    const target = pendingSwitchTarget;
    setPendingSwitchTarget(null);
    if (target) {
      write({
        call: () => switchSyslog(status, id, target),
        doneKey: 'hosts.manage.syslog.switched',
        values: { target },
      });
    }
  };

  const handleRuleBuilderChange = (field, value) => {
    setRuleBuilder(current => {
      if (field === 'action_type') {
        return { ...current, action_type: value, action_target: DEFAULT_TARGETS[value] || '' };
      }
      return { ...current, [field]: value };
    });
  };

  const addRule = () => {
    const line = ruleLine(ruleBuilder, getServiceType(config));
    setConfigContent(current => `${current}\n${line}`);
    setRuleBuilder(RULE_BUILDER);
  };

  return {
    config,
    facilities: facilities.data,
    configContent,
    setConfigContent,
    validation,
    busy,
    validating,
    task,
    closeTask,
    activeView,
    setActiveView,
    ruleBuilder,
    pendingSwitchTarget,
    validateConfiguration,
    applyConfiguration,
    reloadSyslog: reload,
    requestSwitchService: setPendingSwitchTarget,
    confirmSwitchService,
    cancelSwitchService: () => setPendingSwitchTarget(null),
    addRule,
    handleRuleBuilderChange,
  };
};
