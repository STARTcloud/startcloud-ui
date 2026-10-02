import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaClock, FaRotateLeft } from 'react-icons/fa6';

import RecordRows from '../../../components/common/RecordRows';
import { useStatus } from '../../../contexts/StatusContext';
import { fetchTimezone, fetchTimezones, setTimezone } from '../api/manage';
import { useManageRead, useManageSend } from '../hooks/useHostManage';
import {
  filterTimezones,
  formatTimezone,
  timezoneDescriptionKey,
  timezoneRegions,
} from '../utils/manage';

import NTPConfirmActionModal from './NTPConfirmActionModal';

const NO_ZONES = [];

const describe = (zone, t, fallbackKey) => {
  const key = timezoneDescriptionKey(zone);
  return key ? t(key) : t(fallbackKey);
};

const CurrentTimezone = ({ info }) => {
  const { t } = useTranslation();
  return (
    <div data-panel="timezone-current">
      <h6 className="fw-bold">{t('host.timezoneSettings.currentHeading')}</h6>
      <RecordRows
        rows={[
          {
            key: 'timezone',
            label: t('host.timezoneSettings.currentTimezone'),
            value: <code>{info.timezone}</code>,
          },
          {
            key: 'display',
            label: t('host.timezoneSettings.displayName'),
            value: formatTimezone(info.timezone),
          },
          {
            key: 'description',
            label: t('host.timezoneSettings.description'),
            value: describe(info.timezone, t, 'host.timezoneSettings.systemSetting'),
          },
          ...(info.local_time
            ? [
                {
                  key: 'local',
                  label: t('host.timezoneSettings.localTime'),
                  value: new Date(info.local_time).toLocaleString(),
                },
              ]
            : []),
          ...(info.utc_offset
            ? [
                {
                  key: 'offset',
                  label: t('host.timezoneSettings.utcOffset'),
                  value: <code>{info.utc_offset}</code>,
                },
              ]
            : []),
        ]}
      />
    </div>
  );
};

CurrentTimezone.propTypes = {
  info: PropTypes.shape({
    timezone: PropTypes.string,
    local_time: PropTypes.string,
    utc_offset: PropTypes.string,
  }).isRequired,
};

/**
 * The time zone of a host, hyperweaver-ui's time zone tab of the Manage
 * page's Time and NTP section: the current zone of
 * `GET system/timezone`, the search and the region that narrow the
 * zones `GET system/timezones` answered, the zone chosen among them,
 * a typed zone where the host answered none, the note of the choice,
 * and Change time zone, held until the choice differs, behind the
 * typed confirmation, which sends `PUT system/timezone` and reads the
 * zone again on a success, with Reset beside it and hyperweaver-ui's
 * reboot note. Nothing polls.
 */
