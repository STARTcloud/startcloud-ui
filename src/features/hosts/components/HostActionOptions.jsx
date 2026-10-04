import PropTypes from 'prop-types';
import { Fragment } from 'react';
import { Button, Dropdown, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaShareNodes } from 'react-icons/fa6';

import { useNotify } from '../../../contexts/NoticeContext';
import { copyToClipboard } from '../../../lib/clipboard';

const hostActionOptionsPropType = PropTypes.shape({
  restartType: PropTypes.string.isRequired,
  powerType: PropTypes.string.isRequired,
  gracePeriod: PropTypes.number.isRequired,
  message: PropTypes.string.isRequired,
  bootEnvironment: PropTypes.string.isRequired,
}).isRequired;

/**
 * The options of a host restart: the restart type, standard or fast, the
 * boot environment of a fast reboot, the grace period of a standard one
 * and the message the system logs carry. The fast reboot and its note
 * draw only while `fast`, the host listing `host-fast-reboot`, because an
 * agent without the route answers 404.
 */
export const HostRestartOptions = ({ hostActionOptions, setHostActionOptions, fast }) => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="mb-3">
        <label className="form-label" htmlFor="restart-type">
          {t('hosts.controls.restartOptions.restartType')}
        </label>
        <select
          id="restart-type"
          className="form-select"
          value={hostActionOptions.restartType}
          onChange={event =>
            setHostActionOptions(prev => ({
              ...prev,
              restartType: event.target.value,
            }))
          }
        >
          <option value="standard">{t('hosts.controls.restartOptions.standardRestart')}</option>
          {fast ? (
            <option value="fast">{t('hosts.controls.restartOptions.fastReboot')}</option>
          ) : null}
        </select>
        {fast ? (
          <p className="form-text">{t('hosts.controls.restartOptions.fastRebootNote')}</p>
        ) : null}
      </div>

      {hostActionOptions.restartType === 'fast' && (
        <div className="mb-3">
          <label className="form-label" htmlFor="restart-boot-env">
            {t('hosts.controls.restartOptions.bootEnvironment')}
          </label>
          <input
            id="restart-boot-env"
            className="form-control"
            type="text"
            placeholder={t('hosts.controls.restartOptions.bootEnvironmentPlaceholder')}
            value={hostActionOptions.bootEnvironment}
            onChange={event =>
              setHostActionOptions(prev => ({
                ...prev,
                bootEnvironment: event.target.value,
              }))
            }
          />
          <p className="form-text">{t('hosts.controls.restartOptions.bootEnvironmentNote')}</p>
        </div>
      )}

      {hostActionOptions.restartType === 'standard' && (
        <div className="mb-3">
          <label className="form-label" htmlFor="restart-grace-period">
            {t('hosts.controls.restartOptions.gracePeriod')}
          </label>
          <input
            id="restart-grace-period"
            className="form-control"
            type="number"
            min="0"
            max="7200"
            value={hostActionOptions.gracePeriod}
            onChange={event =>
              setHostActionOptions(prev => ({
                ...prev,
                gracePeriod: Number.parseInt(event.target.value, 10) || 60,
              }))
            }
          />
          <p className="form-text">{t('hosts.controls.restartOptions.gracePeriodNote')}</p>
        </div>
      )}

      <div className="mb-3">
        <label className="form-label" htmlFor="restart-message">
          {t('hosts.controls.restartOptions.message')}
        </label>
        <input
          id="restart-message"
          className="form-control"
          type="text"
          placeholder={t('hosts.controls.restartOptions.messagePlaceholder')}
          maxLength={200}
          value={hostActionOptions.message}
          onChange={event =>
            setHostActionOptions(prev => ({
              ...prev,
              message: event.target.value,
            }))
          }
        />
        <p className="form-text">{t('hosts.controls.restartOptions.messageNote')}</p>
      </div>
    </div>
  );
};

HostRestartOptions.propTypes = {
  hostActionOptions: hostActionOptionsPropType,
  setHostActionOptions: PropTypes.func.isRequired,
  fast: PropTypes.bool.isRequired,
};

/**
 * The options of a host power-off: the power type, shutdown to
 * single-user mode, complete power off or an emergency halt, and for the
 * first two the grace period and the message the system logs carry.
 */
export const HostShutdownOptions = ({ hostActionOptions, setHostActionOptions }) => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="mb-3">
        <label className="form-label" htmlFor="shutdown-type">
          {t('hosts.controls.shutdownOptions.shutdownType')}
        </label>
        <select
          id="shutdown-type"
          className="form-select"
          value={hostActionOptions.powerType}
          onChange={event =>
            setHostActionOptions(prev => ({
              ...prev,
              powerType: event.target.value,
            }))
          }
        >
          <option value="shutdown">{t('hosts.controls.shutdownOptions.shutdown')}</option>
          <option value="poweroff">{t('hosts.controls.shutdownOptions.powerOff')}</option>
          <option value="halt">{t('hosts.controls.shutdownOptions.emergencyHalt')}</option>
        </select>
        <p className="form-text">
          {hostActionOptions.powerType === 'shutdown' &&
            t('hosts.controls.shutdownOptions.shutdownNote')}
          {hostActionOptions.powerType === 'poweroff' &&
            t('hosts.controls.shutdownOptions.powerOffNote')}
          {hostActionOptions.powerType === 'halt' &&
            t('hosts.controls.shutdownOptions.emergencyHaltNote')}
        </p>
      </div>

      {hostActionOptions.powerType !== 'halt' && (
        <div className="mb-3">
          <label className="form-label" htmlFor="shutdown-grace-period">
            {t('hosts.controls.shutdownOptions.gracePeriod')}
          </label>
          <input
            id="shutdown-grace-period"
            className="form-control"
            type="number"
            min="0"
            max="7200"
            value={hostActionOptions.gracePeriod}
            onChange={event =>
              setHostActionOptions(prev => ({
                ...prev,
                gracePeriod: Number.parseInt(event.target.value, 10) || 60,
              }))
            }
          />
          <p className="form-text">{t('hosts.controls.shutdownOptions.gracePeriodNote')}</p>
        </div>
      )}

      {hostActionOptions.powerType !== 'halt' && (
        <div className="mb-3">
          <label className="form-label" htmlFor="shutdown-message">
            {t('hosts.controls.shutdownOptions.message')}
          </label>
          <input
            id="shutdown-message"
            className="form-control"
            type="text"
            placeholder={t('hosts.controls.shutdownOptions.messagePlaceholder')}
            maxLength={200}
            value={hostActionOptions.message}
            onChange={event =>
              setHostActionOptions(prev => ({
                ...prev,
                message: event.target.value,
              }))
            }
          />
          <p className="form-text">{t('hosts.controls.shutdownOptions.messageNote')}</p>
        </div>
      )}
    </div>
  );
};

