import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../contexts/StatusContext';
import { log } from '../../../lib/logger';
import { fetchTemplateSources } from '../api/templates';
import { sourceKeyOf, sourceLabelOf } from '../utils/boxCatalog';
import {
  PUBLISH_FORM,
  canPublish,
  defaultSourceOf,
  exportBody,
  publishBody,
} from '../utils/machineTools';

import ToolFormDialog from './ToolFormDialog';

const UNREAD = { sources: [], failed: '' };

const TEXT_FIELDS = [
  {
    key: 'organization',
    labelKey: 'machine.snapshotTemplateModal.organizationLabel',
    placeholder: '',
  },
  { key: 'boxName', labelKey: 'machine.snapshotTemplateModal.boxNameLabel', placeholder: '' },
  { key: 'version', labelKey: 'machine.snapshotTemplateModal.versionLabel', placeholder: '' },
  {
    key: 'architecture',
    labelKey: 'machine.snapshotTemplateModal.architectureLabel',
    placeholder: 'amd64',
  },
  {
    key: 'description',
    labelKey: 'machine.snapshotTemplateModal.descriptionLabel',
    placeholder: '',
  },
];

/**
 * The registries of one host, `GET templates/sources`, read once as the
 * publish dialog opens; none until the agent answers, and `failed` the
 * agent's message when the read failed, so the dialog says why it lists
 * no registry.
 *
 * @param {Object} options - The status, the host and whether to ask
 * @returns {{ sources: Array<Object>, failed: string }} The sources as the agent answers them, and the failure
 */
const useSources = ({ status, id, asked }) => {
  const [read, setRead] = useState(UNREAD);

  useEffect(() => {
    if (!asked) {
      return undefined;
    }
    let live = true;
    fetchTemplateSources(status, id)
      .then(sources => {
        if (live) {
          setRead({ sources, failed: '' });
        }
      })
      .catch(error => {
        log.api.error('Error fetching template sources', { id, error: error.message });
        if (live) {
          setRead({ sources: UNREAD.sources, failed: error.message });
        }
      });
    return () => {
      live = false;
    };
  }, [asked, status, id]);

  return read;
};

const PublishFields = ({ form, sources, busy, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="row g-3">
      <div className="col-12 col-md-6">
        <label className="form-label" htmlFor="template-source">
          {t('machine.snapshotTemplateModal.registryLabel')}
        </label>
        <select
          id="template-source"
          className="form-select"
          value={form.source}
          disabled={busy}
          onChange={event => onChange({ source: event.target.value })}
        >
          <option value="">{t('machine.snapshotTemplateModal.selectOption')}</option>
          {sources.map(source => (
            <option key={sourceKeyOf(source)} value={sourceKeyOf(source)}>
              {source.default
                ? `${sourceLabelOf(source)} ${t('machine.snapshotTemplateModal.defaultSuffix')}`
                : sourceLabelOf(source)}
            </option>
          ))}
        </select>
      </div>
      {TEXT_FIELDS.map(field => (
        <div key={field.key} className="col-12 col-md-6">
          <label className="form-label" htmlFor={`template-${field.key}`}>
            {t(field.labelKey)}
          </label>
          <input
            id={`template-${field.key}`}
            className="form-control"
            type="text"
            placeholder={field.placeholder}
            value={form[field.key]}
            disabled={busy}
            onChange={event => onChange({ [field.key]: event.target.value })}
          />
        </div>
      ))}
    </div>
  );
};

PublishFields.propTypes = {
  form: PropTypes.object.isRequired,
  sources: PropTypes.arrayOf(PropTypes.object).isRequired,
  busy: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

const ExportField = ({ name, filename, busy, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-2">
      <label className="form-label" htmlFor="template-filename">
        {t('machine.snapshotTemplateModal.filenameLabel')}
      </label>
      <input
        id="template-filename"
        className="form-control"
        type="text"
        placeholder={t('machine.snapshotTemplateModal.filenamePlaceholder', {
          machineName: name,
        })}
        value={filename}
        disabled={busy}
        onChange={event => onChange(event.target.value)}
      />
    </div>
  );
};

ExportField.propTypes = {
  name: PropTypes.string.isRequired,
  filename: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The dialog that makes a template of one snapshot, hyperweaver-ui's
 * template-from-snapshot form, a form dialog in two modes, drawn only on
 * a host whose agent reads the snapshot in its export and its publish:
 * `export` makes a local template, the file's name its one field, and
 * `publish` makes one and sends it to a registry, the registry among
 * the ones the host lists, read once as the dialog opens and opened on
 * the host's default, the organization, the box, the version, the
 * architecture and the description. A read of the registries that
 * failed draws the agent's message over the fields. The primary action
 * hands `onSubmit` the mode and the body of the one request; a publish
 * form short of the registry, the organization, the box or the version
 * says so and sends nothing.
 */
const SnapshotTemplateDialog = ({ id, name, snapshot, mode, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const publish = mode === 'publish';
  const { sources, failed } = useSources({ status, id, asked: publish });
  const [filename, setFilename] = useState('');
  const [picked, setPicked] = useState(PUBLISH_FORM);
  const [problem, setProblem] = useState('');
  const form = { ...picked, source: picked.source || defaultSourceOf(sources) };

  const change = patch => {
    setPicked(current => ({ ...current, ...patch }));
    setProblem('');
  };

  const submit = () => {
    if (!publish) {
      onSubmit(mode, exportBody({ name, filename, snapshot }));
      return;
    }
    const complete = canPublish(form);
    setProblem(complete ? '' : 'machine.snapshotTemplateModal.publishFieldsRequired');
    if (complete) {
      onSubmit(mode, publishBody({ name, snapshot, form }));
    }
  };

  return (
    <ToolFormDialog
      dialog={`snapshot-template-${mode}`}
      title={t(
        publish
          ? 'machine.snapshotTemplateModal.publishTitle'
          : 'machine.snapshotTemplateModal.templateTitle',
        { snapshotName: snapshot }
      )}
      submitKey={
        publish
          ? 'machine.snapshotTemplateModal.queuePublishSubmit'
          : 'machine.snapshotTemplateModal.queueExportSubmit'
      }
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <p className="form-text text-muted mt-0">
        {t('machine.snapshotTemplateModal.pointInTimeNote')}
      </p>
      {failed ? (
        <div className="alert alert-danger" role="alert" data-note="registries-failed">
          {t('hosts.template.registriesFailed', { message: failed })}
        </div>
      ) : null}
      {publish ? (
        <PublishFields form={form} sources={sources} busy={busy} onChange={change} />
      ) : (
        <ExportField name={name} filename={filename} busy={busy} onChange={setFilename} />
      )}
    </ToolFormDialog>
  );
};

SnapshotTemplateDialog.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  snapshot: PropTypes.string.isRequired,
  mode: PropTypes.oneOf(['export', 'publish']).isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default SnapshotTemplateDialog;
