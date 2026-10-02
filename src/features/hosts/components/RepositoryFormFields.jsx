import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const Check = ({ id, checked, onChange, scope, name }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-2">
      <div className="form-check">
        <input
          id={id}
          className="form-check-input"
          type="checkbox"
          checked={checked}
          onChange={event => onChange(event.target.checked)}
        />
        <label className="form-check-label" htmlFor={id}>
          <strong>{t(`${scope}.${name}Strong`)}</strong> {t(`${scope}.${name}Text`)}
        </label>
      </div>
    </div>
  );
};

Check.propTypes = {
  id: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  scope: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};

const Text = ({ id, label, value, onChange, placeholder }) => (
  <div className="mb-3">
    <label className="form-label" htmlFor={id}>
      {label}
    </label>
    <input
      id={id}
      className="form-control"
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={event => onChange(event.target.value)}
    />
  </div>
);

Text.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string.isRequired,
};

/**
 * The repository options shared by the add and the edit dialogs,
 * hyperweaver-ui's: the enabled, sticky and search-first switches, the
 * refresh switch on the edit alone, the search before and after and the
 * proxy.
 */
export const RepositoryOptions = ({ scope, form, set, refresh = false }) => {
  const { t } = useTranslation();
  return (
    <>
      <h6 className="fw-bold">{t(`${scope}.repositoryOptions`)}</h6>
      <div className="row g-3">
        <div className="col-md-6">
          <Check
            id="repo-enabled"
            checked={form.enabled}
            onChange={value => set('enabled', value)}
            scope={scope}
            name="enabled"
          />
          <Check
            id="repo-sticky"
            checked={form.sticky}
            onChange={value => set('sticky', value)}
            scope={scope}
            name="sticky"
          />
          <Check
            id="repo-search-first"
            checked={form.searchFirst}
            onChange={value => set('searchFirst', value)}
            scope={scope}
            name="searchFirst"
          />
          {refresh ? (
            <Check
              id="repo-refresh"
              checked={form.refresh}
              onChange={value => set('refresh', value)}
              scope={scope}
              name="refresh"
            />
          ) : null}
        </div>
        <div className="col-md-6">
          <Text
            id="repo-search-before"
            label={t(`${scope}.searchBefore`)}
            value={form.searchBefore}
            onChange={value => set('searchBefore', value)}
            placeholder={t(`${scope}.publisherNamePlaceholder`)}
          />
          <Text
            id="repo-search-after"
            label={t(`${scope}.searchAfter`)}
            value={form.searchAfter}
            onChange={value => set('searchAfter', value)}
            placeholder={t(`${scope}.publisherNamePlaceholder`)}
          />
          <Text
            id="repo-proxy"
            label={t(`${scope}.proxy`)}
            value={form.proxy}
            onChange={value => set('proxy', value)}
            placeholder="http://proxy.example.com:8080"
          />
        </div>
      </div>
    </>
  );
};

RepositoryOptions.propTypes = {
  scope: PropTypes.string.isRequired,
  form: PropTypes.object.isRequired,
  set: PropTypes.func.isRequired,
  refresh: PropTypes.bool,
};

/**
 * The SSL certificate and key of a repository, hyperweaver-ui's two
 * text areas shared by the add and the edit dialogs.
 */
export const RepositorySsl = ({ scope, form, set }) => {
  const { t } = useTranslation();
  return (
    <>
      <h6 className="fw-bold">{t(`${scope}.sslConfiguration`)}</h6>
      <div className="mb-3">
        <label className="form-label" htmlFor="repo-ssl-cert">
          {t(`${scope}.sslCertificate`)}
        </label>
        <textarea
          id="repo-ssl-cert"
          className="form-control font-monospace small"
          rows="3"
          placeholder={'-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----'}
          value={form.sslCert}
          onChange={event => set('sslCert', event.target.value)}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="repo-ssl-key">
          {t(`${scope}.sslPrivateKey`)}
        </label>
        <textarea
          id="repo-ssl-key"
          className="form-control font-monospace small"
          rows="3"
          placeholder={'-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----'}
          value={form.sslKey}
          onChange={event => set('sslKey', event.target.value)}
        />
      </div>
    </>
  );
};

RepositorySsl.propTypes = {
  scope: PropTypes.string.isRequired,
  form: PropTypes.object.isRequired,
  set: PropTypes.func.isRequired,
};
