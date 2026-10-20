import PropTypes from 'prop-types';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import RecordRows from '../../../components/common/RecordRows';
import SectionHeading from '../../../components/common/SectionHeading';
import { useStatus } from '../../../contexts/StatusContext';
import { saveHostname } from '../api/networking';
import { hostnameBody, hostnameProblem } from '../utils/networkingManagement';
import { canControlHosts } from '../utils/permissions';

const stateOf = ({ loaded, failed }) => {
  if (!loaded) {
    return 'loading';
  }
  return failed ? 'failed' : 'rows';
};

const infoRows = (info, t) => [
  {
    key: 'hostname',
    label: t('host.hostnameSettings.currentHostname'),
    value: <code>{info.hostname}</code>,
  },
  {
    key: 'nodename',
    label: t('host.hostnameSettings.nodenameFile'),
    value: <code>{info.nodename_file}</code>,
  },
  {
    key: 'system',
    label: t('host.hostnameSettings.systemHostname'),
    value: <code>{info.system_hostname}</code>,
  },
  {
    key: 'matches',
    label: t('host.hostnameSettings.configMatch'),
    value: (
      <span className={`badge ${info.matches ? 'text-bg-success' : 'text-bg-warning'}`}>
        {info.matches ? t('host.hostnameSettings.yes') : t('host.hostnameSettings.no')}
      </span>
    ),
  },
];

/**
 * The record of a host's hostname: its rows and the warning while the
 * configured and the system hostname differ.
 */
const HostnameInfo = ({ info }) => {
  const { t } = useTranslation();
  return (
    <>
      <h6 className="fw-bold">{t('host.hostnameSettings.currentInfo')}</h6>
      <RecordRows rows={infoRows(info, t)} />
      {info.matches ? null : (
        <div className="alert alert-warning" data-note="mismatch">
          <strong>{t('host.hostnameSettings.warning')}</strong>{' '}
          {t('host.hostnameSettings.mismatchWarning')}
        </div>
      )}
    </>
  );
};

HostnameInfo.propTypes = {
  info: PropTypes.object.isRequired,
};

/**
 * The hostname section of the Hostname page, a glass section whose
 * heading is the page's: `title`, `count` after it, and in its pane, for
 * a role that controls hosts, Change hostname, the form's submit, and
 * Reset, then the page's `actions`,
 * Refresh; under it, straight on the page's ground, the current hostname,
 * the nodename file, the system hostname and whether they match, the
 * warning when they do not, and, for a role that controls hosts, the
 * form's new hostname held to the RFC's shape and the apply immediately
 * box, its help by the box's state; every other role reads the record
 * rows alone. A change sends `PUT network/hostname` with `hostnameBody`
 * through the page's one `useNetworkingTools`, which reads the held
 * hostname again.
 */
const HostnameSettings = ({ id, role, reading, tools, title, count = null, actions = null }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const formId = useId();
  const [typed, setTyped] = useState(null);
  const [applyImmediately, setApplyImmediately] = useState(false);
  const writable = canControlHosts(role);
  const info = reading.data || null;
  const current = info?.hostname || '';
  const next = typed === null ? current : typed;
  const problem = hostnameProblem(next, current);
  const changed = next !== current;
  const invalid = Boolean(next) && problem === 'host.hostnameSettings.invalidHostname';

  const submit = async event => {
    event.preventDefault();
    if (problem) {
      return;
    }
    const { error } = await tools.send({
      id,
      call: () => saveHostname(status, id, hostnameBody(next, applyImmediately)),
      doneKey: applyImmediately
        ? 'hosts.networking.tools.hostnameApplied'
        : 'hosts.networking.tools.hostnameScheduled',
      values: { name: next.trim() },
      failKey: 'host.hostnameSettings.errors.changeError',
      keys: ['hostname'],
    });
    if (!error) {
      setTyped(null);
    }
  };

  const pane = (
    <>
      {writable ? (
        <>
          <button
            type="submit"
            form={formId}
            className="btn btn-sm btn-primary"
            disabled={!changed || Boolean(problem) || tools.busy}
            data-tool="change-hostname"
          >
            {t('host.hostnameSettings.changeHostname')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => setTyped(null)}
            disabled={!changed || tools.busy}
            data-tool="reset-hostname"
          >
            {t('host.hostnameSettings.reset')}
          </button>
        </>
      ) : null}
      {actions}
    </>
  );

  return (
    <div data-section="networking-hostname" data-state={stateOf(reading)} className="mb-3">
      <SectionHeading title={title} count={count} actions={pane} />
      <div>
        {reading.failed ? (
          <div className="alert alert-danger" role="alert">
            {t('hosts.overview.readError')}
          </div>
        ) : null}
        {info ? <HostnameInfo info={info} /> : null}
        {writable ? (
          <>
            <h6 className="fw-bold">{t('host.hostnameSettings.changeHostname')}</h6>
            <form id={formId} onSubmit={submit} data-form="hostname">
              <div className="mb-3">
                <label className="form-label" htmlFor="new-hostname-input">
                  {t('host.hostnameSettings.newHostname')}
                </label>
                <input
                  id="new-hostname-input"
                  className={`form-control${invalid ? ' is-invalid' : ''}`}
                  type="text"
                  placeholder={t('host.hostnameSettings.enterNewHostname')}
                  value={next}
                  onChange={event => setTyped(event.target.value)}
                  disabled={tools.busy}
                />
                {invalid ? (
                  <p className="form-text text-danger">
                    {t('host.hostnameSettings.invalidHostname')}
                  </p>
                ) : null}
              </div>
              <div className="mb-3">
                <div className="form-check">
                  <input
                    id="apply-immediately"
                    className="form-check-input"
                    type="checkbox"
                    checked={applyImmediately}
                    onChange={event => setApplyImmediately(event.target.checked)}
                    disabled={tools.busy}
                  />
                  <label className="form-check-label" htmlFor="apply-immediately">
                    {t('host.hostnameSettings.applyImmediately')}
                  </label>
                </div>
                <p className="form-text text-muted">
                  {applyImmediately
                    ? t('host.hostnameSettings.applyImmediatelyHelp')
                    : t('host.hostnameSettings.applyLaterHelp')}
                </p>
              </div>
            </form>
          </>
        ) : null}
      </div>
    </div>
  );
};

HostnameSettings.propTypes = {
  id: PropTypes.string.isRequired,
  role: PropTypes.string,
  reading: PropTypes.object.isRequired,
  tools: PropTypes.object.isRequired,
  title: PropTypes.string.isRequired,
  count: PropTypes.node,
  actions: PropTypes.node,
};

export default HostnameSettings;
