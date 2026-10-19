import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaCertificate,
  FaDownload,
  FaFileSignature,
  FaKey,
  FaLayerGroup,
  FaPlus,
  FaShieldHalved,
  FaTerminal,
  FaUserSecret,
  FaWandMagicSparkles,
} from 'react-icons/fa6';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

import ConfirmModal from '../../../components/common/ConfirmModal';
import RowMenu from '../../../components/common/RowMenu';
import SectionHeading from '../../../components/common/SectionHeading';
import StatCard from '../../../components/common/StatCard';
import SubTable from '../../../components/common/SubTable';
import UploadZone from '../../../components/common/UploadZone';
import { StatusMenu, VisibilityMenu, pickedOf } from '../../../components/common/VisibilityPicker';
import { useNotify } from '../../../contexts/NoticeContext';
import { useArrival } from '../../../hooks/useArrival';
import { useSelection } from '../../../hooks/useSelection';
import { pageContextShape } from '../../../utils/itemShape';
import { canManageRecord } from '../../../utils/permissions';
import { ROW_BULK, STATUS_VERBS, VISIBILITY_VERBS } from '../../collections/bulkActions';
import { useRecordActions } from '../hooks/useRecordActions';
import { useStoreWrites } from '../hooks/useStoreWrites';
import { useVault } from '../hooks/useVault';
import { useVaultSearch } from '../hooks/useVaultSearch';
import { SECRETS_ROUTE } from '../sidebar';
import { focusOn } from '../utils/focus';
import { DER_KINDS, SECRET_KINDS, isSecretKind, nameOf, nowOf } from '../utils/records';
import { patchOfVerbs } from '../utils/sync';

import SecretRecordModal from './SecretRecordModal';
import { vaultColumns } from './vaultColumns';
import VaultTreeDialogs from './VaultTreeDialogs';

const KIND_ICONS = {
  certificate: FaCertificate,
  authority: FaShieldHalved,
  request: FaFileSignature,
  key: FaKey,
  ssh_certificate: FaTerminal,
  template: FaLayerGroup,
};

const TILE_KINDS = [...DER_KINDS, 'template'];

const secretKindOf = params => {
  const [first = ''] = String(params.get('kind') || '').split(',');
  return isSecretKind(first) ? first : '';
};

const HEADING_ID = 'certs-vault-heading';

const recordKey = record => record.id;

const managesSynced = (record, user) =>
  Boolean(record.remote_id) && canManageRecord(user, record.organization, record);

const VaultRowActions = ({ record, user, onConvert, onDownload, onEdit, onDelete, onRemove }) => {
  const { t } = useTranslation();
  return (
    <RowMenu label={t('pages.table.actions')}>
      {isSecretKind(record.kind) ? (
        <Dropdown.Item as="button" type="button" data-action="edit" onClick={() => onEdit(record)}>
          {t('certs.actions.edit')}
        </Dropdown.Item>
      ) : (
        <>
          <Dropdown.Item
            as="button"
            type="button"
            data-action="convert"
            onClick={() => onConvert(record)}
          >
            {t('certs.actions.convert')}
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            type="button"
            data-action="download"
            onClick={() => onDownload(record)}
          >
            {t('certs.actions.download')}
          </Dropdown.Item>
        </>
      )}
      <Dropdown.Divider />
      <Dropdown.Item
        as="button"
        type="button"
        className="text-danger"
        data-action="delete"
        onClick={() => onDelete(record)}
      >
        {t('certs.actions.delete')}
      </Dropdown.Item>
      {managesSynced(record, user) ? (
        <Dropdown.Item
          as="button"
          type="button"
          className="text-danger"
          data-action="remove-from"
          onClick={() => onRemove(record)}
        >
          {t('certs.actions.removeFrom', { organization: record.organization })}
        </Dropdown.Item>
      ) : null}
    </RowMenu>
  );
};

