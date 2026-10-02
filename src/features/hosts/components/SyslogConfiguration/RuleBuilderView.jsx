import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaTriangleExclamation } from 'react-icons/fa6';

import { getServiceType, ruleAction } from '../../utils/syslogUtils';

const FACILITY_FALLBACK = [
  ['*', 'All facilities'],
  ['kern', 'Kernel messages'],
  ['mail', 'Mail system'],
  ['auth', 'Authentication'],
  ['daemon', 'System daemons'],
  ['local0', 'Local use 0'],
  ['local1', 'Local use 1'],
];

const LEVEL_FALLBACK = [
  ['emerg', 'levelEmerg'],
  ['alert', 'levelAlert'],
  ['crit', 'levelCrit'],
  ['err', 'levelErr'],
  ['warning', 'levelWarning'],
  ['notice', 'levelNotice'],
  ['info', 'levelInfo'],
  ['debug', 'levelDebug'],
];

const ACTION_HELP = {
  file: 'helpFile',
  remote_host: 'helpRemote',
  all_users: 'helpAllUsers',
  user: 'helpUser',
};

const Options = ({ rows, t }) =>
  rows.map(row => (
    <option key={row.name} value={row.name}>
      {row.name} - {row.key ? t(`hostTime.syslogRuleBuilder.${row.key}`) : row.description}
    </option>
  ));

const TargetField = ({ id, labelKey, placeholderKey, helpKey, value, onChange, type = 'text' }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-3">
      <label className="form-label" htmlFor={id}>
        {t(`hostTime.syslogRuleBuilder.${labelKey}`)}
      </label>
      <input
        id={id}
        className="form-control"
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={t(`hostTime.syslogRuleBuilder.${placeholderKey}`)}
      />
      <p className="form-text text-muted small">{t(`hostTime.syslogRuleBuilder.${helpKey}`)}</p>
    </div>
  );
};

TargetField.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  placeholderKey: PropTypes.string.isRequired,
  helpKey: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  type: PropTypes.string,
};

const RemoteFields = ({ ruleBuilder, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="row g-3">
      <div className="col-lg-4">
        <TargetField
          id="rule-remote-host"
          labelKey="remoteHostLabel"
          placeholderKey="remoteHostPlaceholder"
          helpKey="remoteHostHelp"
          value={ruleBuilder.action_target}
          onChange={value => onChange('action_target', value)}
        />
      </div>
      <div className="col-lg-4">
        <div className="mb-3">
          <label className="form-label" htmlFor="rule-remote-protocol">
            {t('hostTime.syslogRuleBuilder.protocolLabel')}
          </label>
          <select
            id="rule-remote-protocol"
            className="form-select"
            value={ruleBuilder.remote_protocol}
            onChange={event => onChange('remote_protocol', event.target.value)}
          >
            <option value="udp">{t('hostTime.syslogRuleBuilder.protocolUdp')}</option>
            <option value="tcp">{t('hostTime.syslogRuleBuilder.protocolTcp')}</option>
          </select>
          <p className="form-text text-muted small">
            {t('hostTime.syslogRuleBuilder.protocolHelp')}
          </p>
        </div>
      </div>
      <div className="col-lg-4">
        <TargetField
          id="rule-remote-port"
          labelKey="portLabel"
          placeholderKey="portPlaceholder"
          helpKey="portHelp"
          value={ruleBuilder.remote_port}
          onChange={value => onChange('remote_port', value)}
          type="number"
        />
      </div>
    </div>
  );
};

