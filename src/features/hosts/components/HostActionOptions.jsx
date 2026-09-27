import PropTypes from 'prop-types';
import { Button, Dropdown, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

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
 * and the message the system logs carry.
 */
export const HostRestartOptions = ({ hostActionOptions, setHostActionOptions }) => {
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
          <option value="fast">{t('hosts.controls.restartOptions.fastReboot')}</option>
        </select>
        <p className="form-text">{t('hosts.controls.restartOptions.fastRebootNote')}</p>
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
 * The list dialog an action's options are collected in before its
 * confirmation: the title, the options as its body, Cancel and Continue.
 */
export const ActionOptionsModal = ({ show, title, onHide, onContinue, children }) => {
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
        <Button variant="primary" onClick={onContinue}>
          {t('hosts.controls.continue')}
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
  children: PropTypes.node.isRequired,
};

/**
 * One row of the Controls menu: a fa6 glyph in its tone and the label.
 */
export const ActionRow = ({ icon: Icon, tone, labelKey, disabled = false, onClick }) => {
  const { t } = useTranslation();
  return (
    <Dropdown.Item as="button" type="button" disabled={disabled} onClick={onClick}>
      <Icon className={`${tone} me-2`} />
      {t(labelKey)}
    </Dropdown.Item>
  );
};

ActionRow.propTypes = {
  icon: PropTypes.elementType.isRequired,
  tone: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};

/**
 * The muted last line of the Controls menu for a person whose role does
 * not reach the advanced rows.
 */
export const PrivilegeLine = () => {
  const { t } = useTranslation();
  return (
    <Dropdown.ItemText className="text-body-secondary text-center small">
      {t('hosts.controls.privilege')}
    </Dropdown.ItemText>
  );
};
