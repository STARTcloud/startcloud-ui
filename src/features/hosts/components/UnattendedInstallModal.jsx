import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaMagnifyingGlass } from 'react-icons/fa6';

import RevealInput from '../../../components/common/RevealInput';
import { detectUnattendedIso } from '../api/machineCreate';
import { fetchIsoArtifacts } from '../api/provisioning';
import { hostHasFeature } from '../utils/capabilities';
import { isoFilenames } from '../utils/machineHelpers';

import { PathInput } from './PathPicker';
import ToolFormDialog from './ToolFormDialog';

const emptyForm = () => ({
  source: 'iso',
  iso: '',
  path: '',
  user: '',
  password: '',
  hostname: '',
  locale: '',
  time_zone: '',
  image_index: '',
  product_key: '',
  install_additions: true,
  start: true,
});

const ADVANCED = [
  {
    key: 'hostname',
    col: 'col-12 col-md-4',
    labelKey: 'machine.unattendedInstallModal.hostnameLabel',
    placeholderKey: 'machine.unattendedInstallModal.hostnamePlaceholder',
  },
  {
    key: 'locale',
    col: 'col-6 col-md-4',
    labelKey: 'machine.unattendedInstallModal.localeLabel',
    placeholderKey: 'machine.unattendedInstallModal.localePlaceholder',
  },
  {
    key: 'time_zone',
    col: 'col-6 col-md-4',
    labelKey: 'machine.unattendedInstallModal.timeZoneLabel',
    placeholderKey: 'machine.unattendedInstallModal.timeZonePlaceholder',
  },
  {
    key: 'image_index',
    col: 'col-6 col-md-4',
    labelKey: 'machine.unattendedInstallModal.imageIndexLabel',
    placeholderKey: 'machine.unattendedInstallModal.imageIndexPlaceholder',
    type: 'number',
  },
  {
    key: 'product_key',
    col: 'col-12 col-md-8',
    labelKey: 'machine.unattendedInstallModal.productKeyLabel',
    placeholderKey: 'machine.unattendedInstallModal.productKeyPlaceholder',
  },
];

const SWITCHES = [
  { key: 'install_additions', labelKey: 'machine.unattendedInstallModal.installAdditionsLabel' },
  { key: 'start', labelKey: 'machine.unattendedInstallModal.startNowLabel' },
];

/**
 * The body of `POST machines/{name}/unattended` an install form sends: the
 * ISO as `iso`, a cached file, or as `path` on the host, the guest user
 * and password, the advanced members where given, `image_index` as a
 * number, `install_additions` always and `start` only when unticked.
 *
 * @param {Object} form - The form
 * @returns {Object} The body
 */
export const unattendedBody = form => ({
  ...(form.source === 'iso' ? { iso: form.iso } : { path: form.path.trim() }),
  user: form.user.trim(),
  password: form.password,
  ...(form.hostname.trim() && { hostname: form.hostname.trim() }),
  ...(form.locale.trim() && { locale: form.locale.trim() }),
  ...(form.time_zone.trim() && { time_zone: form.time_zone.trim() }),
  ...(form.image_index !== '' && { image_index: Number(form.image_index) }),
  ...(form.product_key.trim() && { product_key: form.product_key.trim() }),
  install_additions: form.install_additions,
  ...(form.start === false && { start: false }),
});

/**
 * Why an install form cannot be sent, the key of the sentence, empty for
 * a form that can: a cached ISO must be picked or a path typed, and the
 * guest user and password are required.
 *
 * @param {Object} form - The form
 * @returns {string} The locale key, or the empty string
 */
export const unattendedProblem = form => {
  if (form.source === 'iso' && !form.iso) {
    return 'machine.unattendedInstallModal.isoRequired';
  }
  if (form.source === 'path' && !form.path.trim()) {
    return 'machine.unattendedInstallModal.pathRequired';
  }
  if (!form.user.trim() || !form.password) {
    return 'machine.unattendedInstallModal.credentialsRequired';
  }
  return '';
};

