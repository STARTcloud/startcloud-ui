import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlay, FaSliders, FaTrash } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { useStatus } from '../../../contexts/StatusContext';
import {
  fetchProvisioningNetworkStatus,
  setupProvisioningNetwork,
  teardownProvisioningNetwork,
} from '../api/provisioning';
import { useManageRead, useManageSend, useTaskFollow } from '../hooks/useHostManage';
import { isServerRole } from '../utils/hosts';
import { HEALTH_TONES, componentDetail, componentHealth } from '../utils/manageCatalog';

import { DialogTable } from './ManageTable';
import TaskDialog from './TaskDialog';

const COMPONENT_COLUMNS = [
  {
    key: 'name',
    kind: 'badge',
    labelKey: 'host.provisioningNetworkPanel.components',
    value: row => row.name,
    render: row => (
      <span className={`badge text-bg-${HEALTH_TONES[componentHealth(row.value)]}`}>
        {row.name}
      </span>
    ),
  },
  {
    key: 'detail',
    kind: 'text',
    labelKey: 'host.provisioningNetworkPanel.title',
    prose: true,
    value: row => {
      const detail = componentDetail(row.value);
      return detail.text || detail.key;
    },
    render: (row, ctx) => {
      const detail = componentDetail(row.value);
      return <code className="small">{detail.text || ctx.t(detail.key)}</code>;
    },
  },
];

const CONFIG_COLUMNS = [
  {
    key: 'key',
    kind: 'name',
    labelKey: 'host.provisioningNetworkPanel.title',
    value: row => row.key,
    render: row => <strong>{row.key}</strong>,
  },
  {
    key: 'value',
    kind: 'text',
    labelKey: 'host.provisioningNetworkPanel.components',
    prose: true,
    value: row => String(row.value),
    render: row => <code className="small">{String(row.value)}</code>,
  },
];

const entriesOf = value =>
  value && typeof value === 'object'
    ? Object.entries(value).map(([key, entry]) => ({ key, value: entry }))
    : [];

const MACHINES_CONFIG = '/admin/config/machines';

/**
 * The provisioning network of a host, hyperweaver-ui's panel as the
 * body of the Manage page's Provisioning network section: the status
 * of `GET provisioning/network/status`, the ready badge, the disabled
 * message while the agent says it is off, the components over the one
 * table each tinted by its health and the configuration over another;
 * Edit settings, hyperweaver-ui's door to the agent's settings, opens
 * the config engine's page of the agent's `machines` file, where
 * `provisioning.network` lives, on an agent role alone, since the server
 * role has no config engine over a proxied agent yet; Set up sends `POST provisioning/network/setup` and Tear down, behind
 * the typed confirmation, `DELETE provisioning/network/teardown`, each a
 * queued task followed on `task-updated` and the status read again at
 * its end. Nothing polls.
 */