HostShutdownOptions.propTypes = {
  hostActionOptions: hostActionOptionsPropType,
  setHostActionOptions: PropTypes.func.isRequired,
};

/**
 * The list dialog an action's options are collected in: the title, the
 * options as its body, Cancel and the button that goes on, Continue
 * before a confirmation or the action's own word, `continueKey`, when the
 * dialog is the last step, held `disabled` while the options are not yet
 * complete.
 */
export const ActionOptionsModal = ({
  show,
  title,
  onHide,
  onContinue,
  continueKey = 'hosts.controls.continue',
  disabled = false,
  children,
}) => {
  const { t } = useTranslation();
  return (
    <Modal show={show} onHide={onHide} dialogClassName="list-modal" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{children}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          {t('pages.confirm.cancel')}
        </Button>
        <Button variant="primary" disabled={disabled} onClick={onContinue}>
          {t(continueKey)}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

ActionOptionsModal.propTypes = {
  show: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  onHide: PropTypes.func.isRequired,
  onContinue: PropTypes.func.isRequired,
  continueKey: PropTypes.string,
  disabled: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

/**
 * One row of the Controls menu: a fa6 glyph in its tone and the label,
 * the label's or the tooltip's key or its text, `action` the word the row
 * carries as `data-action`.
 */
export const ActionRow = ({
  icon: Icon,
  tone,
  labelKey = '',
  label = '',
  titleKey = '',
  title = '',
  action = '',
  disabled = false,
  onClick,
}) => {
  const { t } = useTranslation();
  return (
    <Dropdown.Item
      as="button"
      type="button"
      disabled={disabled}
      title={titleKey ? t(titleKey) : title || undefined}
      data-action={action || undefined}
      onClick={onClick}
    >
      <Icon className={`${tone} me-2`} />
      {label || t(labelKey)}
    </Dropdown.Item>
  );
};

ActionRow.propTypes = {
  icon: PropTypes.elementType.isRequired,
  tone: PropTypes.string.isRequired,
  labelKey: PropTypes.string,
  label: PropTypes.string,
  titleKey: PropTypes.string,
  title: PropTypes.string,
  action: PropTypes.string,
  disabled: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};

/**
 * Share link, the first command of both Controls menus: copies the page's
 * own address to the clipboard and raises one notice.
 *
 * @returns {Object} The command
 */
export const useShareCommand = () => {
  const { t } = useTranslation();
  const notify = useNotify();
  return {
    key: 'share-link',
    group: 'share',
    icon: FaShareNodes,
    tone: 'text-info',
    labelKey: 'navbar.navbar.shareLink',
    titleKey: 'navbar.navbar.shareLinktitle',
    action: 'share-link',
    run: () =>
      copyToClipboard(window.location.href)
        .then(() => notify('success', t('copyButton.copied')))
        .catch(() => null),
  };
};

/**
 * The command that stands for the muted line of a role short of the
 * advanced rows; drawn as the line and never searched.
 */
export const PRIVILEGE_NOTE = { key: 'privilege', group: 'privilege', note: true };

const PrivilegeLine = () => {
  const { t } = useTranslation();
  return (
    <Dropdown.ItemText className="text-body-secondary text-center small">
      {t('hosts.controls.privilege')}
    </Dropdown.ItemText>
  );
};

const groupsOf = commands =>
  commands.reduce((groups, command) => {
    const last = groups[groups.length - 1];
    if (last && last.key === command.group) {
      last.commands.push(command);
      return groups;
    }
    return [...groups, { key: command.group, header: command.header, commands: [command] }];
  }, []);

const CommandRow = ({ command }) =>
  command.note ? (
    <PrivilegeLine />
  ) : (
    <ActionRow
      icon={command.icon}
      tone={command.tone}
      labelKey={command.labelKey}
      label={command.label}
      titleKey={command.titleKey}
      title={command.title}
      action={command.action}
      disabled={command.disabled}
      onClick={command.run}
    />
  );

CommandRow.propTypes = {
  command: PropTypes.object.isRequired,
};

/**
 * The rows of the Controls menu from its commands, a divider before each
 * group after the first and a group's header above its rows.
 */
export const CommandRows = ({ commands }) => {
  const { t } = useTranslation();
  return groupsOf(commands).map((group, index) => (
    <Fragment key={group.key}>
      {index > 0 ? <Dropdown.Divider /> : null}
      {group.header ? <Dropdown.Header>{t(group.header)}</Dropdown.Header> : null}
      {group.commands.map(command => (
        <CommandRow key={command.key} command={command} />
      ))}
    </Fragment>
  ));
};

CommandRows.propTypes = {
  commands: PropTypes.arrayOf(PropTypes.object).isRequired,
};