const ProbeNote = ({ probe }) => {
  const { t } = useTranslation();
  const languages = Array.isArray(probe.os_languages) ? probe.os_languages : [];
  return (
    <div className="col-12">
      <div
        className={`alert py-2 ${probe.supported === false ? 'alert-warning' : 'alert-info'}`}
        data-note="probe"
      >
        {t('machine.unattendedInstallModal.detectedPrefix')}{' '}
        <code>{probe.os_typeid || t('machine.unattendedInstallModal.unknownOs')}</code>
        {probe.version ? ` · ${probe.version}` : ''} ·{' '}
        {t(
          probe.supported === false
            ? 'machine.unattendedInstallModal.unsupportedIso'
            : 'machine.unattendedInstallModal.supportedIso'
        )}
        {languages.length > 0 ? ` · ${languages.join(', ')}` : ''}
      </div>
    </div>
  );
};

ProbeNote.propTypes = {
  probe: PropTypes.object.isRequired,
};

/**
 * The dialog that starts an unattended OS install on a VirtualBox machine
 * that is off, hyperweaver-ui's install form, a form dialog: the ISO, a
 * cached one of the host's artifacts while the host lists `artifacts`
 * and answers any, or a path on the host with Probe, which asks
 * VirtualBox what the ISO holds; the guest user and password, both
 * required; the advanced members; and whether the additions are
 * installed and the machine starts. Install hands `onSubmit` the body of
 * the one request; a form that cannot be sent says why and sends
 * nothing; a machine that runs reads the warning that the agent installs
 * on a machine that is off.
 */
