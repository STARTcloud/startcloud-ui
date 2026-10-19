import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaRotate } from 'react-icons/fa6';

import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import SectionCard from '../../../components/common/SectionCard';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useFolds } from '../../../hooks/useFolds';
import { useFormRules } from '../../../hooks/useFormRules';
import { formatRelativeTime } from '../../../utils/relativeTime';
import { useVault } from '../hooks/useVault';
import { KINDS } from '../utils/records';
import { PREFERENCES_LABELS, PREFERENCES_SCHEMA } from '../utils/schemas';

import { TextField } from './fields';

const PREFS_KEY = 'table_prefs_certs_preferences';

const ThresholdForm = ({ thresholdDays, onSave }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState({ threshold_days: String(thresholdDays) });
  const rules = useFormRules({
    schema: PREFERENCES_SCHEMA,
    values: draft,
    labels: PREFERENCES_LABELS,
    idPrefix: 'certs-preferences',
  });

  const submit = event => {
    event.preventDefault();
    if (rules.validateAll()) {
      onSave(Number(draft.threshold_days));
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <FormErrorSummary errors={rules.summary} />
      <div className="row g-3 align-items-end">
        <div className="col-md-4">
          <TextField
            name="threshold_days"
            type="number"
            min={1}
            draft={draft}
            rules={rules}
            onChange={(name, value) => setDraft({ [name]: value })}
            hint={t('certs.preferences.thresholdHint')}
            className="mb-0"
          />
        </div>
        <div className="col-auto">
          <button type="submit" className="btn btn-primary" data-action="save-threshold">
            {t('certs.preferences.save')}
          </button>
        </div>
      </div>
    </form>
  );
};

ThresholdForm.propTypes = {
  thresholdDays: PropTypes.number.isRequired,
  onSave: PropTypes.func.isRequired,
};

const lastSyncedOf = (records, kind) =>
  records
    .filter(record => record.kind === kind && record.remote_id && record.synced_at)
    .map(record => record.synced_at)
    .sort()
    .at(-1) || '';

const KindSwitch = ({ kind, checked, lastSynced, onToggle }) => {
  const { t, i18n } = useTranslation();
  return (
    <Field
      id={`certs-sync/${kind}`}
      label={t(`certs.kind.${kind}`)}
      hint={
        lastSynced
          ? t('certs.sync.lastSynced', { when: formatRelativeTime(lastSynced, i18n.language) })
          : t('certs.sync.never')
      }
      className="mb-0"
    >
      {aria => (
        <div className="form-check form-switch">
          <input
            {...aria}
            type="checkbox"
            className="form-check-input"
            checked={checked}
            onChange={onToggle}
            data-kind={kind}
          />
        </div>
      )}
    </Field>
  );
};

KindSwitch.propTypes = {
  kind: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  lastSynced: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
};

const SyncForm = ({ held, records, brand, organization, onSave }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(() =>
    Object.fromEntries(KINDS.map(kind => [kind, Boolean(held[kind])]))
  );
  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        onSave(draft);
      }}
      noValidate
    >
      <h3 className="h6">{t('certs.sync.title', { name: brand })}</h3>
      <p className="text-body-secondary">
        {organization
          ? t('certs.sync.body', { name: brand, organization })
          : t('certs.sync.noOrganization', { name: brand })}
      </p>
      <div className="row g-3">
        {KINDS.map(kind => (
          <div key={kind} className="col-6 col-md-3">
            <KindSwitch
              kind={kind}
              checked={draft[kind]}
              lastSynced={lastSyncedOf(records, kind)}
              onToggle={() => setDraft(current => ({ ...current, [kind]: !current[kind] }))}
            />
          </div>
        ))}
      </div>
      <button type="submit" className="btn btn-primary mt-3" data-action="save-sync">
        <FaRotate className="me-1" aria-hidden="true" />
        {t('certs.sync.save')}
      </button>
    </form>
  );
};

SyncForm.propTypes = {
  held: PropTypes.object.isRequired,
  records: PropTypes.array.isRequired,
  brand: PropTypes.string.isRequired,
  organization: PropTypes.string.isRequired,
  onSave: PropTypes.func.isRequired,
};

/**
 * The Certificates card of the Preferences section, drawn under the
 * Preferences card while the host lists `certs`, its fold under
 * `table_prefs_certs_preferences`: the expiry threshold in days the
 * vault's Expiring reads, a whole number from one checked on blur and on
 * Save, kept in the browser's vault preferences and never sent to a host;
 * and, while the host lists `certs-store` and a person is signed in, the
 * sync form under it, one switch a kind in a row grid with the last time
 * the store answered a record of that kind, over a sentence naming where
 * the rows go, the active organization or the primary membership, else
 * the person's own store on this host, its Save writing the `sync`
 * preference and sending every unsent record of the kinds newly checked,
 * one success notice while every send went through and none while any was
 * refused.
 */
const CertsPreferencesCard = ({ className = 'mt-3 mb-0' }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const folds = useFolds(PREFS_KEY);
  const vault = useVault();
  const thresholdDays = vault.preferences.threshold_days;
  const held = vault.preferences.sync || {};

  const saveSync = async draft => {
    const added = KINDS.filter(kind => draft[kind] && !held[kind]);
    await vault.setPreference('sync', draft);
    const refused = vault.sync && added.length > 0 ? await vault.sync.mirror(added) : 0;
    if (refused === 0) {
      notify('success', t('certs.notice.syncSaved'));
    }
  };

  return (
    <SectionCard
      title={t('certs.preferences.title')}
      className={className}
      folded={folds.folded('certs')}
      onFold={() => folds.toggle('certs')}
      id="certs-preferences"
    >
      <div data-panel="certs-preferences">
        <ThresholdForm
          key={thresholdDays}
          thresholdDays={thresholdDays}
          onSave={days => vault.setPreference('threshold_days', days)}
        />
        {vault.stored && vault.signedIn ? (
          <div className="border-top mt-3 pt-3" data-panel="certs-sync">
            <SyncForm
              key={JSON.stringify(held)}
              held={held}
              records={vault.records}
              brand={status.brand.name}
              organization={vault.organization}
              onSave={saveSync}
            />
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
};

CertsPreferencesCard.propTypes = {
  className: PropTypes.string,
};

export default CertsPreferencesCard;
