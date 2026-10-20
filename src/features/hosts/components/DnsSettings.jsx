import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCode, FaFloppyDisk, FaTableList } from 'react-icons/fa6';

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
 * The DNS section of the DNS page, a glass section whose heading is the
 * page's: `title`, and in its pane, for a role that controls hosts, the
 * raw-mode button, which reads Edit raw file while the fields are drawn
 * and Edit fields while the raw file is, and Save, then the page's
 * `actions`, Refresh; under it, straight on the page's ground, for a role
 * that controls hosts the resolver's nameservers, search domains, domain
 * and options as the parsed fields, or the raw file filling the height
 * the page region leaves it, the raw winning on the wire, Save sending `PUT system/dns` with `dnsBody` through the
 * page's one `useNetworkingTools`, the notice carrying the backup the
 * agent wrote, and the held answer read again; every other role reads the
 * members the agent answered as record rows. The form follows the held
 * answer until a person types, and again after a save.
 */
const DnsSettings = ({ id, role, reading, tools, title, actions = null }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [draft, setDraft] = useState(null);
  const writable = canControlHosts(role);
  const form = draft || dnsFormOf(reading.data);
  const change = (field, value) => setDraft({ ...form, [field]: value });
  const raw = writable && form.rawMode;
  const ModeGlyph = form.rawMode ? FaTableList : FaCode;

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

  const writes = (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() => change('rawMode', !form.rawMode)}
        disabled={tools.busy}
        data-tool="raw-mode"
      >
        <ModeGlyph className="me-2" aria-hidden="true" />
        {t(form.rawMode ? 'host.dnsSettings.editFields' : 'host.dnsSettings.editRawFile')}
      </button>
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

  const pane = (
    <>
      {writable ? writes : null}
      {actions}
    </>
  );

  return (
    <div data-section="networking-dns" data-state={stateOf(reading)} className="mb-3">
      <SectionHeading title={title} actions={pane} />
      <div className={raw ? 'd-flex flex-column flex-grow-1 page-fill' : undefined}>
        {reading.failed ? (
          <div className="alert alert-danger" role="alert">
            {t('hosts.overview.readError')}
          </div>
        ) : null}
        {writable ? null : <RecordRows className="mb-0" rows={recordRows(reading.data, t)} />}
        {writable ? (
          <p className="form-text text-muted mt-0">
            {t('host.dnsSettings.backupNote')}
            {form.rawMode ? t('host.dnsSettings.rawModeNote') : t('host.dnsSettings.parsedNote')}
          </p>
        ) : null}
        {raw ? (
          <textarea
            id="dns-raw"
            className="form-control font-monospace flex-grow-1 raw-fill"
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
  );
};

DnsSettings.propTypes = {
  id: PropTypes.string.isRequired,
  role: PropTypes.string,
  reading: PropTypes.object.isRequired,
  tools: PropTypes.object.isRequired,
  title: PropTypes.string.isRequired,
  actions: PropTypes.node,
};

export default DnsSettings;