const ProvisioningNetworkPanel = ({ id, ctx }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const navigate = useNavigate();
  const { send, busy, task, closeTask } = useManageSend(id);
  const network = useManageRead(
    useCallback(() => fetchProvisioningNetworkStatus(status, id), [status, id]),
    true
  );
  const [confirming, setConfirming] = useState(false);
  const follow = useTaskFollow({ id, onEnd: network.refresh });
  const state = network.data;
  const enabled = Boolean(state) && state.enabled !== false;
  const components = entriesOf(state?.components).map(row => ({ name: row.key, value: row.value }));
  const config = entriesOf(state?.config);

  const act = async ({ call, labelKey }) => {
    const { answer, error } = await send({
      call,
      doneKey: 'host.provisioningNetworkPanel.actionQueued',
      values: { label: t(labelKey) },
      failKey: 'hosts.manage.provisioningNetwork.failed',
    });
    if (!error) {
      follow(answer);
      network.refresh();
    }
  };

  return (
    <div className="card" data-panel="provisioning-network-body">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h6 className="fw-bold mb-0">
            {t('host.provisioningNetworkPanel.title')}
            {enabled ? (
              <span
                className={`badge ms-2 text-bg-${state.ready ? 'success' : 'warning'}`}
                data-note={state.ready ? 'network-ready' : 'network-not-ready'}
              >
                {t(
                  state.ready
                    ? 'host.provisioningNetworkPanel.ready'
                    : 'host.provisioningNetworkPanel.notReady'
                )}
              </span>
            ) : null}
          </h6>
          <div className="d-flex gap-2">
            {isServerRole(status) ? null : (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                data-action="network-settings"
                title={t('host.provisioningNetworkPanel.editSettingsTitle')}
                onClick={() => navigate(MACHINES_CONFIG)}
              >
                <FaSliders className="me-1" aria-hidden="true" />
                {t('host.provisioningNetworkPanel.editSettings')}
              </button>
            )}
            {enabled ? (
              <>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  data-action="network-setup"
                  onClick={() =>
                    act({
                      call: () => setupProvisioningNetwork(status, id),
                      labelKey: 'host.provisioningNetworkPanel.setupLabel',
                    })
                  }
                  disabled={busy}
                >
                  <FaPlay className="me-1" aria-hidden="true" />
                  {t('host.provisioningNetworkPanel.setUp')}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  data-action="network-teardown"
                  onClick={() => setConfirming(true)}
                  disabled={busy}
                >
                  <FaTrash className="me-1" aria-hidden="true" />
                  {t('host.provisioningNetworkPanel.tearDown')}
                </button>
              </>
            ) : null}
          </div>
        </div>
        {network.failed ? (
          <div className="alert alert-danger py-2" role="alert" data-note="network-failed">
            {t('host.provisioningNetworkPanel.loadFailed', { message: network.message })}
          </div>
        ) : null}
        {network.loaded ? null : (
          <p className="text-muted mb-0">{t('host.provisioningNetworkPanel.loading')}</p>
        )}
        {state && state.enabled === false ? (
          <div className="alert alert-info mb-0" role="note" data-note="network-disabled">
            {state.message || t('host.provisioningNetworkPanel.disabledMessage')}
          </div>
        ) : null}
        {enabled ? (
          <>
            <p className="form-text text-muted mt-0">
              {t('host.provisioningNetworkPanel.changeAddressingBefore')}{' '}
              <code>provisioning.network</code>{' '}
              {t('host.provisioningNetworkPanel.changeAddressingAfter')}
            </p>
            {components.length > 0 ? (
              <div className="mb-3">
                <h6 className="fw-bold">{t('host.provisioningNetworkPanel.components')}</h6>
                <DialogTable
                  name="network-components"
                  columns={COMPONENT_COLUMNS}
                  rows={components}
                  rowKey={row => row.name}
                  ctx={ctx}
                  emptyText={t('host.provisioningNetworkPanel.missing')}
                />
              </div>
            ) : null}
            {config.length > 0 ? (
              <DialogTable
                name="network-config"
                columns={CONFIG_COLUMNS}
                rows={config}
                rowKey={row => row.key}
                ctx={ctx}
                emptyText={t('host.provisioningNetworkPanel.missing')}
              />
            ) : null}
          </>
        ) : null}
      </div>
      <ConfirmModal
        show={confirming}
        handleClose={() => setConfirming(false)}
        handleConfirm={() =>
          act({
            call: () => teardownProvisioningNetwork(status, id),
            labelKey: 'host.provisioningNetworkPanel.teardownLabel',
          })
        }
        title={t('host.provisioningNetworkPanel.teardownTitle')}
        message={t('host.provisioningNetworkPanel.teardownMessage', {
          hostname: ctx.server.hostname,
        })}
        confirmText={t('host.provisioningNetworkPanel.tearDown')}
      />
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={closeTask} /> : null}
    </div>
  );
};

ProvisioningNetworkPanel.propTypes = {
  id: PropTypes.string.isRequired,
  ctx: PropTypes.shape({
    server: PropTypes.shape({ hostname: PropTypes.string }).isRequired,
  }).isRequired,
};

export default ProvisioningNetworkPanel;
