import PropTypes from 'prop-types';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload } from 'react-icons/fa6';

import SubTable from '../../../components/common/SubTable';
import UploadProgress from '../../../components/common/UploadProgress';
import { useStatus } from '../../../contexts/StatusContext';
import { nextSort, sortItems } from '../../../utils/sort';
import {
  downloadArtifact,
  fetchRegistryDownloads,
  hclDownloadArtifact,
  prepareArtifactUpload,
  registerArtifact,
  registryDownloadArtifact,
  uploadArtifactFile,
} from '../api/provisioning';
import { useManageRead } from '../hooks/useHostManage';
import { pickDefaultSource, sourceKeyOf, sourceLabelOf } from '../utils/boxCatalog';
import {
  ARTIFACT_TYPES,
  FILE_SOURCES,
  HCL_KINDS,
  LOCATION_DELETE_OPTIONS,
  LOCATION_FORM,
  ROLE_TYPES,
  downloadBody,
  formatSize,
  hclBody,
  hclProblem,
  locationBody,
  locationNeedsRole,
  locationProblem,
  registerBody,
  registryDownloadBody,
  registryFileMatches,
  registryFilesOf,
  registryGroupsOf,
  registryProblem,
  targetProblem,
  transferOptionsOf,
  uploadPrepareBody,
} from '../utils/manageCatalog';

import { PathInput } from './PathPicker';
import SecretPickModal, { SecretPickRow } from './SecretPickModal';
import ToolFormDialog from './ToolFormDialog';

const HCL_PROFILE = 'hcl_portal';

const RESOURCE_PROFILE = 'installer_server';

/**
 * The pick of one secret row of a dialog, a `basic_auth` row of the
 * installer server profile for the mirror credentials or an `api_key`
 * row of the HCL portal profile for the portal key: the secret pick row
 * drawn under `labelKey`, Change opening the secret pick dialog over the
 * host store's rows of the kind, the picked row's name handed to
 * `onChange` and the empty string on clear.
 */
