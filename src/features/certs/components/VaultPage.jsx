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
  FaShieldHalved,
  FaTerminal,
  FaWandMagicSparkles,
} from 'react-icons/fa6';
import { Link, useLocation } from 'react-router-dom';

import ConfirmModal from '../../../components/common/ConfirmModal';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import RowMenu from '../../../components/common/RowMenu';
import SectionCard from '../../../components/common/SectionCard';
import SectionHeading from '../../../components/common/SectionHeading';
import StatCard from '../../../components/common/StatCard';
import SubTable from '../../../components/common/SubTable';
import UploadZone from '../../../components/common/UploadZone';
import { StatusMenu, VisibilityMenu, pickedOf } from '../../../components/common/VisibilityPicker';
import { useNotify } from '../../../contexts/NoticeContext';
import { useArrival } from '../../../hooks/useArrival';
import { useFolds } from '../../../hooks/useFolds';
import { useFormRules } from '../../../hooks/useFormRules';
import { useSelection } from '../../../hooks/useSelection';
import { pageContextShape } from '../../../utils/itemShape';
import { canManageRecord } from '../../../utils/permissions';
import { ROW_BULK, STATUS_VERBS, VISIBILITY_VERBS } from '../../collections/bulkActions';
import { useRecordActions } from '../hooks/useRecordActions';
import { useStoreWrites } from '../hooks/useStoreWrites';
import { useVault } from '../hooks/useVault';
import { useVaultSearch } from '../hooks/useVaultSearch';
import { focusOn } from '../utils/focus';
import { foldOf } from '../utils/folds';
import { KINDS, nameOf, nowOf } from '../utils/records';
import { PREFERENCES_LABELS, PREFERENCES_SCHEMA } from '../utils/schemas';
import { patchOfVerbs } from '../utils/sync';

import { TextField } from './fields';
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

const PREFERENCES_FOLD = 'preferences';

const HEADING_ID = 'certs-vault-heading';

const recordKey = record => record.id;

const managesSynced = (record, user) =>
  Boolean(record.remote_id) && canManageRecord(user, record.organization, record);

const VaultRowActions = ({ record, user, onConvert, onDownload, onDelete, onRemove }) => {
  const { t } = useTranslation();
  return (
    <RowMenu label={t('pages.table.actions')}>
      <Dropdown.Item as="button" type="button" onClick={() => onConvert(record)}>
        {t('certs.actions.convert')}
      </Dropdown.Item>
      <Dropdown.Item as="button" type="button" onClick={() => onDownload(record)}>
        {t('certs.actions.download')}
      </Dropdown.Item>
      <Dropdown.Divider />
      <Dropdown.Item
        as="button"
        type="button"
        className="text-danger"
        onClick={() => onDelete(record)}
      >
        {t('certs.actions.delete')}
      </Dropdown.Item>
      {managesSynced(record, user) ? (
        <Dropdown.Item
          as="button"
          type="button"
          className="text-danger"
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
  onDelete: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

const KindTiles = ({ records }) => {
  const { t } = useTranslation();
  return (
    <div className="stat-grid stat-grid-3 mb-3" data-panel="vault-tiles">
      {KINDS.map(kind => {
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
    </div>
  );
};

KindTiles.propTypes = {
  records: PropTypes.array.isRequired,
};

const PreferencesCard = ({ thresholdDays, onSave, fold }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState({ threshold_days: String(thresholdDays) });
  const rules = useFormRules({
    schema: PREFERENCES_SCHEMA,
    values: draft,
    labels: PREFERENCES_LABELS,
    idPrefix: 'certs-preferences',
  });

  const submit = event => {
    event.preventDefault();
    if (rules.validateAll()) {
      onSave(Number(draft.threshold_days));
    }
  };

  return (
    <SectionCard
      title={t('certs.preferences.title')}
      folded={fold.folded}
      onFold={fold.onFold}
      className="mt-3 mb-3"
    >
      <form onSubmit={submit} noValidate>
        <FormErrorSummary errors={rules.summary} />
        <div className="row g-3 align-items-end">
          <div className="col-md-4">
            <TextField
              name="threshold_days"
              type="number"
              min={1}
              draft={draft}
              rules={rules}
              onChange={(name, value) => setDraft({ [name]: value })}
              hint={t('certs.preferences.thresholdHint')}
              className="mb-0"
            />
          </div>
          <div className="col-auto">
            <button type="submit" className="btn btn-primary">
              {t('certs.preferences.save')}
            </button>
          </div>
        </div>
      </form>
    </SectionCard>
  );
};

PreferencesCard.propTypes = {
  thresholdDays: PropTypes.number.isRequired,
  onSave: PropTypes.func.isRequired,
  fold: PropTypes.shape({
    folded: PropTypes.bool.isRequired,
    onFold: PropTypes.func.isRequired,
  }).isRequired,
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
            onClick={onDelete}
          >
            {t(action.labelKey)}
          </button>
        );
      })}
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onExport}>
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
 * are picked, then Generate and the one Add New, the upload
 * zone taking a `*.certs.json` bundle, a file that is no bundle refused
 * on the zone's own line; one tile a kind linking to the table narrowed
 * to that kind; the table of every record narrowed by the navbar
 * binding of `useVaultSearch` under `table_prefs_certs`, its panel
 * carrying Export bundle, the select column a real checkbox header, a
 * `#<id>` in the URL landing on that row, each row's menu offering
 * Convert, Download, Delete behind the typed confirmation naming the
 * records linked to it and, on a synced row the person manages, Remove
 * from the organization behind its own, the one verb that sends the
 * DELETE; and at the foot the Preferences card holding
 * the expiry threshold in days, a whole number from one checked on blur
 * and on Save. Focus lands on the heading once a delete's dialog has
 * gone, and on arrival with `focusHeading` in the location's state, the
 * record page's way after its own delete.
 */
const VaultPage = ({ context }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const notify = useNotify();
  const vault = useVault();
  const actions = useRecordActions();
  const store = useStoreWrites();
  const prefsKey = `${context.prefsPrefix}_certs`;
  const folds = useFolds(prefsKey);
  const [target, setTarget] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [deleting, setDeleting] = useState(false);
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
      <Link to="/certs/generate" className="btn btn-sm btn-outline-primary">
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
      <PreferencesCard
        key={thresholdDays}
        thresholdDays={thresholdDays}
        onSave={days => vault.setPreference('threshold_days', days)}
        fold={foldOf(folds, PREFERENCES_FOLD)}
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
