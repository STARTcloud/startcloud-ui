import PropTypes from 'prop-types';
import { useState } from 'react';
import { Form, Modal } from 'react-bootstrap';
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

import { ActionOptionsModal } from './HostActionOptions';

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

const zoneCommand = (key, icon, tone, labelKey, disabled, run) => ({
  key,
  group: 'zone',
  header: 'hosts.zone.header',
  icon,
  tone,
  labelKey,
  disabled,
  run,
});

/**
 * The zone lifecycle commands of the machine Controls menu for a person
 * who may create machines on a host whose row names `bhyve`: Ready, Mark
 * incomplete and Detach through `onAction`, Attach and Move after their
 * option dialogs, and Verify, its verdict drawn in a list dialog.
 *
 * @param {Object} options
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {string} options.name - The machine's name
 * @param {Object|null} options.server - The host's registry row
 * @param {Object|null} options.user - The signed-in person
 * @param {boolean} options.busy - Whether an action is in flight
 * @param {Function} options.onAction - Sends one machine action
 * @returns {{ commands: Array<Object>, dialogs: import('react').ReactNode }} The commands and their dialogs
 */
export const useZoneCommands = ({ status, id, name, server, user, busy, onAction }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [dialog, setDialog] = useState('');
  const [attach, setAttach] = useState(DETACHED);
  const [path, setPath] = useState('');
  const [verdict, setVerdict] = useState(null);
  const [verifying, setVerifying] = useState(false);

  if (!hostHasHypervisor(server, 'bhyve') || !canCreateMachines(user?.role)) {
    return { commands: [], dialogs: null };
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

  const commands = [
    zoneCommand('zone-ready', FaCircleCheck, 'text-success', 'hosts.zone.ready', held, () =>
      onAction('zone-ready')
    ),
    zoneCommand('zone-verify', FaListCheck, 'text-info', 'hosts.zone.verify', held, verify),
    zoneCommand(
      'zone-mark-incomplete',
      FaCircleExclamation,
      'text-warning',
      'hosts.zone.markIncomplete',
      held,
      () => onAction('zone-mark-incomplete')
    ),
    zoneCommand('zone-detach', FaLinkSlash, 'text-warning', 'hosts.zone.detach', held, () =>
      onAction('zone-detach')
    ),
    zoneCommand('zone-attach', FaLink, 'text-success', 'hosts.zone.attach', held, () => {
      setAttach(DETACHED);
      setDialog('attach');
    }),
    zoneCommand('zone-move', FaTruckArrowRight, 'text-warning', 'hosts.zone.move', held, () => {
      setPath('');
      setDialog('move');
    }),
  ];

  const dialogs = (
    <>
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

  return { commands, dialogs };
};
