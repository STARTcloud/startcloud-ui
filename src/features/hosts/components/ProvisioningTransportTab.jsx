import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { OptionalBoolSelect } from './ProvisioningVarRows';

const TRANSPORTS = ['negotiate', 'ssl', 'ntlm', 'plaintext', 'kerberos'];

const OLD_SPELLINGS = [
  'vagrant_communicator',
  'vagrant_winrm_port',
  'vagrant_winrm_transport',
  'vagrant_winrm_ssl_peer_verification',
];

/**
 * The Transport tab of the provisioning editor: the guest communicator
 * keys under `settings`, ssh by default, the winrm port, transport and
 * peer verification when winrm is chosen; it writes the plain spellings
 * only and notes a stored vagrant_* twin.
 */
const ProvisioningTransportTab = ({ settings, onChange, disabled }) => {
  const { t } = useTranslation();
  const communicator = settings?.communicator ?? settings?.vagrant_communicator ?? '';
  const port = settings?.winrm_port ?? settings?.vagrant_winrm_port ?? '';
  const transport = settings?.winrm_transport ?? settings?.vagrant_winrm_transport ?? '';
  const sslVerify =
    settings?.winrm_ssl_peer_verification ?? settings?.vagrant_winrm_ssl_peer_verification;
  const hasOldSpelling = OLD_SPELLINGS.some(key => settings?.[key] !== undefined);

  return (
    <div>
      <p className="form-text text-muted mt-0 mb-2">
        {t('provisioning.provisioningTransportTab.intro1')} <code>ssh</code>{' '}
        {t('provisioning.provisioningTransportTab.intro2')} <code>winrm</code>{' '}
        {t('provisioning.provisioningTransportTab.intro3')}
      </p>

      <div className="hw-rc-fields">
        <span className="hw-field">
          <label htmlFor="prov-transport-communicator">
            {t('provisioning.provisioningTransportTab.communicatorLabel')}
          </label>
          <select
            id="prov-transport-communicator"
            className="form-select form-select-sm w-auto"
            value={communicator}
            disabled={disabled}
            onChange={event => onChange('communicator', event.target.value || undefined)}
          >
            <option value="">ssh</option>
            <option value="ssh">ssh</option>
            <option value="winrm">winrm</option>
          </select>
        </span>

        {communicator === 'winrm' ? (
          <>
            <span className="hw-field">
              <label htmlFor="prov-transport-port">
                {t('provisioning.provisioningTransportTab.winrmPortLabel')}
              </label>
              <input
                id="prov-transport-port"
                className="form-control form-control-sm hw-field-tiny"
                type="number"
                min="1"
                max="65535"
                placeholder={transport === 'ssl' ? '5986' : '5985'}
                value={port}
                disabled={disabled}
                onChange={event =>
                  onChange(
                    'winrm_port',
                    event.target.value === '' ? undefined : Number(event.target.value)
                  )
                }
              />
            </span>
            <span className="hw-field">
              <label htmlFor="prov-transport-mode">
                {t('provisioning.provisioningTransportTab.winrmTransportLabel')}
              </label>
              <select
                id="prov-transport-mode"
                className="form-select form-select-sm w-auto"
                value={transport}
                disabled={disabled}
                onChange={event => onChange('winrm_transport', event.target.value || undefined)}
              >
                <option value="">negotiate</option>
                {TRANSPORTS.map(mode => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </span>
            <OptionalBoolSelect
              id="prov-transport-sslverify"
              label={t('provisioning.provisioningTransportTab.sslPeerVerificationLabel')}
              value={sslVerify}
              disabled={disabled}
              onChange={value => onChange('winrm_ssl_peer_verification', value)}
            />
          </>
        ) : null}
      </div>

      {hasOldSpelling ? (
        <p className="form-text text-muted mb-0">
          {t('provisioning.provisioningTransportTab.oldSpellingIntro')} <code>vagrant_*</code>{' '}
          {t('provisioning.provisioningTransportTab.oldSpellingRest')}
        </p>
      ) : null}
    </div>
  );
};

ProvisioningTransportTab.propTypes = {
  settings: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default ProvisioningTransportTab;