export const SecretPick = ({ id, server, kind, profile, labelKey, name, onChange, disabled }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3" data-field="secret-pick" data-secret-kind={kind}>
      <span className="form-label d-block">{t(labelKey)}</span>
      <SecretPickRow
        label={t(`certs.kind.${kind}`)}
        picked={name ? { id: name, name } : null}
        disabled={disabled}
        onOpen={() => setOpen(true)}
        onClear={() => onChange('')}
        attributes={{ 'data-field': 'secret', 'data-field-name': labelKey.split('.').pop() }}
      />
      {open ? (
        <SecretPickModal
          kind={kind}
          profile={profile}
          host={{ status, hostId: id, server }}
          title={t(labelKey)}
          disabled={disabled}
          onPick={row => {
            onChange(String(row.name || ''));
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
};

SecretPick.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object,
  kind: PropTypes.string.isRequired,
  profile: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

const senderShape = PropTypes.shape({
  send: PropTypes.func.isRequired,
  follow: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
});

const seedShape = PropTypes.shape({
  locationId: PropTypes.string.isRequired,
  role: PropTypes.string.isRequired,
  kind: PropTypes.string.isRequired,
  filename: PropTypes.string.isRequired,
  checksum: PropTypes.string.isRequired,
});

const SOURCE_LABEL_KEYS = {
  registry: 'host.installerFiles.fromBoxVault',
  hcl: 'host.installerFiles.hclPortal',
  download: 'host.installerFiles.downloadUrl',
  upload: 'host.installerFiles.upload',
  register: 'host.installerFiles.registerPath',
};

/**
 * The note a seeded source dialog opens with: the missing file's name
 * and the sha256 it is known by, and one button a source the host
 * offers other than the open one, each handing its kind to `onSwitch`.
 */
const SourceSwitch = ({ seed, current, offered, onSwitch, disabled }) => {
  const { t } = useTranslation();
  if (!seed) {
    return null;
  }
  return (
    <div className="alert alert-warning py-2" role="status" data-note="missing-seed">
      <p className="mb-1">
        {t('host.installerFilesModals.missingFile', { filename: seed.filename })}
      </p>
      {seed.checksum ? (
        <p className="small mb-2">
          <code className="checksum">{seed.checksum}</code>
        </p>
      ) : null}
      <div className="d-flex flex-wrap gap-1">
        {offered
          .filter(kind => kind !== current)
          .map(kind => (
            <button
              key={kind}
              type="button"
              className="btn btn-sm btn-outline-secondary"
              data-action={`source-${kind}`}
              onClick={() => onSwitch(kind)}
              disabled={disabled}
            >
              {t(SOURCE_LABEL_KEYS[kind])}
            </button>
          ))}
      </div>
    </div>
  );
};

SourceSwitch.propTypes = {
  seed: seedShape,
  current: PropTypes.oneOf(FILE_SOURCES).isRequired,
  offered: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSwitch: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

const NameField = ({ id, labelKey, value, onChange, disabled, list = undefined }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-3">
      <label className="form-label" htmlFor={id}>
        {t(labelKey)}
      </label>
      <input
        id={id}
        className="form-control"
        type="text"
        list={list}
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  );
};

NameField.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
  list: PropTypes.string,
};

const SwitchField = ({ id, labelKey, checked, onChange, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="form-check form-switch mb-3">
      <input
        id={id}
        className="form-check-input"
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        disabled={disabled}
      />
      <label className="form-check-label" htmlFor={id}>
        {t(labelKey)}
      </label>
    </div>
  );
};

SwitchField.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

const LocationRoleFields = ({ prefix, locations, form, patch, roleOptions, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="row g-3 mb-3">
      <div className="col-12 col-md-6">
        <label className="form-label" htmlFor={`${prefix}-location`}>
          {t('host.installerFilesModals.storageLocation')}
        </label>
        <select
          id={`${prefix}-location`}
          className="form-select"
          value={form.locationId}
          onChange={event => patch({ locationId: event.target.value })}
          disabled={disabled}
        >
          <option value="">{t('host.installerFilesModals.select')}</option>
          {locations
            .filter(entry => entry.enabled !== false)
            .map(entry => (
              <option key={entry.id} value={entry.id}>
                {entry.name} ({entry.type})
              </option>
            ))}
        </select>
      </div>
      {locationNeedsRole(locations, form.locationId) ? (
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor={`${prefix}-role`}>
            {t('host.installerFilesModals.role')}
          </label>
          <input
            id={`${prefix}-role`}
            className="form-control"
            type="text"
            list={`${prefix}-role-options`}
            value={form.role}
            onChange={event => patch({ role: event.target.value })}
            disabled={disabled}
          />
          <datalist id={`${prefix}-role-options`}>
            {roleOptions.map(option => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>
      ) : null}
    </div>
  );
};

LocationRoleFields.propTypes = {
  prefix: PropTypes.string.isRequired,
  locations: PropTypes.array.isRequired,
  form: PropTypes.shape({
    locationId: PropTypes.string.isRequired,
    role: PropTypes.string.isRequired,
  }).isRequired,
  patch: PropTypes.func.isRequired,
  roleOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  disabled: PropTypes.bool.isRequired,
};

/**
 * The upload dialog, hyperweaver-ui's two steps: the location and the
 * role, the file, the expected checksum and the overwrite switch;
 * `POST artifacts/upload/prepare` answers the task the bytes go up
 * under, the bar drawn as they do, the task followed to its end. A
 * `seed`, a missing row's, fills the location, the role and the checksum
 * and draws the other sources over the fields.
 */
export const UploadModal = ({
  id,
  locations,
  roleOptions,
  sender,
  onClose,
  onDone,
  seed = null,
  offered = FILE_SOURCES,
  onSwitch = null,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [form, setForm] = useState({
    locationId: seed?.locationId || '',
    role: seed?.role || '',
    checksum: seed?.checksum || '',
    overwrite: false,
  });
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [problem, setProblem] = useState('');
  const patch = changes => setForm(current => ({ ...current, ...changes }));

  const submit = async () => {
    const why = targetProblem(locations, form.locationId, form.role);
    const missing = why || (file ? '' : 'host.installerFilesModals.fileRequired');
    setProblem(missing);
    if (missing) {
      return;
    }
    const { answer, error } = await sender.send({
      call: async () => {
        const prepared = await prepareArtifactUpload(status, id, uploadPrepareBody(file, form));
        setProgress(0);
        const done = await uploadArtifactFile(status, id, prepared.task_id, file, event => {
          if (event.total) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        });
        return { ...done, task_id: prepared.task_id };
      },
      doneKey: 'host.installerFilesModals.uploadQueuedDefault',
      failKey: 'hosts.manage.installers.uploadFailed',
    });
    setProgress(null);
    if (!error) {
      sender.follow(answer);
      onDone();
    }
  };

  return (
    <ToolFormDialog
      dialog="artifact-upload"
      title={t('host.installerFilesModals.uploadFile')}
      submitKey="host.installerFilesModals.upload"
      problemKey={problem}
      busy={sender.busy}
      onClose={onClose}
      onSubmit={submit}
    >
      {onSwitch ? (
        <SourceSwitch
          seed={seed}
          current="upload"
          offered={offered}
          onSwitch={onSwitch}
          disabled={sender.busy}
        />
      ) : null}
      <LocationRoleFields
        prefix="artifact-upload"
        locations={locations}
        form={form}
        patch={patch}
        roleOptions={roleOptions}
        disabled={sender.busy}
      />
      <div className="mb-3">
        <label className="form-label" htmlFor="artifact-upload-file">
          {t('host.installerFilesModals.file')}
        </label>
        <input
          id="artifact-upload-file"
          className="form-control"
          type="file"
          onChange={event => setFile(event.target.files?.[0] || null)}
          disabled={sender.busy}
        />
      </div>
      <NameField
        id="artifact-upload-checksum"
        labelKey="host.installerFilesModals.expectedSha256Upload"
        value={form.checksum}
        onChange={checksum => patch({ checksum })}
        disabled={sender.busy}
      />
      <SwitchField
        id="artifact-upload-overwrite"
        labelKey="host.installerFilesModals.overwriteExisting"
        checked={form.overwrite}
        onChange={overwrite => patch({ overwrite })}
        disabled={sender.busy}
      />
      {progress !== null && file ? <UploadProgress file={file} progress={progress} /> : null}
    </ToolFormDialog>
  );
};

UploadModal.propTypes = {
  id: PropTypes.string.isRequired,
  locations: PropTypes.array.isRequired,
  roleOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  sender: senderShape.isRequired,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
  seed: seedShape,
  offered: PropTypes.arrayOf(PropTypes.string),
  onSwitch: PropTypes.func,
};

/**
 * The register dialog, hyperweaver-ui's: the location and the role, the
 * file's path on the agent host with the browse button and the move
 * switch; `POST artifacts/register`. A `seed`, a missing row's, fills
 * the location and the role and draws the other sources over the fields.
 */
export const RegisterModal = ({
  id,
  server,
  locations,
  roleOptions,
  sender,
  onClose,
  onDone,
  seed = null,
  offered = FILE_SOURCES,
  onSwitch = null,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [form, setForm] = useState({
    locationId: seed?.locationId || '',
    role: seed?.role || '',
    path: '',
    move: false,
  });
  const [problem, setProblem] = useState('');
  const patch = changes => setForm(current => ({ ...current, ...changes }));

  const submit = async () => {
    const why = targetProblem(locations, form.locationId, form.role);
    const missing = why || (form.path.trim() ? '' : 'host.installerFilesModals.filePathRequired');
    setProblem(missing);
    if (missing) {
      return;
    }
    const { error } = await sender.send({
      call: () => registerArtifact(status, id, registerBody(form)),
      doneKey: 'host.installerFilesModals.registered',
      failKey: 'hosts.manage.installers.registerFailed',
    });
    if (!error) {
      onDone();
    }
  };

  return (
    <ToolFormDialog
      dialog="artifact-register"
      title={t('host.installerFilesModals.registerLocalFile')}
      submitKey="host.installerFilesModals.register"
      problemKey={problem}
      busy={sender.busy}
      onClose={onClose}
      onSubmit={submit}
    >
      {onSwitch ? (
        <SourceSwitch
          seed={seed}
          current="register"
          offered={offered}
          onSwitch={onSwitch}
          disabled={sender.busy}
        />
      ) : null}
      <LocationRoleFields
        prefix="artifact-register"
        locations={locations}
        form={form}
        patch={patch}
        roleOptions={roleOptions}
        disabled={sender.busy}
      />
      <div className="mb-3">
        <label className="form-label" htmlFor="artifact-register-path">
          {t('host.installerFilesModals.pathOnAgentHost')}
        </label>
        <PathInput
          id="artifact-register-path"
          value={form.path}
          onChange={path => patch({ path })}
          status={status}
          hostId={id}
          server={server}
          mode="file"
          pickTitle={t('host.installerFilesModals.pickFileToRegister')}
          disabled={sender.busy}
        />
      </div>
      <SwitchField
        id="artifact-register-move"
        labelKey="host.installerFilesModals.moveRegister"
        checked={form.move}
        onChange={move => patch({ move })}
        disabled={sender.busy}
      />
    </ToolFormDialog>
  );
};

RegisterModal.propTypes = {
  ...UploadModal.propTypes,
  server: PropTypes.object.isRequired,
};

/**
 * The download dialog, hyperweaver-ui's: the location and the role, the
 * URL, the file name, the expected checksum, the overwrite switch and
 * the mirror credentials, a `basic_auth` row of the host's store picked
 * through the secret pick dialog, its name sent as `resource_name`;
 * `POST artifacts/download`,
 * a queued task followed to its end. A `seed`, a missing row's, fills
 * the location, the role, the file name and the checksum and draws the
 * other sources over the fields.
 */
export const DownloadModal = ({
  id,
  server = null,
  locations,
  roleOptions,
  sender,
  onClose,
  onDone,
  seed = null,
  offered = FILE_SOURCES,
  onSwitch = null,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [form, setForm] = useState({
    locationId: seed?.locationId || '',
    role: seed?.role || '',
    url: '',
    filename: seed?.filename || '',
    checksum: seed?.checksum || '',
    overwrite: false,
    resourceName: '',
  });
  const [problem, setProblem] = useState('');
  const patch = changes => setForm(current => ({ ...current, ...changes }));

  const submit = async () => {
    const why = targetProblem(locations, form.locationId, form.role);
    const missing = why || (form.url.trim() ? '' : 'host.installerFilesModals.urlRequired');
    setProblem(missing);
    if (missing) {
      return;
    }
    const { answer, error } = await sender.send({
      call: () => downloadArtifact(status, id, downloadBody(form)),
      doneKey: 'host.installerFilesModals.downloadQueuedDefault',
      failKey: 'hosts.manage.installers.downloadFailed',
    });
    if (!error) {
      sender.follow(answer);
      onDone();
    }
  };

  return (
    <ToolFormDialog
      dialog="artifact-download"
      title={t('host.installerFilesModals.downloadFromUrl')}
      submitKey="host.installerFilesModals.queueDownload"
      problemKey={problem}
      busy={sender.busy}
      onClose={onClose}
      onSubmit={submit}
    >
      {onSwitch ? (
        <SourceSwitch
          seed={seed}
          current="download"
          offered={offered}
          onSwitch={onSwitch}
          disabled={sender.busy}
        />
      ) : null}
      <LocationRoleFields
        prefix="artifact-download"
        locations={locations}
        form={form}
        patch={patch}
        roleOptions={roleOptions}
        disabled={sender.busy}
      />
      <div className="mb-3">
        <label className="form-label" htmlFor="artifact-download-url">
          {t('host.installerFilesModals.url')}
        </label>
        <input
          id="artifact-download-url"
          className="form-control"
          type="text"
          placeholder="https://…"
          value={form.url}
          onChange={event => patch({ url: event.target.value })}
          disabled={sender.busy}
        />
      </div>
      <NameField
        id="artifact-download-filename"
        labelKey="host.installerFilesModals.filenameBlankFromUrl"
        value={form.filename}
        onChange={filename => patch({ filename })}
        disabled={sender.busy}
      />
      <NameField
        id="artifact-download-sha"
        labelKey="host.installerFilesModals.expectedSha256Download"
        value={form.checksum}
        onChange={checksum => patch({ checksum })}
        disabled={sender.busy}
      />
      <SwitchField
        id="artifact-download-overwrite"
        labelKey="host.installerFilesModals.overwrite"
        checked={form.overwrite}
        onChange={overwrite => patch({ overwrite })}
        disabled={sender.busy}
      />
      <SecretPick
        id={id}
        server={server}
        kind="basic_auth"
        profile={RESOURCE_PROFILE}
        labelKey="host.installerFilesModals.mirrorCredentials"
        name={form.resourceName}
        onChange={resourceName => patch({ resourceName })}
        disabled={sender.busy}
      />
    </ToolFormDialog>
  );
};

DownloadModal.propTypes = {
  ...UploadModal.propTypes,
  server: PropTypes.object,
};

/**
 * The HCL portal download dialog, hyperweaver-ui's: the role, the kind,
 * the file name as the portal names it and the portal key, an `api_key`
 * row of the host's store picked through the secret pick dialog, its
 * name sent as `key_name`; `POST artifacts/hcl-download`, a queued task
 * followed to
 * its end. A `seed`, a missing row's, fills the role, the kind and the
 * file name and draws the other sources over the fields.
 */
export const HclDownloadModal = ({
  id,
  server = null,
  roleOptions,
  sender,
  onClose,
  onDone,
  seed = null,
  offered = FILE_SOURCES,
  onSwitch = null,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [form, setForm] = useState({
    role: seed?.role || '',
    kind: seed && HCL_KINDS.includes(seed.kind) ? seed.kind : 'installer',
    filename: seed?.filename || '',
    keyName: '',
  });
  const [problem, setProblem] = useState('');
  const patch = changes => setForm(current => ({ ...current, ...changes }));

  const submit = async () => {
    const why = hclProblem(form);
    setProblem(why);
    if (why) {
      return;
    }
    const { answer, error } = await sender.send({
      call: () => hclDownloadArtifact(status, id, hclBody(form)),
      doneKey: 'host.installerFilesModals.hclDownloadQueuedDefault',
      failKey: 'hosts.manage.installers.downloadFailed',
    });
    if (!error) {
      sender.follow(answer);
      onDone();
    }
  };

  return (
    <ToolFormDialog
      dialog="artifact-hcl"
      title={t('host.installerFilesModals.downloadFromHclPortal')}
      submitKey="host.installerFilesModals.queueDownload"
      problemKey={problem}
      busy={sender.busy}
      onClose={onClose}
      onSubmit={submit}
    >
      {onSwitch ? (
        <SourceSwitch
          seed={seed}
          current="hcl"
          offered={offered}
          onSwitch={onSwitch}
          disabled={sender.busy}
        />
      ) : null}
      <div className="row g-3 mb-3">
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="artifact-hcl-role">
            {t('host.installerFilesModals.role')}
          </label>
          <input
            id="artifact-hcl-role"
            className="form-control"
            type="text"
            list="artifact-hcl-role-options"
            value={form.role}
            onChange={event => patch({ role: event.target.value })}
            disabled={sender.busy}
          />
          <datalist id="artifact-hcl-role-options">
            {roleOptions.map(option => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="artifact-hcl-kind">
            {t('host.installerFilesModals.kind')}
          </label>
          <select
            id="artifact-hcl-kind"
            className="form-select"
            value={form.kind}
            onChange={event => patch({ kind: event.target.value })}
            disabled={sender.busy}
          >
            {HCL_KINDS.map(kind => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </div>
      </div>
      <NameField
        id="artifact-hcl-filename"
        labelKey="host.installerFilesModals.hclFilename"
        value={form.filename}
        onChange={filename => patch({ filename })}
        disabled={sender.busy}
      />
      <SecretPick
        id={id}
        server={server}
        kind="api_key"
        profile={HCL_PROFILE}
        labelKey="host.installerFilesModals.hclPortalKey"
        name={form.keyName}
        onChange={keyName => patch({ keyName })}
        disabled={sender.busy}
      />
    </ToolFormDialog>
  );
};

HclDownloadModal.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object,
  roleOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  sender: senderShape.isRequired,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
  seed: seedShape,
  offered: PropTypes.arrayOf(PropTypes.string),
  onSwitch: PropTypes.func,
};

const NO_HIDDEN = new Set();

const checksumOf = row => row.sha256 || row.checksum;

const REGISTRY_COLUMNS = [
  {
    key: 'filename',
    kind: 'name',
    labelKey: 'host.installerFiles.colFilename',
    value: row => row.filename,
    render: (row, ctx) => (
      <span className="d-inline-flex align-items-center gap-2 flex-wrap">
        <code className="small">{row.filename}</code>
        {registryFileMatches(row, ctx.seed) ? (
          <span className="badge text-bg-primary" data-note="seed-match">
            {ctx.t('host.installerFilesModals.seedMatch')}
          </span>
        ) : null}
      </span>
    ),
  },
  {
    key: 'kind',
    kind: 'word',
    labelKey: 'host.installerFilesModals.kind',
    value: row => row.kind,
  },
  {
    key: 'platform',
    kind: 'word',
    labelKey: 'host.installerFilesModals.platform',
    priority: 4,
    value: row => row.platform,
  },
  {
    key: 'architecture',
    kind: 'word',
    labelKey: 'host.installerFilesModals.architecture',
    priority: 4,
    value: row => row.architecture,
  },
  {
    key: 'size',
    kind: 'size',
    labelKey: 'host.installerFiles.colSize',
    value: row => row.size,
    render: row => <span className="small">{formatSize(row.size)}</span>,
  },
  {
    key: 'checksum',
    kind: 'checksum',
    labelKey: 'host.installerFilesModals.checksum',
    priority: 5,
    value: row => checksumOf(row),
    render: row =>
      checksumOf(row) ? (
        <code className="checksum" title={row.sha256 ? 'sha256' : row.checksumType}>
          {checksumOf(row)}
        </code>
      ) : (
        '-'
      ),
  },
];

const RegistryRowActions = ({ row, busy, onDownload }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-primary"
      title={t('host.installerFilesModals.download')}
      aria-label={t('host.installerFilesModals.download')}
      data-action="registry-download"
      data-file={row.key}
      disabled={busy}
      onClick={() => onDownload(row)}
    >
      <FaDownload aria-hidden="true" />
    </button>
  );
};

RegistryRowActions.propTypes = {
  row: PropTypes.shape({ key: PropTypes.string.isRequired }).isRequired,
  busy: PropTypes.bool.isRequired,
  onDownload: PropTypes.func.isRequired,
};

/**
 * The From BoxVault dialog: the registry among the host's enabled box
 * registries, opening on the default one, its download files read once
 * a registry is picked through `GET artifacts/registry/{source}/downloads`
 * and drawn over the one table grouped by download, release and patch,
 * each file its kind, platform, architecture, size and checksum; the
 * role with its datalist, the location among the installer family's
 * while one is picked and the kind's own otherwise, and the overwrite
 * switch; a row's Download sends `POST artifacts/registry-download`, a
 * queued task followed to its end. A `seed`, a missing row's, fills the
 * role, marks the file it is known as and draws the other sources over
 * the table.
 */
export const RegistryDownloadModal = ({
  id,
  locations,
  sources,
  roleOptions,
  sender,
  onClose,
  onDone,
  seed = null,
  offered = FILE_SOURCES,
  onSwitch = null,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const registries = sources.filter(source => source.enabled !== false);
  const [form, setForm] = useState({
    source: sourceKeyOf(pickDefaultSource(registries)),
    role: seed?.role || '',
    locationId: '',
    overwrite: false,
  });
  const [problem, setProblem] = useState('');
  const [sort, setSort] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const patch = changes => setForm(current => ({ ...current, ...changes }));
  const listing = useManageRead(
    useCallback(() => fetchRegistryDownloads(status, id, form.source), [status, id, form.source]),
    Boolean(form.source)
  );
  const ctx = useMemo(() => ({ t, seed }), [t, seed]);
  const rows = useMemo(
    () => sortItems(registryFilesOf(listing.data), sort, REGISTRY_COLUMNS, ctx),
    [listing.data, sort, ctx]
  );
  const groups = useMemo(() => registryGroupsOf(rows), [rows]);
  const roleLocations = locations.filter(
    entry => entry.enabled !== false && ROLE_TYPES.includes(entry.type)
  );

  const download = async row => {
    const why = registryProblem(form);
    setProblem(why);
    if (why) {
      return;
    }
    const { answer, error } = await sender.send({
      call: () => registryDownloadArtifact(status, id, registryDownloadBody(row, form)),
      doneKey: 'host.installerFilesModals.registryDownloadQueued',
      values: { filename: row.filename },
      failKey: 'hosts.manage.installers.downloadFailed',
    });
    if (!error) {
      sender.follow(answer);
      onDone();
    }
  };

  return (
    <ToolFormDialog
      dialog="artifact-registry"
      title={t('host.installerFilesModals.downloadFromRegistry')}
      problemKey={problem}
      busy={sender.busy}
      onClose={onClose}
      onSubmit={() => undefined}
    >
      {onSwitch ? (
        <SourceSwitch
          seed={seed}
          current="registry"
          offered={offered}
          onSwitch={onSwitch}
          disabled={sender.busy}
        />
      ) : null}
      <div className="row g-3 mb-3">
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="artifact-registry-source">
            {t('host.installerFilesModals.registry')}
          </label>
          <select
            id="artifact-registry-source"
            className="form-select"
            value={form.source}
            onChange={event => patch({ source: event.target.value })}
            disabled={sender.busy || registries.length === 0}
          >
            {registries.length === 0 ? (
              <option value="">{t('host.templatesManagement.noRegistriesConfiguredOption')}</option>
            ) : null}
            {registries.map(source => (
              <option key={sourceKeyOf(source)} value={sourceKeyOf(source)}>
                {sourceLabelOf(source)}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="artifact-registry-role">
            {t('host.installerFilesModals.role')}
          </label>
          <input
            id="artifact-registry-role"
            className="form-control"
            type="text"
            list="artifact-registry-role-options"
            value={form.role}
            onChange={event => patch({ role: event.target.value })}
            disabled={sender.busy}
          />
          <datalist id="artifact-registry-role-options">
            {roleOptions.map(option => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="artifact-registry-location">
            {t('host.installerFilesModals.storageLocation')}
          </label>
          <select
            id="artifact-registry-location"
            className="form-select"
            value={form.locationId}
            onChange={event => patch({ locationId: event.target.value })}
            disabled={sender.busy}
          >
            <option value="">{t('host.installerFilesModals.kindsOwnLocation')}</option>
            {roleLocations.map(entry => (
              <option key={entry.id} value={entry.id}>
                {entry.name} ({entry.type})
              </option>
            ))}
          </select>
        </div>
      </div>
      <SwitchField
        id="artifact-registry-overwrite"
        labelKey="host.installerFilesModals.overwrite"
        checked={form.overwrite}
        onChange={overwrite => patch({ overwrite })}
        disabled={sender.busy}
      />
      {listing.failed ? (
        <div className="alert alert-danger py-2" role="alert" data-note="registry-failed">
          {t('host.installerFilesModals.registryReadFailed', { message: listing.message })}
        </div>
      ) : null}
      {form.source && !listing.loaded ? (
        <p className="text-muted mb-0">{t('pages.loading')}</p>
      ) : null}
      <div data-table="registry-files" data-count={rows.length}>
        <SubTable
          columns={REGISTRY_COLUMNS}
          rows={rows}
          groups={groups.length > 0 ? groups : null}
          collapsed={collapsed}
          onToggleGroup={key => setCollapsed(current => ({ ...current, [key]: !current[key] }))}
          countKey="host.installerFilesModals.filesCount"
          rowKey={row => row.key}
          RowActions={RegistryRowActions}
          actionsProps={{ busy: sender.busy, onDownload: download }}
          sort={sort}
          onSort={(column, options) => setSort(current => nextSort(current, column, options))}
          hiddenColumns={NO_HIDDEN}
          ctx={ctx}
          emptyText={t(
            listing.loaded
              ? 'host.installerFilesModals.registryEmpty'
              : 'host.installerFilesModals.pickRegistry'
          )}
        />
      </div>
    </ToolFormDialog>
  );
};

RegistryDownloadModal.propTypes = {
  id: PropTypes.string.isRequired,
  locations: PropTypes.array.isRequired,
  sources: PropTypes.array.isRequired,
  roleOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  sender: senderShape.isRequired,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
  seed: seedShape,
  offered: PropTypes.arrayOf(PropTypes.string),
  onSwitch: PropTypes.func,
};

/**
 * The storage location dialog, hyperweaver-ui's add and edit: the name,
 * the type and the path, fixed on an edit, with the browse button, and
 * the enabled switch; the submit hands the body of `locationBody` up.
 */
export const LocationFormModal = ({ id, server, editing, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [form, setForm] = useState(() =>
    editing
      ? {
          name: editing.name,
          path: editing.path,
          type: editing.type,
          enabled: editing.enabled !== false,
        }
      : LOCATION_FORM
  );
  const [problem, setProblem] = useState('');
  const patch = changes => setForm(current => ({ ...current, ...changes }));

  const submit = () => {
    const why = locationProblem(form, Boolean(editing));
    setProblem(why);
    if (!why) {
      onSubmit(locationBody(form, Boolean(editing)));
    }
  };

  return (
    <ToolFormDialog
      dialog="artifact-location"
      title={
        editing
          ? t('host.installerFiles.editLocationTitle', { name: editing.name })
          : t('host.installerFiles.addStorageLocation')
      }
      submitKey={editing ? 'host.installerFiles.save' : 'host.installerFiles.addLocation'}
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="row g-3">
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="location-name">
            {t('host.installerFiles.name')}
          </label>
          <input
            id="location-name"
            className="form-control"
            value={form.name}
            onChange={event => patch({ name: event.target.value })}
            disabled={busy}
          />
        </div>
        <div className="col-12 col-md-3">
          <label className="form-label" htmlFor="location-type">
            {t(editing ? 'host.installerFiles.typeFixed' : 'host.installerFiles.type')}
          </label>
          <select
            id="location-type"
            className="form-select"
            value={form.type}
            onChange={event => patch({ type: event.target.value })}
            disabled={busy || Boolean(editing)}
          >
            {ARTIFACT_TYPES.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-5">
          <label className="form-label" htmlFor="location-path">
            {t(
              editing
                ? 'host.installerFiles.pathAgentHostFixed'
                : 'host.installerFiles.pathAgentHost'
            )}
          </label>
          {editing ? (
            <input id="location-path" className="form-control" value={form.path} disabled />
          ) : (
            <PathInput
              id="location-path"
              value={form.path}
              onChange={path => patch({ path })}
              status={status}
              hostId={id}
              server={server}
              pickTitle={t('host.installerFiles.pickStorageRoot')}
              disabled={busy}
            />
          )}
        </div>
        <div className="col-12">
          <SwitchField
            id="location-enabled"
            labelKey="host.installerFiles.enabled"
            checked={form.enabled}
            onChange={enabled => patch({ enabled })}
            disabled={busy}
          />
        </div>
      </div>
    </ToolFormDialog>
  );
};

LocationFormModal.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  editing: PropTypes.object,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

const DELETE_OPTION_KEYS = {
  recursive: 'host.installerFiles.deleteOptRecursive',
  remove_db_records: 'host.installerFiles.deleteOptRemoveRecords',
  force: 'host.installerFiles.deleteOptForce',
};

/**
 * The delete location dialog, hyperweaver-ui's: the path named, the
 * three switches of the delete, recursive, the records removed and
 * forced; the submit hands the options up, a queued task.
 */
export const LocationDeleteModal = ({ location, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [options, setOptions] = useState(LOCATION_DELETE_OPTIONS);
  return (
    <ToolFormDialog
      dialog="artifact-location-delete"
      title={t('host.installerFiles.deleteLocationTitle', { name: location.name })}
      submitKey="host.installerFiles.queueDelete"
      variant="danger"
      busy={busy}
      onClose={onClose}
      onSubmit={() => onSubmit(options)}
    >
      <p>
        {t('host.installerFiles.removeLocationBefore')} <code>{location.path}</code>{' '}
        {t('host.installerFiles.removeLocationAfter')}
      </p>
      {Object.entries(DELETE_OPTION_KEYS).map(([key, labelKey]) => (
        <SwitchField
          key={key}
          id={`location-delete-${key}`}
          labelKey={labelKey}
          checked={options[key]}
          onChange={checked => setOptions(current => ({ ...current, [key]: checked }))}
          disabled={busy}
        />
      ))}
    </ToolFormDialog>
  );
};

LocationDeleteModal.propTypes = {
  location: PropTypes.shape({ name: PropTypes.string, path: PropTypes.string }).isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

/**
 * The move or copy dialog, hyperweaver-ui's: the destination among the
 * locations of the artifact's type other than its own, a warning while
 * there is none; the submit hands the destination up, a queued task.
 */
export const TransferModal = ({ kind, artifact, locations, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [destination, setDestination] = useState('');
  const [problem, setProblem] = useState('');
  const options = transferOptionsOf(locations, artifact);
  const submit = () => {
    if (!destination) {
      setProblem('host.installerFiles.pickDestination');
      return;
    }
    onSubmit(destination);
  };
  return (
    <ToolFormDialog
      dialog={`artifact-${kind}`}
      title={t(
        kind === 'move' ? 'host.installerFiles.moveTitle' : 'host.installerFiles.copyTitle',
        {
          filename: artifact.filename,
        }
      )}
      submitKey={
        kind === 'move' ? 'host.installerFiles.queueMove' : 'host.installerFiles.queueCopy'
      }
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <label className="form-label" htmlFor="artifact-transfer-dest">
        {t('host.installerFiles.destinationLocation', { type: artifact.file_type })}
      </label>
      <select
        id="artifact-transfer-dest"
        className="form-select"
        value={destination}
        onChange={event => setDestination(event.target.value)}
        disabled={busy}
      >
        <option value="">{t('host.installerFiles.select')}</option>
        {options.map(location => (
          <option key={location.id} value={location.id}>
            {location.name} — {location.path}
          </option>
        ))}
      </select>
      {options.length === 0 ? (
        <p className="form-text text-warning mb-0" data-note="no-destination">
          {t('host.installerFiles.noOtherLocation', { type: artifact.file_type })}
        </p>
      ) : null}
    </ToolFormDialog>
  );
};

TransferModal.propTypes = {
  kind: PropTypes.oneOf(['move', 'copy']).isRequired,
  artifact: PropTypes.shape({ filename: PropTypes.string, file_type: PropTypes.string }).isRequired,
  locations: PropTypes.array.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

/**
 * The delete artifacts dialog, hyperweaver-ui's: how many entries, the
 * switch that deletes the files with them; the submit hands the switch
 * up, a queued task.
 */
export const DeleteArtifactsModal = ({ count, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [filesToo, setFilesToo] = useState(false);
  return (
    <ToolFormDialog
      dialog="artifact-delete"
      title={t('host.installerFiles.deleteArtifactsTitle', { count })}
      submitKey={
        filesToo ? 'host.installerFiles.deleteEntriesFiles' : 'host.installerFiles.deleteEntries'
      }
      variant="danger"
      busy={busy}
      onClose={onClose}
      onSubmit={() => onSubmit(filesToo)}
    >
      <p>{t('host.installerFiles.deleteEntriesHelp')}</p>
      <SwitchField
        id="artifact-delete-files-too"
        labelKey="host.installerFiles.alsoDeleteFiles"
        checked={filesToo}
        onChange={setFilesToo}
        disabled={busy}
      />
    </ToolFormDialog>
  );
};

DeleteArtifactsModal.propTypes = {
  count: PropTypes.number.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};
