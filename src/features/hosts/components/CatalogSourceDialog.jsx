import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { catalogSourceBody } from '../utils/machineCreate';

import ToolFormDialog from './ToolFormDialog';

const AUTHS = ['none', 'oidc'];

const AUTH_KEYS = { none: 'hosts.manage.catalog.authNone', oidc: 'hosts.manage.catalog.authOidc' };

const EMPTY_FORM = { displayName: '', url: '', auth: 'none' };

/**
 * The catalog source form a handed `provisioner_catalog` fills: the
 * catalog's host as the display name, the URL as given and the
 * authentication `catalogSourceBody` picks, `oidc` for an organization's
 * private catalog and `none` otherwise; the empty form for no URL.
 *
 * @param {string} url - The handed catalog URL, empty for none
 * @returns {{ displayName: string, url: string, auth: string }} The form
 */
export const catalogSourceFormOf = url => {
  if (!url) {
    return EMPTY_FORM;
  }
  try {
    const body = catalogSourceBody(url);
    return { displayName: body.display_name, url: body.url, auth: body.auth };
  } catch {
    return { ...EMPTY_FORM, url };
  }
};

/**
 * The body of `POST provisioning/catalog/sources` the dialog sends: the
 * display name and the URL trimmed and the authentication chosen.
 *
 * @param {{ displayName: string, url: string, auth: string }} form - The form
 * @returns {{ display_name: string, url: string, auth: string }} The body
 */
export const catalogSourceBodyOf = form => ({
  display_name: form.displayName.trim(),
  url: form.url.trim(),
  auth: AUTHS.includes(form.auth) ? form.auth : 'none',
});

/**
 * Why a catalog source cannot be added: a display name and a URL are each
 * required.
 *
 * @param {{ displayName: string, url: string }} form - The form
 * @returns {string} The locale key, or the empty string
 */
export const catalogSourceProblem = form =>
  form.displayName.trim() && form.url.trim() ? '' : 'hosts.manage.catalog.sourceRequired';

/**
 * The Add source dialog of the Provisioner catalog page, the form dialog
 * of a catalog source: the display name, the URL and the authentication,
 * `none` or `oidc`, filled from `seed`, a handed catalog URL, where one
 * is given; the submit hands the body of `catalogSourceBodyOf` up.
 *
 * @param {Object} props
 * @param {string} [props.seed] - The handed catalog URL the form opens filled from
 * @param {boolean} props.busy - Whether a request is in flight
 * @param {Function} props.onClose - Closes the dialog
 * @param {Function} props.onSubmit - Takes the body
 */
const CatalogSourceDialog = ({ seed = '', busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => catalogSourceFormOf(seed));
  const [problem, setProblem] = useState('');
  const patch = changes => setForm(current => ({ ...current, ...changes }));
  const submit = () => {
    const why = catalogSourceProblem(form);
    setProblem(why);
    if (!why) {
      onSubmit(catalogSourceBodyOf(form));
    }
  };
  return (
    <ToolFormDialog
      dialog="catalog-source"
      title={t('host.provisionerManagement.addSource')}
      submitKey="host.provisionerManagement.addSource"
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="catalog-source-display-name">
            {t('hosts.manage.templates.sourceDisplayName')}
          </label>
          <input
            id="catalog-source-display-name"
            className="form-control"
            type="text"
            value={form.displayName}
            onChange={event => patch({ displayName: event.target.value })}
            disabled={busy}
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="catalog-source-auth">
            {t('hosts.manage.catalog.sourceAuth')}
          </label>
          <select
            id="catalog-source-auth"
            className="form-select"
            value={form.auth}
            onChange={event => patch({ auth: event.target.value })}
            disabled={busy}
          >
            {AUTHS.map(auth => (
              <option key={auth} value={auth}>
                {t(AUTH_KEYS[auth])}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="catalog-source-url">
            {t('hosts.manage.catalog.sourceUrl')}
          </label>
          <input
            id="catalog-source-url"
            className="form-control"
            type="text"
            value={form.url}
            onChange={event => patch({ url: event.target.value })}
            disabled={busy}
          />
        </div>
      </div>
    </ToolFormDialog>
  );
};

CatalogSourceDialog.propTypes = {
  seed: PropTypes.string,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default CatalogSourceDialog;
