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
import { IDP } from '../utils/destinations';
import { KINDS } from '../utils/records';
import { PREFERENCES_LABELS, PREFERENCES_SCHEMA } from '../utils/schemas';

import { TextField } from './fields';

const PREFS_KEY = 'table_prefs_certs_preferences';

const destinationShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
});

const DestinationSwitch = ({ destination, checked, lastSynced, onToggle }) => {
  const { t, i18n } = useTranslation();
  return (
    <Field
      id={`certs-sync/${destination.key}`}
      label={t('certs.sync.destination', { name: destination.name })}
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
            data-destination={destination.key}
          />
        </div>
      )}
    </Field>
  );
};

DestinationSwitch.propTypes = {
  destination: destinationShape.isRequired,
  checked: PropTypes.bool.isRequired,
  lastSynced: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
};

const PreferencesForm = ({ thresholdDays, held, destinations, onSave }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const vault = useVault();
  const [draft, setDraft] = useState({ threshold_days: String(thresholdDays) });
  const [ons, setOns] = useState(() =>
    Object.fromEntries(destinations.map(entry => [entry.key, syncsTo(held, entry.key)]))
  );
  const rules = useFormRules({
    schema: PREFERENCES_SCHEMA,
    values: draft,
    labels: PREFERENCES_LABELS,
    idPrefix: 'certs-preferences',
  });
  const brand = status.brand?.name || status.role || '';

  const submit = event => {
    event.preventDefault();
    if (rules.validateAll()) {
      onSave({ threshold_days: Number(draft.threshold_days), ons });
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
      {destinations.length > 0 ? (
        <div className="border-top pt-3" data-panel="certs-sync">
          <p className="text-body-secondary">
            {vault.organization
              ? t('certs.sync.body', { name: brand, organization: vault.organization })
              : t('certs.sync.noOrganization', { name: brand })}
          </p>
          <div className="row">
            {destinations.map(entry => (
              <div key={entry.key} className="col-md-4">
                <DestinationSwitch
                  destination={entry}
                  checked={ons[entry.key]}
                  lastSynced={vault.preferences.last_synced[entry.key] || ''}
                  onToggle={() =>
                    setOns(current => ({ ...current, [entry.key]: !current[entry.key] }))
                  }
                />
              </div>
            ))}
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
  destinations: PropTypes.arrayOf(destinationShape).isRequired,
  onSave: PropTypes.func.isRequired,
};

/**
 * The Certificates card of the Preferences section, drawn under the
 * Preferences card while the host lists `certs`, its fold under
 * `table_prefs_certs_preferences`, one form with one Save preferences at
 * its foot: the expiry threshold in days the vault's Expiring reads, a
 * whole number from one checked on blur and on Save, kept in the
 * browser's vault preferences and never sent to a host; and one switch a
 * destination, Sync to the serving backend under its brand name while
 * the host lists `certs-store` and a person is signed in, keyed in the
 * `sync` preference by the backend's role name, and Sync to the identity
 * provider under its brand name while its own status lists
 * `certs-store`, keyed by `idp`, each on for a person who never chose and
 * the default of every row whose own `sync` map names no store, each with
 * the instant its mirror last completed a run as its hint, over a
 * sentence naming where the rows go, the active organization or the
 * primary membership, else the person's own store. Save writes the
 * preferences and, for every destination that is on, sends every unsent
 * record of the vault, one success notice while every send went through
 * and none while any was refused.
 */
const CertsPreferencesCard = ({ className = 'mt-3 mb-0' }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const folds = useFolds(PREFS_KEY);
  const vault = useVault();
  const thresholdDays = vault.preferences.threshold_days;
  const held = vault.preferences.sync || {};
  const destinations = [
    ...(vault.stored && vault.signedIn
      ? [
          {
            key: status.role || '',
            name: status.brand?.name || status.role || '',
            mirror: vault.sync,
          },
        ]
      : []),
    ...(vault.idp.stored
      ? [
          {
            key: IDP,
            name: vault.idp.name || t('certs.stores.idpName'),
            mirror: vault.idpSync,
          },
        ]
      : []),
  ];

  const save = async ({ threshold_days, ons }) => {
    await vault.setPreference('threshold_days', threshold_days);
    if (destinations.length === 0) {
      return;
    }
    await vault.setPreference('sync', { ...held, ...ons });
    const answers = await Promise.all(
      destinations.map(entry =>
        entry.mirror && ons[entry.key] ? entry.mirror.mirror(KINDS) : Promise.resolve(0)
      )
    );
    if (answers.every(refused => refused === 0)) {
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
          key={`${thresholdDays}:${JSON.stringify(held)}:${destinations.length}`}
          thresholdDays={thresholdDays}
          held={held}
          destinations={destinations}
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
