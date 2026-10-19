import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { POLICY_DEFAULTS, POLICY_LABELS, POLICY_TIERS, POLICY_TYPES } from '../utils/snapshots';

const NumberField = ({ field, labelKey, values, placeholder, value, disabled, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="col-6 col-md-4">
      <label className="form-label small mb-1" htmlFor={`snapshot-policy-${field}`}>
        {t(labelKey, values)}
      </label>
      <input
        id={`snapshot-policy-${field}`}
        className="form-control form-control-sm"
        type="number"
        min="1"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={event => onChange(event.target.value)}
      />
    </div>
  );
};

NumberField.propTypes = {
  field: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  values: PropTypes.object,
  placeholder: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  disabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

const Numbers = ({ form, disabled, onChange }) => {
  if (form.type === 'simple') {
    return (
      <NumberField
        field="keep"
        labelKey="machine.machineSnapshots.keepLabel"
        placeholder={POLICY_DEFAULTS.keep}
        value={form.keep}
        disabled={disabled}
        onChange={keep => onChange({ keep })}
      />
    );
  }
  if (form.type === 'age') {
    return (
      <NumberField
        field="age"
        labelKey="machine.machineSnapshots.maxAgeLabel"
        placeholder={POLICY_DEFAULTS.maxAgeDays}
        value={form.maxAgeDays}
        disabled={disabled}
        onChange={maxAgeDays => onChange({ maxAgeDays })}
      />
    );
  }
  if (form.type !== 'rotation') {
    return null;
  }
  return POLICY_TIERS.map(tier => (
    <NumberField
      key={tier.key}
      field={tier.key}
      labelKey="machine.machineSnapshots.tierKeepLabel"
      values={{ tier: tier.key }}
      placeholder={tier.keep}
      value={form.tiers[tier.key]}
      disabled={disabled}
      onChange={keep => onChange({ tiers: { ...form.tiers, [tier.key]: keep } })}
    />
  ));
};

Numbers.propTypes = {
  form: PropTypes.object.isRequired,
  disabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The Snapshots tab of a machine's Settings page, the retention policy of
 * its scheduled snapshots: the kind of policy, the agent's own while the
 * machine carries none, none, simple, by age or a rotation, the numbers
 * of that kind, the snapshots kept, the days they are kept or the
 * snapshots kept of each tier, each field's placeholder the number the
 * agents keep where none is given, and whether the guest's file systems
 * are quiesced. The tab holds the form alone; the Settings page's Apply
 * sends it as `snapshots` while it changed, the agent's own kind as null.
 *
 * @param {Object} props
 * @param {Object} props.form - The policy form of `policyFormOf`
 * @param {boolean} props.disabled - Whether the fields are held
 * @param {Function} props.onChange - Called with the members that change
 */
const SnapshotPolicyTab = ({ form, disabled, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="row g-2 align-items-end" data-tab-body="snapshots">
      <div className="col-12 col-md-6">
        <label className="form-label small mb-1" htmlFor="snapshot-policy-type">
          {t('machine.machineSnapshots.policyLabel')}
        </label>
        <select
          id="snapshot-policy-type"
          className="form-select form-select-sm"
          value={form.type}
          disabled={disabled}
          onChange={event => onChange({ type: event.target.value })}
        >
          <option value="">{t('machine.machineSnapshots.agentDefaultOption')}</option>
          {POLICY_TYPES.map(type => (
            <option key={type} value={type}>
              {t(POLICY_LABELS[type])}
            </option>
          ))}
        </select>
      </div>
      <div className="w-100" />
      <Numbers form={form} disabled={disabled} onChange={onChange} />
      {form.type && form.type !== 'none' ? (
        <div className="col-12">
          <div className="form-check mb-1">
            <input
              id="snapshot-policy-quiesce"
              className="form-check-input"
              type="checkbox"
              checked={form.quiesce}
              disabled={disabled}
              onChange={event => onChange({ quiesce: event.target.checked })}
            />
            <label className="form-check-label small" htmlFor="snapshot-policy-quiesce">
              {t('machine.machineSnapshots.quiesceLabel')}
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
};

SnapshotPolicyTab.propTypes = {
  form: PropTypes.object.isRequired,
  disabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default SnapshotPolicyTab;
