import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BRIDGE_FORM, bridgeProblem } from '../utils/networkingManagement';

import ToolFormDialog from './ToolFormDialog';

const NumberField = ({ id, labelKey, helpKey, min, max, value, busy, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="col">
      <div className="mb-3">
        <label htmlFor={id} className="form-label">
          {t(labelKey)}
        </label>
        <input
          id={id}
          className="form-control"
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={event => onChange(event.target.value)}
          disabled={busy}
        />
        <p className="form-text text-muted">{t(helpKey)}</p>
      </div>
    </div>
  );
};

NumberField.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  helpKey: PropTypes.string.isRequired,
  min: PropTypes.string.isRequired,
  max: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The create dialog of a bridge, hyperweaver-ui's: the name, the
 * protection, the priority, the max age, the hello time, the forward
 * delay and the member links, each picked among the host's bridgeable
 * links and added as a badge that can be removed. The body is
 * `bridgeBody`.
 */
const BridgeCreateModal = ({ links, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(BRIDGE_FORM);
  const [newLink, setNewLink] = useState('');
  const [tried, setTried] = useState(false);
  const problem = bridgeProblem(form);
  const change = (field, value) => setForm(current => ({ ...current, [field]: value }));

  const addLink = () => {
    const link = newLink.trim();
    if (link && !form.links.includes(link)) {
      change('links', [...form.links, link]);
      setNewLink('');
    }
  };

  const submit = () => {
    setTried(true);
    if (!problem) {
      onSubmit(form);
    }
  };

  return (
    <ToolFormDialog
      dialog="bridge-create"
      title={t('host.bridgeCreateModal.title')}
      submitKey="host.bridgeCreateModal.title"
      problemKey={tried ? problem : ''}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="mb-3">
        <label htmlFor="bridge-name" className="form-label">
          {t('host.bridgeCreateModal.bridgeNameLabel')} *
        </label>
        <input
          id="bridge-name"
          className="form-control"
          type="text"
          placeholder="e.g., bridge0"
          value={form.name}
          onChange={event => change('name', event.target.value)}
          disabled={busy}
          required
        />
        <p className="form-text text-muted">{t('host.bridgeCreateModal.nameHelp')}</p>
      </div>
      <div className="row g-3">
        <div className="col">
          <div className="mb-3">
            <label htmlFor="bridge-protection" className="form-label">
              {t('host.bridgeCreateModal.protection')}
            </label>
            <select
              id="bridge-protection"
              className="form-select"
              value={form.protection}
              onChange={event => change('protection', event.target.value)}
              disabled={busy}
            >
              <option value="stp">{t('host.bridgeCreateModal.protectionStp')}</option>
              <option value="rstp">{t('host.bridgeCreateModal.protectionRstp')}</option>
              <option value="none">{t('host.bridgeCreateModal.protectionNone')}</option>
            </select>
          </div>
        </div>
        <NumberField
          id="bridge-priority"
          labelKey="host.bridgeCreateModal.priority"
          helpKey="host.bridgeCreateModal.priorityHelp"
          min="0"
          max="65535"
          value={form.priority}
          busy={busy}
          onChange={value => change('priority', value)}
        />
      </div>
      <div className="row g-3">
        <NumberField
          id="bridge-max-age"
          labelKey="host.bridgeCreateModal.maxAge"
          helpKey="host.bridgeCreateModal.maxAgeHelp"
          min="6"
          max="40"
          value={form.max_age}
          busy={busy}
          onChange={value => change('max_age', value)}
        />
        <NumberField
          id="bridge-hello-time"
          labelKey="host.bridgeCreateModal.helloTime"
          helpKey="host.bridgeCreateModal.helloTimeHelp"
          min="1"
          max="10"
          value={form.hello_time}
          busy={busy}
          onChange={value => change('hello_time', value)}
        />
        <NumberField
          id="bridge-forward-delay"
          labelKey="host.bridgeCreateModal.forwardDelay"
          helpKey="host.bridgeCreateModal.forwardDelayHelp"
          min="4"
          max="30"
          value={form.forward_delay}
          busy={busy}
          onChange={value => change('forward_delay', value)}
        />
      </div>
      <div className="mb-3">
        <label htmlFor="bridge-link-select" className="form-label">
          {t('host.bridgeCreateModal.memberLinks')}
        </label>
        <div className="input-group">
          <select
            id="bridge-link-select"
            className="form-select"
            value={newLink}
            onChange={event => setNewLink(event.target.value)}
            disabled={busy}
          >
            <option value="">{t('host.bridgeCreateModal.selectLink')}</option>
            {links
              .filter(link => !form.links.includes(link.link))
              .map(link => (
                <option key={link.link} value={link.link}>
                  {link.link} ({link.class}, {link.state},{' '}
                  {link.speed || t('host.bridgeCreateModal.unknownSpeed')})
                </option>
              ))}
          </select>
          <button
            type="button"
            className="btn btn-info"
            onClick={addLink}
            disabled={!newLink.trim() || busy}
            data-tool="add-link"
          >
            {t('host.bridgeCreateModal.addLink')}
          </button>
        </div>
        {form.links.length > 0 ? (
          <div className="mt-3">
            <p>
              <strong>{t('host.bridgeCreateModal.currentLinks')}</strong>
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
                    aria-label={t('host.bridgeCreateModal.remove')}
                    onClick={() =>
                      change(
                        'links',
                        form.links.filter(held => held !== link)
                      )
                    }
                    disabled={busy}
                  />
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </ToolFormDialog>
  );
};

BridgeCreateModal.propTypes = {
  links: PropTypes.array.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default BridgeCreateModal;
