import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import SectionCard from '../../../components/common/SectionCard';
import { useFolds } from '../../../hooks/useFolds';
import { useFormRules } from '../../../hooks/useFormRules';
import { fetchPreferences } from '../api/preferences';
import { useHostPrefs } from '../hooks/useHostPrefs';
import { saveHostPrefs } from '../utils/hostPrefs';

const PREFS_KEY = 'table_prefs_hosts_preferences';
const ID_PREFIX = 'hosts-preferences';
const ACCOUNT_SCHEMA = {
  properties: { default_domain: { $ref: '#/$defs/domainName' } },
};
const ACCOUNT_LABELS = { default_domain: 'hosts.preferences.accountDomain' };

const trimmed = value => String(value ?? '').trim();

const DomainForm = ({ defaultDomain, accountDomain, onSave }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(defaultDomain);
  const [account, setAccount] = useState(accountDomain || '');
  const values = useMemo(() => ({ default_domain: account }), [account]);
  const rules = useFormRules({
    formKey: 'preferences',
    schema: ACCOUNT_SCHEMA,
    values,
    labels: ACCOUNT_LABELS,
    idPrefix: ID_PREFIX,
  });
  const withAccount = accountDomain !== null;

  const submit = event => {
    event.preventDefault();
    if (withAccount && !rules.validateAll()) {
      return;
    }
    onSave({ defaultDomain: draft, accountDomain: withAccount ? trimmed(account) : null });
  };

  return (
    <form onSubmit={submit} noValidate>
      {withAccount ? <FormErrorSummary errors={rules.summary} /> : null}
      <div className="row">
        <div className="col-md-4">
          <Field
            id="hosts-preferences-default_domain"
            label={t('hosts.preferences.defaultDomain')}
            hint={t('hosts.preferences.defaultDomainHint')}
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
        {withAccount ? (
          <div className="col-md-4">
            <Field
              id={rules.idFor('default_domain')}
              label={t('hosts.preferences.accountDomain')}
              hint={t('hosts.preferences.accountDomainHint')}
              error={rules.errors.default_domain || ''}
            >
              {aria => (
                <input
                  {...aria}
                  type="text"
                  className="form-control"
                  value={account}
                  onChange={event => setAccount(event.target.value)}
                  onBlur={() => rules.onBlur('default_domain')}
                />
              )}
            </Field>
          </div>
        ) : null}
      </div>
      <button type="submit" className="btn btn-primary" data-action="save-hosts-preferences">
        {t('profile.preferences.save')}
      </button>
    </form>
  );
};

DomainForm.propTypes = {
  defaultDomain: PropTypes.string.isRequired,
  accountDomain: PropTypes.string,
  onSave: PropTypes.func.isRequired,
};

const useAccountDomain = session => {
  const [domain, setDomain] = useState(null);
  useEffect(() => {
    if (!session) {
      return undefined;
    }
    let active = true;
    fetchPreferences()
      .then(answer => {
        if (active) {
          setDomain(trimmed(answer?.default_domain));
        }
      })
      .catch(() => {
        if (active) {
          setDomain('');
        }
      });
    return () => {
      active = false;
    };
  }, [session]);
  return [domain, setDomain];
};

/**
 * The Hosts card of the Preferences section, drawn under the Preferences
 * card while the host lists `hosts`: the default domain for new machines
 * this browser takes, the create wizard's bare name taking it before
 * every row of the host, kept in the browser under `hosts_prefs` and
 * never sent to a host; and, with a `session`, the account's default
 * domain the person carries to every browser, read from
 * `GET /api/user/preferences` and written as `default_domain` through the
 * session's `savePreferences`, a DNS name, `null` clearing it, the `user`
 * row of the wizard's chain behind the browser's; one Save preferences at
 * the form's foot writes both, its fold under
 * `table_prefs_hosts_preferences`.
 */
const HostsPreferencesCard = ({ session = null, className = 'mt-3 mb-0' }) => {
  const { t } = useTranslation();
  const folds = useFolds(PREFS_KEY);
  const { defaultDomain } = useHostPrefs();
  const [accountDomain, setAccountDomain] = useAccountDomain(session);
  const ready = !session || accountDomain !== null;

  const save = async ({ defaultDomain: own, accountDomain: account }) => {
    saveHostPrefs({ defaultDomain: own });
    if (account === null) {
      return;
    }
    await session.savePreferences({ default_domain: account || null });
    setAccountDomain(account);
  };

  return (
    <SectionCard
      title={t('hosts.preferences.title')}
      className={className}
      folded={folds.folded('hosts')}
      onFold={() => folds.toggle('hosts')}
      id="hosts-preferences"
    >
      <div data-panel="hosts-preferences">
        {ready ? (
          <DomainForm
            key={`${defaultDomain}|${accountDomain ?? ''}`}
            defaultDomain={defaultDomain}
            accountDomain={accountDomain}
            onSave={save}
          />
        ) : null}
      </div>
    </SectionCard>
  );
};

HostsPreferencesCard.propTypes = {
  session: PropTypes.shape({ savePreferences: PropTypes.func.isRequired }),
  className: PropTypes.string,
};

export default HostsPreferencesCard;
