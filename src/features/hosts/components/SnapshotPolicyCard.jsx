import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import SectionCard, { foldsShape } from '../../../components/common/SectionCard';
import { useStatus } from '../../../contexts/StatusContext';
import { saveSnapshotPolicy } from '../api/machines';
import { useMachineTools } from '../hooks/useMachineTools';
import {
  POLICY_DEFAULTS,
  POLICY_LABELS,
  POLICY_TIERS,
  POLICY_TYPES,
  policyBody,
  policyFormOf,
  policyOf,
} from '../utils/snapshots';

const FOLD = 'machine-snapshot-policy';

const seedOf = ({ id, name, detail }) => {
  const form = policyFormOf(policyOf(detail));
  return { key: `${id}|${name}|${JSON.stringify(form)}`, form };
};

const NumberField = ({ field, labelKey, values, placeholder, value, busy, onChange }) => {
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
        disabled={busy}
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
  busy: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

const Numbers = ({ form, busy, onChange }) => {
  if (form.type === 'simple') {
    return (
      <NumberField
        field="keep"
        labelKey="machine.machineSnapshots.keepLabel"
        placeholder={POLICY_DEFAULTS.keep}
        value={form.keep}
        busy={busy}
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
        busy={busy}
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
      busy={busy}
      onChange={keep => onChange({ tiers: { ...form.tiers, [tier.key]: keep } })}
    />
  ));
};

Numbers.propTypes = {
  form: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The retention policy of one machine's scheduled snapshots,
 * hyperweaver-ui's policy editor, a section card that folds under
 * `machine-snapshot-policy`: the kind of policy, the agent's own while
 * the machine carries none, none, simple, by age or a rotation, the
 * numbers of that kind, the snapshots kept, the days they are kept or
 * the snapshots kept of each tier, each field's placeholder the number
 * the agents keep where none is given, and whether the guest's file
 * systems are quiesced. Apply is held until a kind is chosen and sends
 * the one request, `PUT machines/{name}` with `snapshots`, and Clear
 * override sends null, the machine following the agent's policy again;
 * the agent keeps either at once with no task, one notice says so and
 * the held copies are read again once, the fields taking the detail's
 * values whenever it answers new ones.
 */
const SnapshotPolicyCard = ({ id, name, detail, folds }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const tools = useMachineTools();
  const seed = seedOf({ id, name, detail });
  const [draft, setDraft] = useState(seed);

  if (draft.key !== seed.key) {
    setDraft(seed);
  }

  const { form } = draft;
  const { busy } = tools;

  const change = patch =>
    setDraft(current => ({ ...current, form: { ...current.form, ...patch } }));

  const save = policy =>
    tools.send({
      id,
      name,
      call: () => saveSnapshotPolicy(status, id, name, policy),
      doneKey: policy
        ? 'machine.machineSnapshots.policySaved'
        : 'machine.machineSnapshots.overrideCleared',
      failKey: 'machine.machineSnapshots.policyUpdateFailed',
    });

  return (
    <div className="col-12 col-lg-6 col-xxl-4" data-panel="machine-snapshot-policy">
      <SectionCard
        title={t('machine.machineSnapshots.retentionPolicyHeading')}
        className="mb-0 h-100"
        folded={folds.folded(FOLD)}
        onFold={() => folds.toggle(FOLD)}
      >
        <div className="row g-2 align-items-end">
          <div className="col-12">
            <label className="form-label small mb-1" htmlFor="snapshot-policy-type">
              {t('machine.machineSnapshots.policyLabel')}
            </label>
            <select
              id="snapshot-policy-type"
              className="form-select form-select-sm"
              value={form.type}
              disabled={busy}
              onChange={event => change({ type: event.target.value })}
            >
              <option value="">{t('machine.machineSnapshots.agentDefaultOption')}</option>
              {POLICY_TYPES.map(type => (
                <option key={type} value={type}>
                  {t(POLICY_LABELS[type])}
                </option>
              ))}
            </select>
          </div>
          <Numbers form={form} busy={busy} onChange={change} />
          {form.type && form.type !== 'none' ? (
            <div className="col-12">
              <div className="form-check mb-1">
                <input
                  id="snapshot-policy-quiesce"
                  className="form-check-input"
                  type="checkbox"
                  checked={form.quiesce}
                  disabled={busy}
                  onChange={event => change({ quiesce: event.target.checked })}
                />
                <label className="form-check-label small" htmlFor="snapshot-policy-quiesce">
                  {t('machine.machineSnapshots.quiesceLabel')}
                </label>
              </div>
            </div>
          ) : null}
          <div className="col-12 d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              data-action="policy-apply"
              disabled={busy || !form.type}
              onClick={() => save(policyBody(form))}
            >
              {t('machine.machineSnapshots.applyPolicyButton')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              title={t('machine.machineSnapshots.clearOverrideTooltip')}
              data-action="policy-clear"
              disabled={busy}
              onClick={() => save(null)}
            >
              {t('machine.machineSnapshots.clearOverrideButton')}
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

SnapshotPolicyCard.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  detail: PropTypes.object.isRequired,
  folds: foldsShape.isRequired,
};

export default SnapshotPolicyCard;
