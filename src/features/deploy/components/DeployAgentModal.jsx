import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaLifeRing, FaServer } from 'react-icons/fa6';

import { useStatus } from '../../../contexts/StatusContext';
import { useTicketUrl } from '../../../hooks/useTicketUrl';
import { AGENT_DOWNLOAD_URL } from '../utils/deployLink';

import HyperweaverGlyph from './HyperweaverGlyph';

const INTEGRATION_PATH = '/user/integrations/hyperweaver';

const OptionRow = ({ href, Icon, labelKey, action }) => {
  const { t } = useTranslation();
  return (
    <a
      className="list-group-item list-group-item-action d-flex align-items-center gap-3"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-action={action}
    >
      <Icon aria-hidden="true" />
      {t(labelKey)}
    </a>
  );
};

OptionRow.propTypes = {
  href: PropTypes.string.isRequired,
  Icon: PropTypes.elementType.isRequired,
  labelKey: PropTypes.string.isRequired,
  action: PropTypes.string.isRequired,
};

/**
 * The dialog a Deploy press opens while no Hyperweaver Agent answers on
 * this machine: Install Hyperweaver Agent, the agent's latest release;
 * Join a Hyperweaver server, the identity provider's Hyperweaver
 * integration page, where a person attaches a server and picks it as the
 * target, signing in there first; and Support, the Help ticket link,
 * each row drawn only while its link exists.
 *
 * @param {Object} props
 * @param {Object|null} props.user - The session's user
 * @param {Function} props.onClose - Closes the dialog
 */
const DeployAgentModal = ({ user, onClose }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const support = useTicketUrl({ status, user, claims: null, activeOrgCode: '' });
  const issuer = status.idp?.issuer || '';
  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title as="h5" className="d-flex align-items-center gap-2">
          <HyperweaverGlyph />
          {t('pages.deploy.agentTitle')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body data-dialog="deploy-agent">
        <p>{t('pages.deploy.agentBody')}</p>
        <div className="list-group">
          <OptionRow
            href={AGENT_DOWNLOAD_URL}
            Icon={FaDownload}
            labelKey="pages.deploy.installAgent"
            action="install-agent"
          />
          {issuer ? (
            <OptionRow
              href={`${issuer.replace(/\/+$/, '')}${INTEGRATION_PATH}`}
              Icon={FaServer}
              labelKey="pages.deploy.joinServer"
              action="join-server"
            />
          ) : null}
          {support ? (
            <OptionRow
              href={support}
              Icon={FaLifeRing}
              labelKey="pages.deploy.support"
              action="support"
            />
          ) : null}
        </div>
      </Modal.Body>
    </Modal>
  );
};

DeployAgentModal.propTypes = {
  user: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};

export default DeployAgentModal;