VaultRowActions.propTypes = {
  record: PropTypes.object.isRequired,
  user: PropTypes.object,
  onConvert: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

const KindTiles = ({ records }) => {
  const { t } = useTranslation();
  return (
    <div className="stat-grid stat-grid-3 mb-3" data-panel="vault-tiles">
      {TILE_KINDS.map(kind => {
        const Icon = KIND_ICONS[kind];
        return (
          <StatCard
            key={kind}
            icon={<Icon aria-hidden="true" />}
            count={records.filter(record => record.kind === kind).length}
            label={t(`certs.kind.${kind}`)}
            to={`/certs?kind=${kind}`}
          />
        );
      })}
      <StatCard
        icon={<FaUserSecret aria-hidden="true" />}
        count={records.filter(record => SECRET_KINDS.includes(record.kind)).length}
        label={t('certs.sidebar.secrets')}
        to={SECRETS_ROUTE}
      />
    </div>
  );
};

KindTiles.propTypes = {
  records: PropTypes.array.isRequired,
};

const Picker = ({ action, count, onAccess }) => {
  const className = `btn btn-sm ${action.variant}`;
  if (action.picker === 'visibility') {
    return (
      <VisibilityMenu
        count={count}
        className={className}
        onPick={body => onAccess(patchOfVerbs(VISIBILITY_VERBS[pickedOf(body)]))}
      />
    );
  }
  return (
    <StatusMenu
      count={count}
      className={className}
      onPick={body =>
        onAccess(patchOfVerbs(STATUS_VERBS[body.published ? 'publish' : 'unpublish']))
      }
    />
  );
};

Picker.propTypes = {
  action: PropTypes.shape({
    picker: PropTypes.string.isRequired,
    variant: PropTypes.string.isRequired,
  }).isRequired,
  count: PropTypes.number.isRequired,
  onAccess: PropTypes.func.isRequired,
};

const PickedActions = ({ selection, managed, onAccess, onDelete, onExport }) => {
  const { t } = useTranslation();
  if (!selection.someSelected) {
    return null;
  }
  return (
    <>
      <strong>{t('pages.bulk.selected', { count: selection.selected.size })}</strong>
      <button type="button" className="btn btn-sm btn-link" onClick={selection.clear}>
        {t('pages.bulk.clearSelection')}
      </button>
      {ROW_BULK.map(action => {
        if (action.picker) {
          return managed > 0 ? (
            <Picker key={action.key} action={action} count={managed} onAccess={onAccess} />
          ) : null;
        }
        return (
          <button
            key={action.key}
            type="button"
            className={`btn btn-sm ${action.variant}`}
            data-action={action.key}
            onClick={onDelete}
          >
            {t(action.labelKey)}
          </button>
        );
      })}
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        data-action="export-bundle"
        onClick={onExport}
      >
        <FaDownload className="me-1" aria-hidden="true" />
        {t('certs.toolbar.exportBundle')}
      </button>
    </>
  );
};

PickedActions.propTypes = {
  selection: PropTypes.object.isRequired,
  managed: PropTypes.number.isRequired,
  onAccess: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
};

const useBundleImport = () => {
  const { t } = useTranslation();
  const notify = useNotify();
  const vault = useVault();
  const [error, setError] = useState('');

  const importBundle = file =>
    file
      .text()
      .then(text => vault.importBundle(text))
      .then(added => {
        if (!added) {
          setError(t('certs.notice.notBundle', { name: file.name }));
          return;
        }
        setError('');
        notify('success', t('certs.notice.imported', { count: added.length }));
      });

  return { importBundle, error };
};

/**
 * The vault at `/certs`: the heading counting the records, its pane
 * reading the picked state ("N selected", Clear selection, the boxes'
 * Visibility and Status pickers over the picked synced rows the person
 * manages, one PUT a row, Delete of the browser's records behind the
 * typed confirmation, and Export bundle of the picked rows) while rows
 * are picked, then Add secret, the secret record form opening on the
 * secret kind the route narrows to, Generate and the one Restore backup,
 * the upload
 * zone taking a `*.certs.json` vault backup, the file Export bundle
 * writes, a file that is no backup refused on the zone's own line; one
 * tile a kind linking to the table narrowed to that kind and one Secrets
 * tile for the eight secret kinds; the table of
 * every record narrowed by the navbar binding of `useVaultSearch` under
 * `table_prefs_certs`, its panel carrying Export bundle, the select
 * column a real checkbox header, a `#<id>` in the URL landing on that
 * row, each row's menu offering Convert, Download, Delete behind the
 * typed confirmation naming the records linked to it and, on a synced
 * row the person manages, Remove from the organization behind its own,
 * the one verb that sends the DELETE; the expiry threshold the rows'
 * Expiring reads is the Preferences page's Certificates card. Focus
 * lands on the heading once a delete's dialog has
 * gone, and on arrival with `focusHeading` in the location's state, the
 * record page's way after its own delete. A secret record's row menu
 * offers Edit, the secret record form over the record, in place of
 * Convert and Download.
 */
const VaultPage = ({ context }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const notify = useNotify();
  const vault = useVault();
  const actions = useRecordActions();
  const store = useStoreWrites();
  const prefsKey = `${context.prefsPrefix}_certs`;
  const [target, setTarget] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const thresholdDays = vault.preferences.threshold_days;
  const ctx = { ...context, t, language: i18n.language, now: nowOf(), thresholdDays };
  const search = useVaultSearch({
    records: vault.records,
    columns: vaultColumns,
    ctx,
    prefsKey,
    actions: [
      {
        key: 'export-bundle',
        labelKey: 'certs.toolbar.exportBundle',
        icon: FaDownload,
        onRun: () => vault.exportBundle(vault.records),
      },
    ],
  });
  const selection = useSelection(search.rows, { labelOf: nameOf });
  const arrival = useArrival(search.rows);
  const bundle = useBundleImport();

  useEffect(() => {
    document.title = `${t('certs.sidebar.vault')} · ${context.appName}`;
  }, [context.appName, t]);

  const focusHeading = Boolean(location.state?.focusHeading);
  useEffect(() => {
    if (focusHeading && vault.loaded) {
      focusOn(HEADING_ID);
    }
  }, [focusHeading, location.key, vault.loaded]);

  const picked = () => search.rows.filter(record => selection.selected.has(record.id));
  const managed = picked().filter(record => managesSynced(record, context.user));

  const removePicked = async () => {
    const records = picked();
    await Promise.all(records.map(record => vault.remove(record)));
    selection.clear();
    notify('success', t('certs.notice.removedMany', { count: records.length }));
  };

  const landOnHeading = () => focusOn(HEADING_ID);

  const setPickedAccess = patch =>
    Promise.all(managed.map(record => store.setAccess(record, patch))).then(selection.clear);

  const addSecret = record =>
    vault.add(record).then(() => {
      setAdding(false);
      notify('success', t('certs.notice.saved'));
    });

  const saveSecret = record =>
    vault.update(editing, record).then(() => {
      setEditing(null);
      notify('success', t('certs.notice.saved'));
    });

  if (!vault.loaded) {
    return (
      <div className="list row">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }

  const headingActions = (
    <>
      <PickedActions
        selection={selection}
        managed={managed.length}
        onAccess={setPickedAccess}
        onDelete={() => setDeleting(true)}
        onExport={() => vault.exportBundle(picked())}
      />
      <button
        type="button"
        className="btn btn-sm btn-outline-primary"
        data-action="add-secret"
        onClick={() => setAdding(true)}
      >
        <FaPlus className="me-1" aria-hidden="true" />
        {t('certs.vault.addSecret')}
      </button>
      <Link to="/certs/generate" className="btn btn-sm btn-outline-primary" data-action="generate">
        <FaWandMagicSparkles className="me-1" aria-hidden="true" />
        {t('certs.vault.generate')}
      </Link>
      <UploadZone
        uploading={false}
        progress={0}
        accept=".json"
        dropText={t('certs.vault.dropBundle')}
        uploadingText={t('certs.input.reading')}
        onFile={bundle.importBundle}
        error={bundle.error}
      />
    </>
  );

  return (
    <div className="list row" data-page="certs-vault">
      <SectionHeading
        id={HEADING_ID}
        title={t('certs.vault.title')}
        count={vault.records.length}
        actions={headingActions}
      />
      <KindTiles records={vault.records} />
      <SubTable
        columns={vaultColumns}
        rows={search.rows}
        rowKey={recordKey}
        rowRef={arrival.ref}
        rowProp="record"
        RowActions={VaultRowActions}
        actionsProps={{
          user: context.user,
          onConvert: actions.convert,
          onDownload: actions.download,
          onEdit: setEditing,
          onDelete: setTarget,
          onRemove: setRemoving,
        }}
        sort={search.sort}
        onSort={search.setSort}
        hiddenColumns={search.hiddenColumns}
        widths={search.widths}
        onResize={search.setColumnWidth}
        ctx={ctx}
        emptyText={t(search.filtering ? 'pages.noMatches' : 'pages.empty')}
        emptyBody={t(search.filtering ? 'pages.noMatchesBody' : 'pages.emptyBody')}
        selection={selection.subtable}
      />
      <VaultTreeDialogs
        target={target}
        records={vault.records}
        onClose={() => setTarget(null)}
        onRemove={record => {
          actions.remove(record);
          setTarget(null);
        }}
        onConfirmed={landOnHeading}
      />
      <ConfirmModal
        show={deleting}
        handleClose={() => setDeleting(false)}
        handleConfirm={removePicked}
        onConfirmed={landOnHeading}
        title={t('certs.confirm.deleteTitle')}
        message={t('certs.confirm.deleteManyMessage', { count: selection.selected.size })}
      />
      {adding ? (
        <SecretRecordModal
          kind={secretKindOf(searchParams)}
          onSave={addSecret}
          onClose={() => setAdding(false)}
        />
      ) : null}
      {editing ? (
        <SecretRecordModal record={editing} onSave={saveSecret} onClose={() => setEditing(null)} />
      ) : null}
      <ConfirmModal
        show={Boolean(removing)}
        handleClose={() => setRemoving(null)}
        handleConfirm={() => store.removeFromStore(removing)}
        title={t('certs.confirm.removeFromTitle', { organization: removing?.organization || '' })}
        message={t('certs.confirm.removeFromMessage', {
          name: removing ? nameOf(removing) : '',
          organization: removing?.organization || '',
        })}
        keyword="remove"
        confirmText={t('certs.actions.removeFrom', { organization: removing?.organization || '' })}
      />
    </div>
  );
};

VaultPage.propTypes = {
  context: pageContextShape.isRequired,
};

export default VaultPage;
