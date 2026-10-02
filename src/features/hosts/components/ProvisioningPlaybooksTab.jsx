import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import StepCardList from './ProvisioningStepList';
import { LinesField, OptionalBoolSelect } from './ProvisioningVarRows';

const RUN_MODES = ['always', 'once', 'not_first'];

const PATH_LIST_ID = 'playbook-path-options';

const PlaybookTitle = ({ playbook }) => {
  const { t } = useTranslation();
  const collections = Array.isArray(playbook.collections) ? playbook.collections.length : 0;
  return (
    <>
      <span className="hw-rc-role">{playbook.playbook || '—'}</span>
      <span className="hw-chip hw-chip-tag">
        {t('provisioning.provisioningPlaybooksTab.runChip', { run: playbook.run || 'once' })}
      </span>
      {collections > 0 ? (
        <span className="hw-chip">
          {t('provisioning.provisioningPlaybooksTab.collectionsChip', { count: collections })}
          {playbook.remote_collections === true
            ? ` ${t('provisioning.provisioningPlaybooksTab.galaxySuffix')}`
            : ''}
        </span>
      ) : null}
      {playbook.install_mode ? <span className="hw-chip">{playbook.install_mode}</span> : null}
    </>
  );
};

PlaybookTitle.propTypes = {
  playbook: PropTypes.object.isRequired,
};

