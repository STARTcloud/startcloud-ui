import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { hasAny } from '../../../../components/common/SubTable';
import TabStrip from '../../../../components/common/TabStrip';
import { useStatus } from '../../../../contexts/StatusContext';
import { pageContextShape } from '../../../../utils/itemShape';
import { fetchIsoArtifacts, fetchMedia } from '../../api/artifacts';
import { useManageRead } from '../../hooks/useHostManage';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { hostHasFeature } from '../../utils/capabilities';
import ManageTable from '../ManageTable';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

const SOURCE_KEYS = { template: 'hosts.media.sourceTemplate', blank: 'hosts.media.sourceBlank' };

const lower = value => String(value ?? '').toLowerCase();

const usersOf = row => (Array.isArray(row.in_use_by) ? row.in_use_by : []);

const sourceOf = (row, ctx) =>
  SOURCE_KEYS[row.source_stamp] ? ctx.t(SOURCE_KEYS[row.source_stamp]) : '';

/**
 * The columns of the disk images table: the path, the format, the size,
 * the source the agent stamped and the machines holding the image.
 */
export const DISK_COLUMNS = [
  {
    key: 'path',
    kind: 'name',
    labelKey: 'hosts.media.path',
    value: row => row.path || '',
    render: row => <code className="small">{row.path}</code>,
  },
  {
    key: 'format',
    kind: 'badge',
    labelKey: 'hosts.media.format',
    value: row => row.format || '',
    render: row =>
      row.format ? <span className="badge text-bg-secondary">{row.format}</span> : '',
  },
  {
    key: 'size',
    kind: 'size',
    labelKey: 'hosts.media.size',
    value: row => (typeof row.size_bytes === 'number' ? row.size_bytes : 0),
    render: (row, ctx) =>
      typeof row.size_bytes === 'number' ? ctx.formatFileSize(row.size_bytes) : '',
  },
  {
    key: 'source',
    kind: 'word',
    labelKey: 'hosts.media.source',
    value: row => row.source_stamp || '',
    render: sourceOf,
    when: hasAny(row => row.source_stamp),
  },
  {
    key: 'inUse',
    kind: 'badges',
    labelKey: 'hosts.media.inUseBy',
    value: row => usersOf(row).join(', '),
    render: row => (
      <span className="d-inline-flex flex-wrap gap-1">
        {usersOf(row).map(name => (
          <span key={name} className="badge text-bg-info">
            {name}
          </span>
        ))}
      </span>
    ),
    when: hasAny(row => usersOf(row).length > 0),
  },
];

/**
 * The columns of the ISOs table: the file name, the size and the storage
 * location holding it.
 */
export const ISO_COLUMNS = [
  {
    key: 'filename',
    kind: 'name',
    labelKey: 'hosts.media.filename',
    value: row => row.filename || '',
    render: row => <strong>{row.filename}</strong>,
  },
  {
    key: 'size',
    kind: 'size',
    labelKey: 'hosts.media.size',
    value: row => (typeof row.size === 'number' ? row.size : 0),
    render: (row, ctx) => (typeof row.size === 'number' ? ctx.formatFileSize(row.size) : ''),
  },
  {
    key: 'location',
    kind: 'text',
    labelKey: 'hosts.media.location',
    value: row => row.storage_location?.name || '',
    when: hasAny(row => row.storage_location?.name),
  },
];

const matchesDisk = (row, needle) =>
  [row.path, row.format, row.source_stamp, ...usersOf(row)].some(text =>
    lower(text).includes(needle)
  );

const matchesIso = (row, needle) =>
  [row.filename, row.storage_location?.name].some(text => lower(text).includes(needle));

/**
 * The Media page of a host, the agent's Virtual Media Manager under the
 * Storage group: a Disks tab over `GET media`, every hard-disk image
 * VirtualBox registers with the machines holding it and the source the
 * agent stamped, and an ISOs tab over `GET artifacts/iso` while the host
 * lists `artifacts`; the heading counts the rows of the tab shown the
 * search leaves, Refresh in its pane; each read once as the page draws,
 * again when the stream opens fresh or answers `reset`, and on Refresh.
 */
const MediaPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const [tab, setTab] = useState('disks');
  const isos = hostHasFeature(server, 'artifacts');
  const disks = useManageRead(
    useCallback(() => fetchMedia(status, id), [status, id]),
    true
  );
  const isoRead = useManageRead(
    useCallback(() => fetchIsoArtifacts(status, id), [status, id]),
    isos
  );
  const ctx = { ...context, t, language: i18n.language, id, server };
  const search = useHostManageSearch({
    section,
    tables: {
      disks: tableOf({
        key: 'disks',
        labelKey: 'hosts.media.disks',
        rows: Array.isArray(disks.data?.media) ? disks.data.media : [],
        columns: DISK_COLUMNS,
        matches: matchesDisk,
        sort: 'path',
        offered: true,
      }),
      isos: tableOf({
        key: 'isos',
        labelKey: 'hosts.media.isos',
        rows: Array.isArray(isoRead.data?.artifacts) ? isoRead.data.artifacts : [],
        columns: ISO_COLUMNS,
        matches: matchesIso,
        sort: 'filename',
        offered: isos,
      }),
    },
    ctx,
    prefsPrefix: context.prefsPrefix,
    placeholderKey: 'hosts.media.search',
  });
  const shown = isos && tab === 'isos' ? 'isos' : 'disks';
  const reading = shown === 'isos' ? isoRead : disks;
  const tabs = [
    { key: 'disks', label: t('hosts.media.disks') },
    ...(isos ? [{ key: 'isos', label: t('hosts.media.isos') }] : []),
  ];

  return (
    <SectionPane
      section={section}
      server={server}
      count={reading.loaded ? search.tables[shown].rows.length : null}
      actions={<RefreshButton onRefresh={onRefresh} />}
    >
      <TabStrip tabs={tabs} active={shown} onSelect={setTab} className="mb-3" />
      {reading.failed ? (
        <div className="alert alert-danger" role="alert" data-note="media-failed">
          {reading.message}
        </div>
      ) : null}
      {shown === 'disks' ? (
        <div data-panel="media-disks">
          <ManageTable
            name="disks"
            columns={DISK_COLUMNS}
            table={search.tables.disks}
            rowKey={row => row.path}
            ctx={ctx}
            emptyKey="hosts.media.noDisks"
            reading={disks}
            filtering={search.filtering}
          />
        </div>
      ) : (
        <div data-panel="media-isos">
          <ManageTable
            name="isos"
            columns={ISO_COLUMNS}
            table={search.tables.isos}
            rowKey={row => row.id || row.path || row.filename}
            ctx={ctx}
            emptyKey="hosts.media.noIsos"
            reading={isoRead}
            filtering={search.filtering}
          />
        </div>
      )}
    </SectionPane>
  );
};

MediaPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default MediaPage;
