import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Field from '../../../components/common/Field';
import SectionCard from '../../../components/common/SectionCard';
import { useFolds } from '../../../hooks/useFolds';
import { useHostPrefs } from '../hooks/useHostPrefs';
import { saveHostPrefs } from '../utils/hostPrefs';

const PREFS_KEY = 'table_prefs_hosts_preferences';

const DomainForm = ({ defaultDomain, onSave }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(defaultDomain);

  const submit = event => {
    event.preventDefault();
    onSave(draft);
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="row g-3 align-items-end">
        <div className="col-md-4">
          <Field
            id="hosts-preferences-default_domain"
            label={t('hosts.preferences.defaultDomain')}
            hint={t('hosts.preferences.defaultDomainHint')}
            className="mb-0"
          >
            {aria => (
              <input
                {...aria}
                type="text"
                className="form-control"
                value={draft}
                onChange={event => setDraft(event.target.value)}
              />
            )}
          </Field>
        </div>
        <div className="col-auto">
          <button type="submit" className="btn btn-primary" data-action="save-hosts-preferences">
            {t('hosts.preferences.save')}
          </button>
        </div>
      </div>
    </form>
  );
};

DomainForm.propTypes = {
  defaultDomain: PropTypes.string.isRequired,
  onSave: PropTypes.func.isRequired,
};

/**
 * The Hosts card of the Preferences section, drawn under the Preferences
 * card while the host lists `hosts`: the default domain for new machines
 * the create wizard's bare name takes before the host's own rows, kept in
 * the browser under `hosts_prefs` and never sent to a host, its fold
 * under `table_prefs_hosts_preferences`.
 */
const HostsPreferencesCard = ({ className = 'mt-3 mb-0' }) => {
  const { t } = useTranslation();
  const folds = useFolds(PREFS_KEY);
  const { defaultDomain } = useHostPrefs();
  return (
    <SectionCard
      title={t('hosts.preferences.title')}
      className={className}
      folded={folds.folded('hosts')}
      onFold={() => folds.toggle('hosts')}
      id="hosts-preferences"
    >
      <div data-panel="hosts-preferences">
        <DomainForm
          key={defaultDomain}
          defaultDomain={defaultDomain}
          onSave={value => saveHostPrefs({ defaultDomain: value })}
        />
      </div>
    </SectionCard>
  );
};

HostsPreferencesCard.propTypes = {
  className: PropTypes.string,
};

export default HostsPreferencesCard;
