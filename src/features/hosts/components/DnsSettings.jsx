import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFloppyDisk } from 'react-icons/fa6';

import RecordRows from '../../../components/common/RecordRows';
import SectionHeading from '../../../components/common/SectionHeading';
import { useStatus } from '../../../contexts/StatusContext';
import { saveDns } from '../api/networking';
import { dnsBody, dnsFormOf } from '../utils/networkingManagement';
import { canControlHosts } from '../utils/permissions';

const stateOf = ({ loaded, failed }) => {
  if (!loaded) {
    return 'loading';
  }
  return failed ? 'failed' : 'rows';
};

const Lines = ({ id, labelKey, rows, placeholder, value, busy, onChange }) => {
  const { t } = useTranslation();
  return (
    <>
      <label className="form-label" htmlFor={id}>
        {t(labelKey)}
      </label>
      <textarea
        id={id}
        className="form-control font-monospace"
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={busy}
      />
    </>
  );
};

Lines.propTypes = {
  id: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
  rows: PropTypes.number.isRequired,
  placeholder: PropTypes.string,
  value: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

const listWord = value => (Array.isArray(value) ? value.join(', ') : '');

const recordRows = (answer, t) =>
  [
    ['nameservers', 'host.dnsSettings.nameservers', listWord(answer?.nameservers)],
    ['searchDomains', 'host.dnsSettings.searchDomains', listWord(answer?.search_domains)],
    ['domain', 'host.dnsSettings.domain', answer?.domain || ''],
    ['options', 'host.dnsSettings.options', listWord(answer?.options)],
  ]
    .filter(([, , value]) => value)
    .map(([key, labelKey, value]) => ({
      key,
      label: t(labelKey),
      value: <code>{value}</code>,
    }));

/**
 * The DNS section of the networking page's management, hyperweaver-ui's
 * `DnsSettings` as a folding section: for a role that controls hosts
 * the resolver's nameservers, search domains, domain and options as the
 * parsed fields, or the raw file behind the switch, the raw winning on
 * the wire, and Save, which sends `PUT system/dns` with `dnsBody`
 * through the page's one `useNetworkingTools`, the notice carrying the
 * backup the agent wrote, and the held answer is read again; every
 * other role reads the members the agent answered as record rows. The
 * form follows the held answer until a person types, and again after a
 * save.
 */
const DnsSettings = ({ id, role, reading, fold, tools }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [draft, setDraft] = useState(null);
  const writable = canControlHosts(role);
  const form = draft || dnsFormOf(reading.data);
  const change = (field, value) => setDraft({ ...form, [field]: value });

  const save = async () => {
    const { answer, error } = await tools.send({
      id,
      call: () => saveDns(status, id, dnsBody(form)),
      doneKey: 'hosts.networking.tools.dnsSaved',
      failKey: 'host.dnsSettings.errors.saveFailed',
      keys: ['dns'],
    });
    if (!error) {
      setDraft(null);
    }
    return answer;
  };

  const heading = t('host.dnsSettings.dnsResolver');

  const actions = (
    <>
      <div className="form-check form-switch mb-0">
        <input
          id="dns-raw-mode"
          className="form-check-input"
          type="checkbox"
          role="switch"
          checked={form.rawMode}
          onChange={event => change('rawMode', event.target.checked)}
          disabled={tools.busy}
        />
        <label className="form-check-label" htmlFor="dns-raw-mode">
          {t('host.dnsSettings.editRawFile')}
        </label>
      </div>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        onClick={save}
        disabled={!reading.loaded || tools.busy}
        data-tool="save-dns"
      >
        <FaFloppyDisk className="me-2" aria-hidden="true" />
        {t('host.dnsSettings.save')}
      </button>
    </>
  );

  return (
    <div
      data-section="networking-dns"
      data-state={stateOf(reading)}
      data-folded={fold.folded}
      className="mb-3"
    >
      <SectionHeading
        title={heading}
        folded={fold.folded}
        onFold={fold.onFold}
        foldTitle={fold.title}
        actions={writable ? actions : null}
      />
      {fold.folded ? null : (
        <div className="card">
          <div className="card-body">
            {reading.failed ? (
              <div className="alert alert-danger" role="alert">
                {t('hosts.overview.readError')}
              </div>
            ) : null}
            {writable ? null : <RecordRows className="mb-0" rows={recordRows(reading.data, t)} />}
            {writable ? (
              <p className="form-text text-muted mt-0">
                {t('host.dnsSettings.backupNote')}
                {form.rawMode
                  ? t('host.dnsSettings.rawModeNote')
                  : t('host.dnsSettings.parsedNote')}
              </p>
            ) : null}
            {writable && form.rawMode ? (
              <textarea
                id="dns-raw"
                className="form-control font-monospace"
                rows={10}
                value={form.raw}
                onChange={event => change('raw', event.target.value)}
                disabled={tools.busy}
                aria-label={t('host.dnsSettings.rawAriaLabel')}
              />
            ) : null}
            {writable && !form.rawMode ? (
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <Lines
                    id="dns-nameservers"
                    labelKey="host.dnsSettings.nameservers"
                    rows={4}
                    placeholder={'e.g.\n8.8.8.8\n1.1.1.1'}
                    value={form.nameservers}
                    busy={tools.busy}
                    onChange={value => change('nameservers', value)}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <Lines
                    id="dns-search-domains"
                    labelKey="host.dnsSettings.searchDomains"
                    rows={4}
                    value={form.searchDomains}
                    busy={tools.busy}
                    onChange={value => change('searchDomains', value)}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label" htmlFor="dns-domain">
                    {t('host.dnsSettings.domain')}
                  </label>
                  <input
                    id="dns-domain"
                    className="form-control font-monospace"
                    type="text"
                    value={form.domain}
                    onChange={event => change('domain', event.target.value)}
                    disabled={tools.busy}
                  />
                  <div className="mt-3">
                    <Lines
                      id="dns-options"
                      labelKey="host.dnsSettings.options"
                      rows={2}
                      placeholder="e.g. ndots:2"
                      value={form.options}
                      busy={tools.busy}
                      onChange={value => change('options', value)}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

DnsSettings.propTypes = {
  id: PropTypes.string.isRequired,
  role: PropTypes.string,
  reading: PropTypes.object.isRequired,
  fold: PropTypes.object.isRequired,
  tools: PropTypes.object.isRequired,
};

export default DnsSettings;
