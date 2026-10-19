import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import SectionCard from '../../../components/common/SectionCard';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useFolds } from '../../../hooks/useFolds';
import { useFormRules } from '../../../hooks/useFormRules';
import { formatRelativeTime } from '../../../utils/relativeTime';
import { useVault } from '../hooks/useVault';
import { syncsTo } from '../hooks/useVaultSync';
import { KINDS } from '../utils/records';
import { PREFERENCES_LABELS, PREFERENCES_SCHEMA } from '../utils/schemas';

import { TextField } from './fields';

const PREFS_KEY = 'table_prefs_certs_preferences';

const lastSyncedOf = records =>
  records
    .filter(record => record.remote_id && record.synced_at)
    .map(record => record.synced_at)
    .sort()
    .at(-1) || '';

const DestinationSwitch = ({ destination, name, checked, lastSynced, onToggle }) => {
  const { t, i18n } = useTranslation();
  return (
    <Field
      id={`certs-sync/${destination}`}
      label={t('certs.sync.destination', { name })}
      hint={
        lastSynced
          ? t('certs.sync.lastSynced', { when: formatRelativeTime(lastSynced, i18n.language) })
          : t('certs.sync.never')
      }
    >
      {aria => (
        <div className="form-check form-switch">
          <input
            {...aria}
            type="checkbox"
            role="switch"
            className="form-check-input"
            checked={checked}
            onChange={onToggle}
            data-destination={destination}
          />
        </div>
      )}
    </Field>
  );
};

DestinationSwitch.propTypes = {
  destination: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  lastSynced: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
};

const PreferencesForm = ({ thresholdDays, held, destination, synced, onSave }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const vault = useVault();
  const [draft, setDraft] = useState({ threshold_days: String(thresholdDays) });
  const [on, setOn] = useState(() => syncsTo(held, destination));
  const rules = useFormRules({
    schema: PREFERENCES_SCHEMA,
    values: draft,
    labels: PREFERENCES_LABELS,
    idPrefix: 'certs-preferences',
  });
  const brand = status.brand?.name || destination;

  const submit = event => {
    event.preventDefault();
    if (rules.validateAll()) {
      onSave({ threshold_days: Number(draft.threshold_days), on });
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <FormErrorSummary errors={rules.summary} />
      <div className="row">
        <div className="col-md-4">
          <TextField
            name="threshold_days"
            type="number"
            min={1}
            draft={draft}
            rules={rules}
            onChange={(name, value) => setDraft({ [name]: value })}
            hint={t('certs.preferences.thresholdHint')}
          />
        </div>
      </div>
      {synced ? (
        <div className="border-top pt-3" data-panel="certs-sync">
          <p className="text-body-secondary">
            {vault.organization
              ? t('certs.sync.body', { name: brand, organization: vault.organization })
              : t('certs.sync.noOrganization', { name: brand })}
          </p>
          <div className="row">
            <div className="col-md-4">
              <DestinationSwitch
                destination={destination}
                name={brand}
                checked={on}
                lastSynced={lastSyncedOf(vault.records)}
                onToggle={() => setOn(current => !current)}
              />
            </div>
          </div>
        </div>
      ) : null}
      <button type="submit" className="btn btn-primary" data-action="save-certs-preferences">
        {t('profile.preferences.save')}
      </button>
    </form>
  );
};

PreferencesForm.propTypes = {
  thresholdDays: PropTypes.number.isRequired,
  held: PropTypes.object.isRequired,
  destination: PropTypes.string.isRequired,
  synced: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
};

/**
 * The Certificates card of the Preferences section, drawn under the
 * Preferences card while the host lists `certs`, its fold under
 * `table_prefs_certs_preferences`, one form with one Save preferences at
 * its foot: the expiry threshold in days the vault's Expiring reads, a
 * whole number from one checked on blur and on Save, kept in the
 * browser's vault preferences and never sent to a host; and, while the
 * host lists `certs-store` and a person is signed in, one switch a
 * destination, Sync to the serving backend under its brand name, keyed
 * in the `sync` preference by the backend's role name and on for a
 * person who never chose, with the last time the store answered a record
 * as its hint, over a sentence naming where the rows go, the active
 * organization or the primary membership, else the person's own store on
 * this host. Save writes both preferences and, while the destination is
 * on, sends every unsent record of the vault, one success notice while
 * every send went through and none while any was refused.
 */
const CertsPreferencesCard = ({ className = 'mt-3 mb-0' }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const folds = useFolds(PREFS_KEY);
  const vault = useVault();
  const thresholdDays = vault.preferences.threshold_days;
  const held = vault.preferences.sync || {};
  const destination = status.role || '';
  const synced = Boolean(vault.stored && vault.signedIn);

  const save = async ({ threshold_days, on }) => {
    await vault.setPreference('threshold_days', threshold_days);
    if (!synced) {
      return;
    }
    await vault.setPreference('sync', { ...held, [destination]: on });
    const refused = vault.sync && on ? await vault.sync.mirror(KINDS) : 0;
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
        <PreferencesForm
          key={`${thresholdDays}:${JSON.stringify(held)}`}
          thresholdDays={thresholdDays}
          held={held}
          destination={destination}
          synced={synced}
          onSave={save}
        />
      </div>
    </SectionCard>
  );
};

CertsPreferencesCard.propTypes = {
  className: PropTypes.string,
};

export default CertsPreferencesCard;
