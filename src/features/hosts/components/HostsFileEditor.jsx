import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFloppyDisk, FaPlus, FaXmark } from 'react-icons/fa6';

import SectionHeading from '../../../components/common/SectionHeading';
import SubTable from '../../../components/common/SubTable';
import { useStatus } from '../../../contexts/StatusContext';
import { saveHostsFile } from '../api/networking';
import { hostsBody, hostsRowsFrom } from '../utils/networkingManagement';

const NO_SORT = [];

const NO_HIDDEN = new Set();

const stateOf = ({ loaded, failed }) => {
  if (!loaded) {
    return 'loading';
  }
  return failed ? 'failed' : 'rows';
};

const EntryInput = ({ row, ctx, member, labelKey }) => (
  <input
    className="form-control form-control-sm font-monospace"
    type="text"
    value={row[member]}
    onChange={event => ctx.setRow(row.key, member, event.target.value)}
    disabled={ctx.busy}
    aria-label={ctx.t(labelKey, { number: ctx.numberOf(row.key) })}
  />
);

EntryInput.propTypes = {
  row: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
  member: PropTypes.string.isRequired,
  labelKey: PropTypes.string.isRequired,
};

const ENTRY_COLUMNS = [
  {
    key: 'ip',
    kind: 'text',
    labelKey: 'host.hostsFileEditor.ipAddress',
    value: row => row.ip,
    render: (row, ctx) => (
      <EntryInput
        row={row}
        ctx={ctx}
        member="ip"
        labelKey="host.hostsFileEditor.entryIpAriaLabel"
      />
    ),
  },
  {
    key: 'hostnames',
    kind: 'text',
    labelKey: 'host.hostsFileEditor.hostnames',
    prose: true,
    value: row => row.hostnames,
    render: (row, ctx) => (
      <EntryInput
        row={row}
        ctx={ctx}
        member="hostnames"
        labelKey="host.hostsFileEditor.entryHostnamesAriaLabel"
      />
    ),
  },
];

const EntryActions = ({ row, busy, onRemove }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-danger"
      onClick={() => onRemove(row.key)}
      disabled={busy}
      title={t('host.hostsFileEditor.removeEntry')}
      data-tool="remove-entry"
    >
      <FaXmark aria-hidden="true" />
    </button>
  );
};

EntryActions.propTypes = {
  row: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onRemove: PropTypes.func.isRequired,
};

const draftOf = data => ({
  rawMode: false,
  raw: data?.raw || '',
  rows: hostsRowsFrom(data?.entries),
  added: 0,
});

/**
 * The hosts file section of the networking page's management,
 * hyperweaver-ui's `HostsFileEditor` as a folding section: the file's
 * entries as rows of the one `SubTable`, each an address and its
 * hostnames typed in place with a remove, and Add entry under them, or
 * the raw file behind the switch, the raw winning on the wire; Save
 * sends `PUT system/hosts` with `hostsBody` through the page's one
 * `useNetworkingTools`, the notice carrying the backup the agent wrote,
 * and the held answer is read again. The rows follow the held answer
 * until a person types, and again after a save.
 */
const HostsFileEditor = ({ id, reading, ctx, fold, tools }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [draft, setDraft] = useState(null);
  const form = draft || draftOf(reading.data);
  const change = (field, value) => setDraft({ ...form, [field]: value });
  const path = reading.data?.path || '';

  const setRow = (key, member, value) =>
    change(
      'rows',
      form.rows.map(row => (row.key === key ? { ...row, [member]: value } : row))
    );

  const addRow = () =>
    setDraft({
      ...form,
      added: form.added + 1,
      rows: [...form.rows, { key: `new-${form.added + 1}`, ip: '', hostnames: '' }],
    });

  const save = async () => {
    const { error } = await tools.send({
      id,
      call: () => saveHostsFile(status, id, hostsBody(form)),
      doneKey: 'hosts.networking.tools.hostsSaved',
      failKey: 'host.hostsFileEditor.errors.saveFailed',
      keys: ['hosts-file'],
    });
    if (!error) {
      setDraft(null);
    }
  };

  const tableCtx = {
    ...ctx,
    busy: tools.busy,
    setRow,
    numberOf: key => form.rows.findIndex(row => row.key === key) + 1,
  };

  const heading = t('host.hostsFileEditor.hostsFile');

  const actions = (
    <>
      <div className="form-check form-switch mb-0">
        <input
          id="hosts-raw-mode"
          className="form-check-input"
          type="checkbox"
          role="switch"
          checked={form.rawMode}
          onChange={event => change('rawMode', event.target.checked)}
          disabled={tools.busy}
        />
        <label className="form-check-label" htmlFor="hosts-raw-mode">
          {t('host.hostsFileEditor.editRawFile')}
        </label>
      </div>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        onClick={save}
        disabled={!reading.loaded || tools.busy}
        data-tool="save-hosts"
      >
        <FaFloppyDisk className="me-2" aria-hidden="true" />
        {t('host.hostsFileEditor.save')}
      </button>
    </>
  );

  return (
    <div
      data-section="networking-hosts-file"
      data-state={stateOf(reading)}
      data-folded={fold.folded}
      className="mb-3"
    >
      <SectionHeading
        title={heading}
        count={path ? <code>{path}</code> : null}
        folded={fold.folded}
        onFold={fold.onFold}
        foldTitle={fold.title}
        actions={actions}
      />
      {fold.folded ? null : (
        <div className="card">
          <div className="card-body">
            {reading.failed ? (
              <div className="alert alert-danger" role="alert">
                {t('hosts.overview.readError')}
              </div>
            ) : null}
            <p className="form-text text-muted mt-0">
              {t('host.hostsFileEditor.backupNote')}
              {form.rawMode
                ? t('host.hostsFileEditor.rawModeNote')
                : t('host.hostsFileEditor.tableModeNote')}
            </p>
            {form.rawMode ? (
              <textarea
                id="hosts-raw"
                className="form-control font-monospace"
                rows={12}
                value={form.raw}
                onChange={event => change('raw', event.target.value)}
                disabled={tools.busy}
                aria-label={t('host.hostsFileEditor.rawAriaLabel')}
              />
            ) : (
              <>
                <SubTable
                  columns={ENTRY_COLUMNS}
                  rows={form.rows}
                  rowKey={row => row.key}
                  RowActions={EntryActions}
                  actionsProps={{
                    busy: tools.busy,
                    onRemove: key =>
                      change(
                        'rows',
                        form.rows.filter(row => row.key !== key)
                      ),
                  }}
                  sort={NO_SORT}
                  onSort={() => {}}
                  hiddenColumns={NO_HIDDEN}
                  ctx={tableCtx}
                  emptyText={t('hosts.networking.hostsFile.empty')}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary mt-2"
                  onClick={addRow}
                  disabled={tools.busy}
                  data-tool="add-entry"
                >
                  <FaPlus className="me-2" aria-hidden="true" />
                  {t('host.hostsFileEditor.addEntry')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

HostsFileEditor.propTypes = {
  id: PropTypes.string.isRequired,
  reading: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
  fold: PropTypes.object.isRequired,
  tools: PropTypes.object.isRequired,
};

export default HostsFileEditor;