RemoteFields.propTypes = {
  ruleBuilder: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

const UserFields = ({ ruleBuilder, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="row g-3">
      <div className="col-lg-8">
        <TargetField
          id="rule-username"
          labelKey="usernameLabel"
          placeholderKey="usernamePlaceholder"
          helpKey="usernameHelp"
          value={ruleBuilder.action_target}
          onChange={value => onChange('action_target', value)}
        />
      </div>
      <div className="col-lg-4">
        <div className="mb-3">
          <span className="form-label d-block">
            {t('hostTime.syslogRuleBuilder.multipleUsersLabel')}
          </span>
          <div className="form-check form-switch">
            <input
              id="rule-multiple-users"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={ruleBuilder.multiple_users}
              onChange={event => onChange('multiple_users', event.target.checked)}
            />
            <label className="form-check-label" htmlFor="rule-multiple-users">
              {t('hostTime.syslogRuleBuilder.multipleUsersCheckbox')}
            </label>
          </div>
          <p className="form-text text-muted small">
            {t('hostTime.syslogRuleBuilder.multipleUsersHelp')}
          </p>
        </div>
      </div>
    </div>
  );
};

UserFields.propTypes = {
  ruleBuilder: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The syslog rule builder, hyperweaver-ui's form: the facility and the
 * level from the agent's lists or its own, the action type with the
 * fields of the type chosen, the emergency warning for a broadcast, Add
 * rule appending the line to the editor, and the preview of the line.
 */
const RuleBuilderView = ({ config, facilities, ruleBuilder, handleRuleBuilderChange, addRule }) => {
  const { t } = useTranslation();
  const serviceType = getServiceType(config);
  const facilityRows = facilities?.facilities?.length
    ? facilities.facilities
    : FACILITY_FALLBACK.map(([name, description]) => ({ name, description }));
  const levelRows = facilities?.levels?.length
    ? facilities.levels
    : LEVEL_FALLBACK.map(([name, key]) => ({ name, key }));

  return (
    <div data-panel="syslog-builder">
      <div className="row g-3">
        <div className="col-lg-3">
          <div className="mb-3">
            <label className="form-label" htmlFor="rule-facility">
              {t('hostTime.syslogRuleBuilder.facilityLabel')}
            </label>
            <select
              id="rule-facility"
              className="form-select"
              value={ruleBuilder.facility}
              onChange={event => handleRuleBuilderChange('facility', event.target.value)}
            >
              <Options rows={facilityRows} t={t} />
            </select>
          </div>
        </div>
        <div className="col-lg-3">
          <div className="mb-3">
            <label className="form-label" htmlFor="rule-level">
              {t('hostTime.syslogRuleBuilder.levelLabel')}
            </label>
            <select
              id="rule-level"
              className="form-select"
              value={ruleBuilder.level}
              onChange={event => handleRuleBuilderChange('level', event.target.value)}
            >
              <Options rows={levelRows} t={t} />
            </select>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="mb-3">
            <label className="form-label" htmlFor="rule-action-type">
              {t('hostTime.syslogRuleBuilder.actionTypeLabel')}
            </label>
            <select
              id="rule-action-type"
              className="form-select"
              value={ruleBuilder.action_type}
              onChange={event => handleRuleBuilderChange('action_type', event.target.value)}
            >
              <option value="file">{t('hostTime.syslogRuleBuilder.actionLogToFile')}</option>
              <option value="remote_host">
                {t('hostTime.syslogRuleBuilder.actionSendRemote')}
              </option>
              <option value="all_users">
                {t('hostTime.syslogRuleBuilder.actionBroadcastAll')}
              </option>
              <option value="user">{t('hostTime.syslogRuleBuilder.actionSendUser')}</option>
            </select>
            <p className="form-text text-muted small">
              {t(`hostTime.syslogRuleBuilder.${ACTION_HELP[ruleBuilder.action_type]}`)}
            </p>
          </div>
        </div>
      </div>

      {ruleBuilder.action_type === 'file' ? (
        <TargetField
          id="rule-file-path"
          labelKey="filePathLabel"
          placeholderKey="filePathPlaceholder"
          helpKey="filePathHelp"
          value={ruleBuilder.action_target}
          onChange={value => handleRuleBuilderChange('action_target', value)}
        />
      ) : null}
      {ruleBuilder.action_type === 'remote_host' ? (
        <RemoteFields ruleBuilder={ruleBuilder} onChange={handleRuleBuilderChange} />
      ) : null}
      {ruleBuilder.action_type === 'user' ? (
        <UserFields ruleBuilder={ruleBuilder} onChange={handleRuleBuilderChange} />
      ) : null}
      {ruleBuilder.action_type === 'all_users' ? (
        <div className="alert alert-warning d-flex align-items-center gap-3" role="note">
          <div className="flex-grow-1">
            <p className="fw-semibold mb-1">
              {t('hostTime.syslogRuleBuilder.emergencyBroadcastTitle')}
            </p>
            <p className="small mb-0">
              {t('hostTime.syslogRuleBuilder.emergencyBroadcastMessage')}
            </p>
          </div>
          <FaTriangleExclamation className="fs-3 text-warning" aria-hidden="true" />
        </div>
      ) : null}

      <div className="mb-3">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          data-action="syslog-add-rule"
          onClick={addRule}
          disabled={!ruleBuilder.facility || !ruleBuilder.level || !ruleBuilder.action_target}
        >
          <FaPlus className="me-1" aria-hidden="true" />
          {t('hostTime.syslogRuleBuilder.addRuleButton')}
        </button>
      </div>

      <div className="alert alert-secondary mb-0" data-note="syslog-preview">
        <h6 className="fw-bold">
          {t('hostTime.syslogRuleBuilder.rulePreviewHeading', { service: serviceType.display })}
        </h6>
        <code className="small">
          {ruleBuilder.facility}.{ruleBuilder.level}
          {'\t\t\t'}
          {ruleAction(ruleBuilder, serviceType)}
        </code>
      </div>
    </div>
  );
};

RuleBuilderView.propTypes = {
  config: PropTypes.object,
  facilities: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  ruleBuilder: PropTypes.shape({
    facility: PropTypes.string.isRequired,
    level: PropTypes.string.isRequired,
    action_type: PropTypes.string.isRequired,
    action_target: PropTypes.string.isRequired,
    remote_protocol: PropTypes.string,
    remote_port: PropTypes.string,
    multiple_users: PropTypes.bool,
    user_list: PropTypes.string,
  }).isRequired,
  handleRuleBuilderChange: PropTypes.func.isRequired,
  addRule: PropTypes.func.isRequired,
};

export default RuleBuilderView;
