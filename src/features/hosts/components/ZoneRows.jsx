import PropTypes from 'prop-types';
import { useState } from 'react';
import { Dropdown, Form, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaCircleCheck,
  FaCircleExclamation,
  FaLink,
  FaLinkSlash,
  FaListCheck,
  FaTruckArrowRight,
} from 'react-icons/fa6';

import { useNotify } from '../../../contexts/NoticeContext';
import { verifyMachine } from '../api/machines';
import { hostHasHypervisor } from '../utils/capabilities';
import { canCreateMachines } from '../utils/permissions';

import { ActionOptionsModal, ActionRow } from './HostActionOptions';

const DETACHED = { update: false, force: false };

const VerdictModal = ({ verdict, name, onHide }) => {
  const { t } = useTranslation();
  return (
    <Modal show={Boolean(verdict)} onHide={onHide} dialogClassName="list-modal" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>{t('hosts.zone.verifyTitle', { name })}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {verdict ? (
          <>
            <p className={verdict.valid ? 'text-success' : 'text-danger'}>
              {t(verdict.valid ? 'hosts.zone.verifyValid' : 'hosts.zone.verifyInvalid')}
            </p>
            {verdict.output ? (
              <>
                <h6>{t('hosts.zone.resultOutput')}</h6>
                <pre className="small mb-0">{verdict.output}</pre>
              </>
            ) : null}
          </>
        ) : null}
      </Modal.Body>
    </Modal>
  );
};

VerdictModal.propTypes = {
  verdict: PropTypes.shape({
    valid: PropTypes.bool.isRequired,
    output: PropTypes.string.isRequired,
  }),
  name: PropTypes.string.isRequired,
  onHide: PropTypes.func.isRequired,
};

const AttachOptions = ({ options, onChange }) => {
  const { t } = useTranslation();
  return (
    <>
      <Form.Check
        type="checkbox"
        id="zone-attach-update"
        className="mb-2"
        label={t('hosts.zone.attachUpdate')}
        checked={options.update}
        onChange={event => onChange({ ...options, update: event.target.checked })}
      />
      <Form.Check
        type="checkbox"
        id="zone-attach-force"
        label={t('hosts.zone.attachForce')}
        checked={options.force}
        onChange={event => onChange({ ...options, force: event.target.checked })}
      />
    </>
  );
};

AttachOptions.propTypes = {
  options: PropTypes.shape({
    update: PropTypes.bool.isRequired,
    force: PropTypes.bool.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The zone lifecycle rows of the machine Controls menu, drawn for a
 * person who may create machines on a host whose row names `bhyve`:
 * Ready, Mark incomplete and Detach each one request through `onAction`,
 * Attach after the dialog that collects its update and force options,
 * Move after the dialog that collects the absolute path on the host, and
 * Verify, whose answer is read and not acted on, the verdict and the
 * tool's own output drawn in a list dialog. The agent alone decides
 * whether a zone's state allows a row, and its refusal is the danger card
 * the action raises.
 */
const ZoneRows = ({ status, id, name, server = null, user = null, busy, onAction }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [dialog, setDialog] = useState('');
  const [attach, setAttach] = useState(DETACHED);
  const [path, setPath] = useState('');
  const [verdict, setVerdict] = useState(null);
  const [verifying, setVerifying] = useState(false);

  if (!hostHasHypervisor(server, 'bhyve') || !canCreateMachines(user?.role)) {
    return null;
  }

  const held = busy || verifying;
  const close = () => setDialog('');

  const verify = async () => {
    setVerifying(true);
    try {
      const answer = await verifyMachine(status, id, name);
      setVerdict({ valid: Boolean(answer.valid), output: answer.output || '' });
    } catch (error) {
      notify('danger', error.message || t('hosts.controls.failed'));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <>
      <Dropdown.Divider />
      <Dropdown.Header>{t('hosts.zone.header')}</Dropdown.Header>
      <ActionRow
        icon={FaCircleCheck}
        tone="text-success"
        labelKey="hosts.zone.ready"
        disabled={held}
        onClick={() => onAction('zone-ready')}
      />
      <ActionRow
        icon={FaListCheck}
        tone="text-info"
        labelKey="hosts.zone.verify"
        disabled={held}
        onClick={verify}
      />
      <ActionRow
        icon={FaCircleExclamation}
        tone="text-warning"
        labelKey="hosts.zone.markIncomplete"
        disabled={held}
        onClick={() => onAction('zone-mark-incomplete')}
      />
      <ActionRow
        icon={FaLinkSlash}
        tone="text-warning"
        labelKey="hosts.zone.detach"
        disabled={held}
        onClick={() => onAction('zone-detach')}
      />
      <ActionRow
        icon={FaLink}
        tone="text-success"
        labelKey="hosts.zone.attach"
        disabled={held}
        onClick={() => {
          setAttach(DETACHED);
          setDialog('attach');
        }}
      />
      <ActionRow
        icon={FaTruckArrowRight}
        tone="text-warning"
        labelKey="hosts.zone.move"
        disabled={held}
        onClick={() => {
          setPath('');
          setDialog('move');
        }}
      />
      <ActionOptionsModal
        show={dialog === 'attach'}
        title={t('hosts.zone.attachTitle', { name })}
        continueKey="hosts.zone.attachSubmit"
        onHide={close}
        onContinue={() => {
          close();
          onAction('zone-attach', attach);
        }}
      >
        <AttachOptions options={attach} onChange={setAttach} />
      </ActionOptionsModal>
      <ActionOptionsModal
        show={dialog === 'move'}
        title={t('hosts.zone.moveTitle', { name })}
        continueKey="hosts.zone.moveSubmit"
        disabled={!path.trim().startsWith('/')}
        onHide={close}
        onContinue={() => {
          close();
          onAction('zone-move', { targetPath: path.trim() });
        }}
      >
        <Form.Group controlId="zone-move-path">
          <Form.Label>{t('hosts.zone.movePath')}</Form.Label>
          <Form.Control
            type="text"
            className="font-monospace"
            required
            value={path}
            placeholder={t('hosts.zone.movePathPlaceholder')}
            onChange={event => setPath(event.target.value)}
          />
        </Form.Group>
      </ActionOptionsModal>
      <VerdictModal verdict={verdict} name={name} onHide={() => setVerdict(null)} />
    </>
  );
};

ZoneRows.propTypes = {
  status: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  server: PropTypes.object,
  user: PropTypes.object,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};

export default ZoneRows;
