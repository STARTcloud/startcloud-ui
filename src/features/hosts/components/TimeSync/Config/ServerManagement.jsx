import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaServer } from 'react-icons/fa6';

/**
 * The servers of the time synchronization configuration,
 * hyperweaver-ui's: the box that adds one server line, Enter or the
 * button, and the servers the configuration names as badges, each
 * with the cross that drops its line.
 */
const ServerManagement = ({
  serverList,
  newServer,
  setNewServer,
  onAddServer,
  onRemoveServer,
  busy,
}) => {
  const { t } = useTranslation();
  const add = () => {
    if (newServer.trim()) {
      onAddServer();
    }
  };
  return (
    <div className="mb-3" data-panel="time-config-servers">
      <h6 className="fw-bold">{t('hostTime.timeSyncServerManagement.heading')}</h6>
      <div className="input-group mb-3">
        <input
          id="time-config-server"
          className="form-control"
          type="text"
          placeholder={t('hostTime.timeSyncServerManagement.addServerPlaceholder')}
          aria-label={t('hostTime.timeSyncServerManagement.addServerButton')}
          value={newServer}
          onChange={event => setNewServer(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-primary"
          data-action="time-add-server"
          onClick={add}
          disabled={!newServer.trim() || busy}
        >
          <FaPlus className="me-1" aria-hidden="true" />
          {t('hostTime.timeSyncServerManagement.addServerButton')}
        </button>
      </div>
      {serverList.length > 0 ? (
        <>
          <p className="text-muted small">
            {t('hostTime.timeSyncServerManagement.currentServers', { count: serverList.length })}
          </p>
          <div className="d-flex flex-wrap gap-2">
            {serverList.map(server => (
              <span
                key={server}
                className="badge text-bg-secondary d-inline-flex align-items-center gap-1"
                data-server={server}
              >
                <FaServer aria-hidden="true" />
                <span className="font-monospace">{server}</span>
                <button
                  type="button"
                  className="btn-close btn-close-white ms-1"
                  aria-label={t('hosts.manage.time.removeServer', { server })}
                  data-action="time-remove-server"
                  onClick={() => onRemoveServer(server)}
                  disabled={busy}
                />
              </span>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};

ServerManagement.propTypes = {
  serverList: PropTypes.arrayOf(PropTypes.string).isRequired,
  newServer: PropTypes.string.isRequired,
  setNewServer: PropTypes.func.isRequired,
  onAddServer: PropTypes.func.isRequired,
  onRemoveServer: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
};

export default ServerManagement;
