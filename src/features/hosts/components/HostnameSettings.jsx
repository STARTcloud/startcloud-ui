import PropTypes from 'prop-types';
import { useState } from 'react';
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
 * The hostname section of the networking page's management,
 * hyperweaver-ui's `HostnameSettings` as a folding section: the current
 * hostname, the nodename file, the system hostname and whether they
 * match, hyperweaver-ui's warning when they do not, and, for a role
 * that controls hosts, the form that changes it, the new hostname held
 * to the RFC's shape and the apply immediately box, its help by the
 * box's state; every other role reads the record rows alone. A change
 * sends `PUT network/hostname` with `hostnameBody` through the page's
 * one `useNetworkingTools`, which reads the held hostname again.
 */
const HostnameSettings = ({ id, role, reading, fold, tools }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [typed, setTyped] = useState(null);
  const [applyImmediately, setApplyImmediately] = useState(false);
  const writable = canControlHosts(role);
  const info = reading.data || null;
  const current = info?.hostname || '';
  const next = typed === null ? current : typed;
  const problem = hostnameProblem(next, current);
  const changed = next !== current;

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

  const heading = t('host.hostnameSettings.title');

  return (
    <div
      data-section="networking-hostname"
      data-state={stateOf(reading)}
      data-folded={fold.folded}
      className="mb-3"
    >
      <SectionHeading
        title={heading}
        folded={fold.folded}
        onFold={fold.onFold}
        foldTitle={fold.title}
      />
      {fold.folded ? null : (
        <div className="card">
          <div className="card-body">
            {reading.failed ? (
              <div className="alert alert-danger" role="alert">
                {t('hosts.overview.readError')}
              </div>
            ) : null}
            {info ? (
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
            ) : null}
            {writable ? (
              <>
                <h6 className="fw-bold">{t('host.hostnameSettings.changeHostname')}</h6>
                <form onSubmit={submit} data-form="hostname">
                  <div className="mb-3">
                    <label className="form-label" htmlFor="new-hostname-input">
                      {t('host.hostnameSettings.newHostname')}
                    </label>
                    <input
                      id="new-hostname-input"
                      className={`form-control${
                        next && problem === 'host.hostnameSettings.invalidHostname'
                          ? ' is-invalid'
                          : ''
                      }`}
                      type="text"
                      placeholder={t('host.hostnameSettings.enterNewHostname')}
                      value={next}
                      onChange={event => setTyped(event.target.value)}
                      disabled={tools.busy}
                    />
                    {next && problem === 'host.hostnameSettings.invalidHostname' ? (
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
                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={!changed || Boolean(problem) || tools.busy}
                      data-tool="change-hostname"
                    >
                      {t('host.hostnameSettings.changeHostname')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setTyped(null)}
                      disabled={!changed || tools.busy}
                      data-tool="reset-hostname"
                    >
                      {t('host.hostnameSettings.reset')}
                    </button>
                  </div>
                </form>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

HostnameSettings.propTypes = {
  id: PropTypes.string.isRequired,
  role: PropTypes.string,
  reading: PropTypes.object.isRequired,
  fold: PropTypes.object.isRequired,
  tools: PropTypes.object.isRequired,
};

export default HostnameSettings;
