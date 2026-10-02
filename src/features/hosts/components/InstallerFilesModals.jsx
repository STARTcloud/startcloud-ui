import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import UploadProgress from '../../../components/common/UploadProgress';
import { useStatus } from '../../../contexts/StatusContext';
import {
  downloadArtifact,
  hclDownloadArtifact,
  prepareArtifactUpload,
  registerArtifact,
  uploadArtifactFile,
} from '../api/provisioning';
import {
  ARTIFACT_TYPES,
  HCL_KINDS,
  LOCATION_DELETE_OPTIONS,
  LOCATION_FORM,
  downloadBody,
  hclBody,
  hclProblem,
  locationBody,
  locationNeedsRole,
  locationProblem,
  registerBody,
  targetProblem,
  transferOptionsOf,
  uploadPrepareBody,
} from '../utils/manageCatalog';

import { PathInput } from './PathPicker';
import ToolFormDialog from './ToolFormDialog';

const senderShape = PropTypes.shape({
  send: PropTypes.func.isRequired,
  follow: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
});

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
 * under, the bar drawn as they do, the task followed to its end.
 */
export const UploadModal = ({ id, locations, roleOptions, sender, onClose, onDone }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [form, setForm] = useState({ locationId: '', role: '', checksum: '', overwrite: false });
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
};

/**
 * The register dialog, hyperweaver-ui's: the location and the role, the
 * file's path on the agent host with the browse button and the move
 * switch; `POST artifacts/register`.
 */
export const RegisterModal = ({ id, server, locations, roleOptions, sender, onClose, onDone }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [form, setForm] = useState({ locationId: '', role: '', path: '', move: false });
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
 * the mirror credentials, a select of the secrets' names while they
 * could be read and a typed name otherwise; `POST artifacts/download`,
 * a queued task followed to its end.
 */
export const DownloadModal = ({
  id,
  locations,
  roleOptions,
  resourceNames,
  sender,
  onClose,
  onDone,
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [form, setForm] = useState({
    locationId: '',
    role: '',
    url: '',
    filename: '',
    checksum: '',
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
      <div className="mb-3">
        <label className="form-label" htmlFor="artifact-download-resource">
          {t('host.installerFilesModals.mirrorCredentials')}
        </label>
        {resourceNames ? (
          <select
            id="artifact-download-resource"
            className="form-select"
            value={form.resourceName}
            onChange={event => patch({ resourceName: event.target.value })}
            disabled={sender.busy}
          >
            <option value="">{t('host.installerFilesModals.nonePublicUrl')}</option>
            {resourceNames.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="artifact-download-resource"
            className="form-control"
            type="text"
            placeholder={t('host.installerFilesModals.resourceNamePlaceholder')}
            value={form.resourceName}
            onChange={event => patch({ resourceName: event.target.value })}
            disabled={sender.busy}
          />
        )}
      </div>
    </ToolFormDialog>
  );
};

DownloadModal.propTypes = {
  ...UploadModal.propTypes,
  resourceNames: PropTypes.arrayOf(PropTypes.string),
};

/**
 * The HCL portal download dialog, hyperweaver-ui's: the role, the kind,
 * the file name as the portal names it and the portal key, a select of
 * the secrets' names while they could be read and a typed name
 * otherwise; `POST artifacts/hcl-download`, a queued task followed to
 * its end.
 */
export const HclDownloadModal = ({ id, roleOptions, hclKeyNames, sender, onClose, onDone }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [form, setForm] = useState({ role: '', kind: 'installer', filename: '', keyName: '' });
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
      <div className="mb-3">
        <label className="form-label" htmlFor="artifact-hcl-key">
          {t('host.installerFilesModals.hclPortalKey')}
        </label>
        {hclKeyNames ? (
          <select
            id="artifact-hcl-key"
            className="form-select"
            value={form.keyName}
            onChange={event => patch({ keyName: event.target.value })}
            disabled={sender.busy}
          >
            <option value="">{t('host.installerFilesModals.select')}</option>
            {hclKeyNames.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="artifact-hcl-key"
            className="form-control"
            type="text"
            placeholder={t('host.installerFilesModals.hclKeyPlaceholder')}
            value={form.keyName}
            onChange={event => patch({ keyName: event.target.value })}
            disabled={sender.busy}
          />
        )}
        <p className="form-text text-muted mb-0">{t('host.installerFilesModals.hclKeyHelp')}</p>
      </div>
    </ToolFormDialog>
  );
};

HclDownloadModal.propTypes = {
  id: PropTypes.string.isRequired,
  roleOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  hclKeyNames: PropTypes.arrayOf(PropTypes.string),
  sender: senderShape.isRequired,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
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