const PlaybookBody = ({ playbook, patch, disabled, pathListId, placement, onPlacementChange }) => {
  const { t } = useTranslation();
  const uiId = playbook._ui_id;
  const text = (key, value) => patch({ [key]: value === '' ? undefined : value });
  return (
    <>
      {playbook.description ? <p className="hw-rc-desc">{playbook.description}</p> : null}
      <div className="hw-rc-fields">
        <span className="hw-field">
          <label htmlFor={`playbook-path-${uiId}`}>
            {t('provisioning.provisioningPlaybooksTab.playbookLabel')}
          </label>
          <input
            id={`playbook-path-${uiId}`}
            className="form-control form-control-sm font-monospace hw-field-med"
            type="text"
            list={pathListId}
            value={playbook.playbook ?? ''}
            disabled={disabled}
            onChange={event => patch({ playbook: event.target.value })}
          />
        </span>
        <span className="hw-field">
          <label htmlFor={`playbook-placement-${uiId}`}>
            {t('provisioning.provisioningPlaybooksTab.runsLabel')}
          </label>
          <select
            id={`playbook-placement-${uiId}`}
            className="form-select form-select-sm w-auto"
            value={placement}
            disabled={disabled}
            onChange={event => {
              if (event.target.value !== placement) {
                onPlacementChange(event.target.value);
              }
            }}
          >
            <option value="local">
              {t('provisioning.provisioningPlaybooksTab.runsLocalOption')}
            </option>
            <option value="remote">
              {t('provisioning.provisioningPlaybooksTab.runsRemoteOption')}
            </option>
          </select>
        </span>
        <span className="hw-field">
          <label htmlFor={`playbook-run-${uiId}`}>
            {t('provisioning.provisioningPlaybooksTab.runLabel')}
          </label>
          <select
            id={`playbook-run-${uiId}`}
            className="form-select form-select-sm w-auto"
            value={playbook.run ?? 'once'}
            disabled={disabled}
            onChange={event => patch({ run: event.target.value })}
          >
            {RUN_MODES.map(mode => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </span>
        <span className="hw-field">
          <label htmlFor={`playbook-install-${uiId}`}>
            {t('provisioning.provisioningPlaybooksTab.installAnsibleViaLabel')}
          </label>
          <select
            id={`playbook-install-${uiId}`}
            className="form-select form-select-sm w-auto"
            value={playbook.install_mode ?? ''}
            disabled={disabled}
            onChange={event => text('install_mode', event.target.value)}
          >
            <option value="">{t('provisioning.provisioningPlaybooksTab.notSetOption')}</option>
            <option value="pip">pip</option>
            <option value="pkg">pkg</option>
          </select>
        </span>
      </div>
      <div className="hw-rc-fields">
        <span className="hw-field">
          <label htmlFor={`playbook-interpreter-${uiId}`}>
            {t('provisioning.provisioningPlaybooksTab.pythonInterpreterLabel')}
          </label>
          <input
            id={`playbook-interpreter-${uiId}`}
            className="form-control form-control-sm font-monospace hw-field-med"
            type="text"
            placeholder="/usr/bin/python3"
            value={playbook.ansible_python_interpreter ?? ''}
            disabled={disabled}
            onChange={event => text('ansible_python_interpreter', event.target.value)}
          />
        </span>
        <span className="hw-field">
          <label htmlFor={`playbook-config-${uiId}`}>
            {t('provisioning.provisioningPlaybooksTab.configFileLabel')}
          </label>
          <input
            id={`playbook-config-${uiId}`}
            className="form-control form-control-sm font-monospace hw-field-med"
            type="text"
            placeholder="/vagrant/ansible/ansible.cfg"
            value={playbook.config_file ?? ''}
            disabled={disabled}
            onChange={event => text('config_file', event.target.value)}
          />
        </span>
        <span className="hw-field">
          <label htmlFor={`playbook-workdir-${uiId}`}>
            {t('provisioning.provisioningPlaybooksTab.runFromLabel')}
          </label>
          <input
            id={`playbook-workdir-${uiId}`}
            className="form-control form-control-sm font-monospace hw-field-short"
            type="text"
            placeholder="/vagrant"
            value={playbook.provisioning_path ?? ''}
            disabled={disabled}
            onChange={event => text('provisioning_path', event.target.value)}
          />
        </span>
      </div>
      <div className="hw-rc-fields">
        <span className="hw-field">
          <label htmlFor={`playbook-callbacks-${uiId}`}>
            {t('provisioning.provisioningPlaybooksTab.callbacksLabel')}
          </label>
          <input
            id={`playbook-callbacks-${uiId}`}
            className="form-control form-control-sm font-monospace hw-field-short"
            type="text"
            placeholder="profile_tasks"
            value={playbook.callbacks ?? ''}
            disabled={disabled}
            onChange={event => text('callbacks', event.target.value)}
          />
        </span>
        <span className="hw-field">
          <label htmlFor={`playbook-compat-${uiId}`}>
            {t('provisioning.provisioningPlaybooksTab.compatibilityLabel')}
          </label>
          <input
            id={`playbook-compat-${uiId}`}
            className="form-control form-control-sm hw-field-tiny"
            type="text"
            placeholder="2.0"
            value={playbook.compatibility_mode ?? ''}
            disabled={disabled}
            onChange={event => text('compatibility_mode', event.target.value)}
          />
        </span>
        <OptionalBoolSelect
          id={`playbook-pipelining-${uiId}`}
          label={t('provisioning.provisioningPlaybooksTab.sshPipeliningLabel')}
          value={playbook.ssh_pipelining}
          disabled={disabled}
          onChange={value => patch({ ssh_pipelining: value })}
        />
        <OptionalBoolSelect
          id={`playbook-verbose-${uiId}`}
          label={t('provisioning.provisioningPlaybooksTab.verboseLabel')}
          value={playbook.verbose}
          disabled={disabled}
          onChange={value => patch({ verbose: value })}
        />
        <OptionalBoolSelect
          id={`playbook-remote-collections-${uiId}`}
          label={t('provisioning.provisioningPlaybooksTab.galaxyInstallCollectionsLabel')}
          value={playbook.remote_collections}
          disabled={disabled}
          onChange={value => patch({ remote_collections: value })}
        />
      </div>
      <div className="hw-rc-fields">
        <LinesField
          id={`playbook-collections-${uiId}`}
          label={t('provisioning.provisioningPlaybooksTab.collectionsLabel')}
          lines={playbook.collections}
          disabled={disabled}
          placeholder={'startcloud.startcloud_roles\nstartcloud.hcl_roles'}
          onCommit={list => patch({ collections: list })}
        />
        <span className="hw-field">
          <label htmlFor={`playbook-description-${uiId}`}>
            {t('provisioning.provisioningPlaybooksTab.descriptionLabel')}
          </label>
          <input
            id={`playbook-description-${uiId}`}
            className="form-control form-control-sm hw-field-wide"
            type="text"
            value={playbook.description ?? ''}
            disabled={disabled}
            onChange={event => text('description', event.target.value)}
          />
        </span>
      </div>
      <p className="form-text text-muted mb-0">
        <code>galaxy-install collections: false</code>{' '}
        {t('provisioning.provisioningPlaybooksTab.galaxyExplanation')}
      </p>
    </>
  );
};

PlaybookBody.propTypes = {
  playbook: PropTypes.object.isRequired,
  patch: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  pathListId: PropTypes.string,
  placement: PropTypes.oneOf(['local', 'remote']).isRequired,
  onPlacementChange: PropTypes.func.isRequired,
};

/**
 * The Playbooks tab of the provisioning editor: the first playbook
 * group's `local` and `remote` lists, one card per entry, the render
 * order the run order; a drag reorders within a list and the runs
 * selector moves an entry to the end of the other list.
 */
const ProvisioningPlaybooksTab = ({ playbookLists, pathOptions, onChange, disabled, makeRow }) => {
  const { t } = useTranslation();
  const { local, remote } = playbookLists;
  const pathListId =
    Array.isArray(pathOptions) && pathOptions.length > 0 ? PATH_LIST_ID : undefined;

  const moveTo = (row, target) => {
    const without = list => list.filter(entry => entry._ui_id !== row._ui_id);
    onChange(
      target === 'remote'
        ? { local: without(local), remote: [...remote, row] }
        : { local: [...local, row], remote: without(remote) }
    );
  };

  const renderList = (rows, placement, addLabel) => (
    <StepCardList
      rows={rows}
      onChange={next =>
        onChange(placement === 'local' ? { local: next, remote } : { local, remote: next })
      }
      disabled={disabled}
      addLabel={addLabel}
      makeRow={makeRow}
      renderTitle={playbook => <PlaybookTitle playbook={playbook} />}
      renderBody={(playbook, patch) => (
        <PlaybookBody
          playbook={playbook}
          patch={patch}
          disabled={disabled}
          pathListId={pathListId}
          placement={placement}
          onPlacementChange={target => moveTo(playbook, target)}
        />
      )}
    />
  );

  return (
    <div>
      <p className="form-text text-muted mt-0 mb-2">
        {t('provisioning.provisioningPlaybooksTab.introPart1')} <code>runs</code>{' '}
        {t('provisioning.provisioningPlaybooksTab.introPart2')} <code>run</code>{' '}
        {t('provisioning.provisioningPlaybooksTab.introPart3')} <code>always</code>{' '}
        {t('provisioning.provisioningPlaybooksTab.introPart4')} <code>once</code>{' '}
        {t('provisioning.provisioningPlaybooksTab.introPart5')} <code>not_first</code>{' '}
        {t('provisioning.provisioningPlaybooksTab.introPart6')}
      </p>
      {pathListId ? (
        <datalist id={pathListId}>
          {pathOptions.map(path => (
            <option key={path} value={path} />
          ))}
        </datalist>
      ) : null}
      <h6 className="fs-6 fw-bold mb-2">
        {t('provisioning.provisioningPlaybooksTab.localHeading')}
      </h6>
      {renderList(local, 'local', t('provisioning.provisioningPlaybooksTab.addPlaybook'))}
      <h6 className="fs-6 fw-bold mt-3 mb-2">
        {t('provisioning.provisioningPlaybooksTab.remoteHeading')}
      </h6>
      {renderList(remote, 'remote', t('provisioning.provisioningPlaybooksTab.addRemotePlaybook'))}
    </div>
  );
};

ProvisioningPlaybooksTab.propTypes = {
  playbookLists: PropTypes.shape({
    local: PropTypes.array.isRequired,
    remote: PropTypes.array.isRequired,
  }).isRequired,
  pathOptions: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  makeRow: PropTypes.func.isRequired,
};

export default ProvisioningPlaybooksTab;