const TimezoneSettings = ({ id, hostname }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { send, busy } = useManageSend(id);
  const current = useManageRead(
    useCallback(() => fetchTimezone(status, id), [status, id]),
    true
  );
  const zones = useManageRead(
    useCallback(() => fetchTimezones(status, id), [status, id]),
    true
  );
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [seen, setSeen] = useState('');
  const info = current.data;
  const currentZone = info?.timezone || '';
  const available = Array.isArray(zones.data) ? zones.data : NO_ZONES;
  const filtered = filterTimezones(available, region, search);
  const regions = timezoneRegions(available);
  const hasChanges = selected !== '' && selected !== currentZone;

  if (currentZone !== seen) {
    setSeen(currentZone);
    setSelected(currentZone);
  }

  const confirm = async () => {
    const { error } = await send({
      call: () => setTimezone(status, id, selected),
      doneKey: 'hosts.manage.time.timezoneSet',
      values: { timezone: selected },
      failKey: 'hosts.manage.time.failed',
    });
    setConfirming(false);
    if (!error) {
      current.refresh();
    }
  };

  return (
    <div data-tab="time-timezone">
      <p className="text-muted">{t('host.timezoneSettings.intro', { hostname })}</p>
      {current.loaded ? null : <p>{t('host.timezoneSettings.loadingTimezoneInfo')}</p>}
      {current.failed ? (
        <div className="alert alert-danger" role="alert">
          {t('hosts.overview.readError')}
        </div>
      ) : null}
      {info ? <CurrentTimezone info={info} /> : null}
      <h6 className="fw-bold">{t('host.timezoneSettings.changeHeading')}</h6>
      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <label className="form-label" htmlFor="timezone-search">
            {t('host.timezoneSettings.searchLabel')}
          </label>
          <input
            id="timezone-search"
            className="form-control"
            type="text"
            placeholder={t('host.timezoneSettings.searchPlaceholder')}
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="timezone-region">
            {t('host.timezoneSettings.regionLabel')}
          </label>
          <select
            id="timezone-region"
            className="form-select"
            value={region}
            onChange={event => setRegion(event.target.value)}
          >
            <option value="">{t('host.timezoneSettings.allRegions')}</option>
            {regions.map(name => (
              <option key={name} value={name}>
                {name} ({describe(`${name}/`, t, 'host.timezoneSettings.systemSetting')})
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="timezone-select">
          {t('host.timezoneSettings.selectLabel')}
          {filtered.length > 0 ? (
            <span className="small text-muted ms-2">
              {t('host.timezoneSettings.available', { count: filtered.length })}
            </span>
          ) : null}
        </label>
        <select
          id="timezone-select"
          className="form-select"
          value={selected}
          onChange={event => setSelected(event.target.value)}
          disabled={busy || filtered.length === 0}
        >
          <option value="">{t('host.timezoneSettings.choose')}</option>
          {filtered.map(zone => (
            <option key={zone} value={zone}>
              {zone}
              {zone === currentZone ? ` ${t('host.timezoneSettings.current')}` : ''}
            </option>
          ))}
        </select>
        {available.length === 0 && zones.loaded ? (
          <p className="form-text text-muted">{t('host.timezoneSettings.unableToLoad')}</p>
        ) : null}
      </div>
      {available.length === 0 && zones.loaded ? (
        <div className="mb-3">
          <label className="form-label" htmlFor="timezone-manual">
            {t('host.timezoneSettings.manualLabel')}
          </label>
          <input
            id="timezone-manual"
            className="form-control font-monospace"
            type="text"
            placeholder={t('host.timezoneSettings.manualPlaceholder')}
            value={selected}
            onChange={event => setSelected(event.target.value)}
            disabled={busy}
          />
          <p className="form-text text-muted">{t('host.timezoneSettings.manualHelp')}</p>
        </div>
      ) : null}
      {hasChanges ? (
        <div className="alert alert-info" role="status" data-note="timezone-selected">
          <strong>{t('host.timezoneSettings.selected')}:</strong> {formatTimezone(selected)}
          <br />
          <strong>{t('host.timezoneSettings.description')}:</strong>{' '}
          {describe(selected, t, 'host.timezoneSettings.timezoneSetting')}
        </div>
      ) : null}
      <h6 className="fw-bold">{t('host.timezoneSettings.actionsHeading')}</h6>
      <div className="d-flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          data-action="timezone-change"
          onClick={() => setConfirming(true)}
          disabled={!hasChanges || busy}
        >
          <FaClock className="me-1" aria-hidden="true" />
          {t('host.timezoneSettings.change')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          data-action="timezone-reset"
          onClick={() => setSelected(currentZone)}
          disabled={!hasChanges || busy}
        >
          <FaRotateLeft className="me-1" aria-hidden="true" />
          {t('host.timezoneSettings.reset')}
        </button>
      </div>
      <div className="alert alert-warning mt-3 mb-0" role="note">
        <strong>{t('host.timezoneSettings.importantLabel')}</strong>{' '}
        {t('host.timezoneSettings.rebootNote')}
      </div>
      {confirming ? (
        <NTPConfirmActionModal
          service={{ timezone: selected, current: currentZone }}
          action="timezone"
          onClose={() => setConfirming(false)}
          onConfirm={confirm}
        />
      ) : null}
    </div>
  );
};

TimezoneSettings.propTypes = {
  id: PropTypes.string.isRequired,
  hostname: PropTypes.string.isRequired,
};

export default TimezoneSettings;
