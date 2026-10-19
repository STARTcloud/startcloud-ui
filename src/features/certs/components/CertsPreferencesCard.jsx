import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import FormErrorSummary from '../../../components/common/FormErrorSummary';
import SectionCard from '../../../components/common/SectionCard';
import { useFolds } from '../../../hooks/useFolds';
import { useFormRules } from '../../../hooks/useFormRules';
import { useVault } from '../hooks/useVault';
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

/**
 * The Certificates card of the Preferences section, drawn under the
 * Preferences card while the host lists `certs`: the expiry threshold
 * in days the vault's Expiring reads, a whole number from one checked
 * on blur and on Save, kept in the browser's vault preferences and never
 * sent to a host, its fold under `table_prefs_certs_preferences`.
 */
const CertsPreferencesCard = ({ className = 'mt-3 mb-0' }) => {
  const { t } = useTranslation();
  const folds = useFolds(PREFS_KEY);
  const vault = useVault();
  const thresholdDays = vault.preferences.threshold_days;
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
      </div>
    </SectionCard>
  );
};

CertsPreferencesCard.propTypes = {
  className: PropTypes.string,
};

export default CertsPreferencesCard;
