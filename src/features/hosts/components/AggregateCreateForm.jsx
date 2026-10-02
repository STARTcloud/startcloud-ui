import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const POLICIES = ['L2', 'L3', 'L4', 'L2L3', 'L2L4', 'L3L4', 'L2L3L4'];

/**
 * The fields of the aggregate create dialog, hyperweaver-ui's: the
 * name, the member links picked one at a time, the policy, the LACP
 * mode and its timer while the mode is on, the unicast address, the
 * CDP warning with its box while the service runs, and the temporary
 * flag.
 */
const AggregateCreateForm = ({
  form,
  busy,
  newLink,
  setNewLink,
  links,
  onChange,
  onAddLink,
  onRemoveLink,
  cdpRunning,
}) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="mb-3">
        <label htmlFor="aggregate-name" className="form-label">
          {t('host.aggregateCreateForm.nameLabel')}
        </label>
        <input
          id="aggregate-name"
          className="form-control"
          type="text"
          placeholder={t('host.aggregateCreateForm.namePlaceholder')}
          value={form.name}
          onChange={event => onChange('name', event.target.value)}
          disabled={busy}
          required
        />
        <p className="form-text text-muted">{t('host.aggregateCreateForm.nameHint')}</p>
      </div>
      <div className="mb-3">
        <label htmlFor="aggregate-link-select" className="form-label">
          {t('host.aggregateCreateForm.memberLinksLabel')}
        </label>
        <div className="input-group">
          <select
            id="aggregate-link-select"
            className="form-select"
            value={newLink}
            onChange={event => setNewLink(event.target.value)}
            disabled={busy}
          >
            <option value="">{t('host.aggregateCreateForm.selectLink')}</option>
            {links
              .filter(link => !form.links.includes(link.link))
              .map(link => (
                <option key={link.link} value={link.link}>
                  {link.link} ({link.state}, {link.speed || 'Unknown speed'})
                </option>
              ))}
          </select>
          <button
            type="button"
            className="btn btn-info"
            onClick={onAddLink}
            disabled={!newLink.trim() || busy}
            data-tool="add-link"
          >
            {t('host.aggregateCreateForm.addLinkButton')}
          </button>
        </div>
        {form.links.length > 0 ? (
          <div className="mt-3">
            <p>
              <strong>{t('host.aggregateCreateForm.currentLinks')}</strong>
            </p>
            <div className="d-flex flex-wrap gap-2">
              {form.links.map(link => (
                <span
                  key={link}
                  className="badge text-bg-info d-inline-flex align-items-center gap-1"
                >
                  {link}
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    aria-label={t('host.aggregateCreateForm.removeAriaLabel')}
                    onClick={() => onRemoveLink(link)}
                    disabled={busy}
                  />
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="row g-3">
        <div className="col">
          <div className="mb-3">
            <label htmlFor="aggregate-policy" className="form-label">
              {t('host.aggregateCreateForm.policyLabel')}
            </label>
            <select
              id="aggregate-policy"
              className="form-select"
              value={form.policy}
              onChange={event => onChange('policy', event.target.value)}
              disabled={busy}
            >
              {POLICIES.map(policy => (
                <option key={policy} value={policy}>
                  {t(`host.aggregateCreateForm.policy${policy}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="col">
          <div className="mb-3">
            <label htmlFor="aggregate-lacp-mode" className="form-label">
              {t('host.aggregateCreateForm.lacpModeLabel')}
            </label>
            <select
              id="aggregate-lacp-mode"
              className="form-select"
              value={form.lacp_mode}
              onChange={event => onChange('lacp_mode', event.target.value)}
              disabled={busy}
            >
              <option value="off">{t('host.aggregateCreateForm.lacpModeOff')}</option>
              <option value="active">{t('host.aggregateCreateForm.lacpModeActive')}</option>
              <option value="passive">{t('host.aggregateCreateForm.lacpModePassive')}</option>
            </select>
          </div>
        </div>
      </div>
      {form.lacp_mode === 'off' ? null : (
        <div className="mb-3">
          <label htmlFor="aggregate-lacp-timer" className="form-label">
            {t('host.aggregateCreateForm.lacpTimerLabel')}
          </label>
          <select
            id="aggregate-lacp-timer"
            className="form-select"
            value={form.lacp_timer}
            onChange={event => onChange('lacp_timer', event.target.value)}
            disabled={busy}
          >
            <option value="short">{t('host.aggregateCreateForm.lacpTimerShort')}</option>
            <option value="long">{t('host.aggregateCreateForm.lacpTimerLong')}</option>
          </select>
        </div>
      )}
      <div className="mb-3">
        <label htmlFor="aggregate-mac" className="form-label">
          {t('host.aggregateCreateForm.macLabel')}
        </label>
        <input
          id="aggregate-mac"
          className="form-control"
          type="text"
          placeholder={t('host.aggregateCreateForm.macPlaceholder')}
          value={form.unicast_address}
          onChange={event => onChange('unicast_address', event.target.value)}
          disabled={busy}
        />
        <p className="form-text text-muted">{t('host.aggregateCreateForm.macHint')}</p>
      </div>
      {cdpRunning ? (
        <div className="alert alert-warning mb-4" data-note="cdp">
          <p>
            <strong>{t('host.aggregateCreateForm.cdpTitle')}</strong>
          </p>
          <p>{t('host.aggregateCreateForm.cdpWarning')}</p>
          <div className="form-check">
            <input
              id="aggregate-disable-cdp"
              className="form-check-input"
              type="checkbox"
              checked={form.disableCdp}
              onChange={event => onChange('disableCdp', event.target.checked)}
              disabled={busy}
            />
            <label className="form-check-label" htmlFor="aggregate-disable-cdp">
              <strong>{t('host.aggregateCreateForm.cdpCheckboxLabel')}</strong>
            </label>
          </div>
          <p className="form-text text-muted mb-0">{t('host.aggregateCreateForm.cdpHint')}</p>
        </div>
      ) : null}
      <div className="mb-3">
        <div className="form-check">
          <input
            id="aggregate-temporary"
            className="form-check-input"
            type="checkbox"
            checked={form.temporary}
            onChange={event => onChange('temporary', event.target.checked)}
            disabled={busy}
          />
          <label className="form-check-label" htmlFor="aggregate-temporary">
            {t('host.aggregateCreateForm.temporaryLabel')}
          </label>
        </div>
      </div>
    </>
  );
};

AggregateCreateForm.propTypes = {
  form: PropTypes.shape({
    name: PropTypes.string.isRequired,
    links: PropTypes.arrayOf(PropTypes.string).isRequired,
    policy: PropTypes.string.isRequired,
    lacp_mode: PropTypes.string.isRequired,
    lacp_timer: PropTypes.string.isRequired,
    unicast_address: PropTypes.string.isRequired,
    temporary: PropTypes.bool.isRequired,
    disableCdp: PropTypes.bool.isRequired,
  }).isRequired,
  busy: PropTypes.bool.isRequired,
  newLink: PropTypes.string.isRequired,
  setNewLink: PropTypes.func.isRequired,
  links: PropTypes.arrayOf(PropTypes.object).isRequired,
  onChange: PropTypes.func.isRequired,
  onAddLink: PropTypes.func.isRequired,
  onRemoveLink: PropTypes.func.isRequired,
  cdpRunning: PropTypes.bool.isRequired,
};

export default AggregateCreateForm;