const UnattendedInstallModal = ({ status, id, server, name, running, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const cached = hostHasFeature(server, 'artifacts');
  const [form, setForm] = useState(() => ({ ...emptyForm(), source: cached ? 'iso' : 'path' }));
  const [isoOptions, setIsoOptions] = useState([]);
  const [probe, setProbe] = useState(null);
  const [probing, setProbing] = useState(false);
  const [problem, setProblem] = useState('');
  const [probeFailure, setProbeFailure] = useState('');

  useEffect(() => {
    if (!cached) {
      return undefined;
    }
    let mounted = true;
    fetchIsoArtifacts(status, id)
      .then(isoFilenames)
      .catch(() => [])
      .then(names => {
        if (mounted) {
          setIsoOptions(names);
          if (names.length === 0) {
            setForm(current => ({ ...current, source: 'path' }));
          }
        }
      });
    return () => {
      mounted = false;
    };
  }, [cached, status, id]);

  const patch = next => {
    setForm(current => ({ ...current, ...next }));
    setProblem('');
  };

  const handleProbe = async () => {
    setProbing(true);
    setProbe(null);
    setProbeFailure('');
    try {
      setProbe((await detectUnattendedIso(status, id, form.path)) || {});
    } catch (failure) {
      setProbeFailure(
        t('machine.unattendedInstallModal.probeFailed', { message: failure.message })
      );
    } finally {
      setProbing(false);
    }
  };

  const submit = () => {
    const refused = unattendedProblem(form);
    setProblem(refused);
    if (!refused) {
      onSubmit(unattendedBody(form));
    }
  };

  const languages = Array.isArray(probe?.os_languages) ? probe.os_languages : [];
  const held = busy || probing;

  return (
    <ToolFormDialog
      dialog="machine-install"
      title={t('machine.unattendedInstallModal.title', { machineName: name })}
      submitKey="machine.unattendedInstallModal.submit"
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      {running ? (
        <div className="alert alert-warning py-2" role="status" data-note="running">
          {t('machine.unattendedInstallModal.runningWarning', { machineName: name })}
        </div>
      ) : null}
      {probeFailure ? (
        <div className="alert alert-danger py-2" role="alert" data-note="probe-failed">
          {probeFailure}
        </div>
      ) : null}
      <div className="row g-3">
        {isoOptions.length > 0 ? (
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="unattended-source">
              {t('machine.unattendedInstallModal.sourceLabel')}
            </label>
            <select
              id="unattended-source"
              className="form-select"
              value={form.source}
              onChange={event => patch({ source: event.target.value })}
              disabled={held}
            >
              <option value="iso">{t('machine.unattendedInstallModal.cachedIsoOption')}</option>
              <option value="path">{t('machine.unattendedInstallModal.agentPathOption')}</option>
            </select>
          </div>
        ) : null}
        {form.source === 'iso' && isoOptions.length > 0 ? (
          <div className="col-12 col-md-8">
            <label className="form-label" htmlFor="unattended-iso">
              {t('machine.unattendedInstallModal.cachedIsoLabel')}
            </label>
            <select
              id="unattended-iso"
              className="form-select"
              value={form.iso}
              onChange={event => patch({ iso: event.target.value })}
              disabled={held}
            >
              <option value="">{t('machine.unattendedInstallModal.selectOption')}</option>
              {isoOptions.map(filename => (
                <option key={filename} value={filename}>
                  {filename}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="col-12 col-md-8">
            <label className="form-label" htmlFor="unattended-path">
              {t('machine.unattendedInstallModal.isoPathLabel')}
            </label>
            <div className="d-flex gap-2 align-items-start">
              <div className="flex-grow-1">
                <PathInput
                  id="unattended-path"
                  value={form.path}
                  onChange={next => patch({ path: next })}
                  status={status}
                  hostId={id}
                  server={server}
                  mode="file"
                  pickTitle={t('machine.unattendedInstallModal.pickIsoTitle')}
                  disabled={held}
                />
              </div>
              <button
                type="button"
                className="btn btn-outline-secondary"
                data-action="probe"
                onClick={handleProbe}
                disabled={held || !form.path.trim()}
                title={t('machine.unattendedInstallModal.probeTooltip')}
              >
                {probing ? (
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                ) : (
                  <FaMagnifyingGlass className="me-2" aria-hidden="true" />
                )}
                {t('machine.unattendedInstallModal.probeButton')}
              </button>
            </div>
          </div>
        )}
        {probe ? <ProbeNote probe={probe} /> : null}
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="unattended-user">
            {t('machine.unattendedInstallModal.userLabel')}{' '}
            <span className="text-danger" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="unattended-user"
            className="form-control"
            type="text"
            required
            value={form.user}
            onChange={event => patch({ user: event.target.value })}
            disabled={held}
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="unattended-password">
            {t('machine.unattendedInstallModal.passwordLabel')}{' '}
            <span className="text-danger" aria-hidden="true">
              *
            </span>
          </label>
          <RevealInput
            id="unattended-password"
            required
            value={form.password}
            disabled={held}
            onChange={event => patch({ password: event.target.value })}
          />
        </div>
        <div className="col-12">
          <details>
            <summary className="fw-semibold">
              {t('machine.unattendedInstallModal.advancedSummary')}
            </summary>
            <div className="row g-3 mt-1">
              {ADVANCED.map(field => (
                <div className={field.col} key={field.key}>
                  <label className="form-label" htmlFor={`unattended-${field.key}`}>
                    {t(field.labelKey)}
                  </label>
                  <input
                    id={`unattended-${field.key}`}
                    className="form-control"
                    type={field.type || 'text'}
                    min={field.type === 'number' ? '0' : undefined}
                    list={
                      field.key === 'locale' && languages.length > 0
                        ? 'unattended-locale-options'
                        : undefined
                    }
                    placeholder={t(field.placeholderKey)}
                    value={form[field.key]}
                    onChange={event => patch({ [field.key]: event.target.value })}
                    disabled={held}
                  />
                </div>
              ))}
              {languages.length > 0 ? (
                <datalist id="unattended-locale-options">
                  {languages.map(language => (
                    <option key={language} value={language} />
                  ))}
                </datalist>
              ) : null}
            </div>
          </details>
        </div>
        {SWITCHES.map(field => (
          <div className="col-12 col-md-6" key={field.key}>
            <div className="form-check form-switch">
              <input
                id={`unattended-${field.key}`}
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={form[field.key]}
                onChange={event => patch({ [field.key]: event.target.checked })}
                disabled={held}
              />
              <label className="form-check-label" htmlFor={`unattended-${field.key}`}>
                {t(field.labelKey)}
              </label>
            </div>
          </div>
        ))}
      </div>
    </ToolFormDialog>
  );
};

UnattendedInstallModal.propTypes = {
  status: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
  server: PropTypes.object,
  name: PropTypes.string.isRequired,
  running: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default UnattendedInstallModal;
