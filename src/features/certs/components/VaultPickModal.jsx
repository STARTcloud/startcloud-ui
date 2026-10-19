import PropTypes from 'prop-types';
import { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import SubTable from '../../../components/common/SubTable';
import { useTablePrefs } from '../../../hooks/useTablePrefs';
import { useVault } from '../hooks/useVault';
import { matchesRecord, nowOf } from '../utils/records';

import { vaultColumns } from './vaultColumns';

const NAME_SORT = [{ column: 'name', direction: 'asc' }];

const recordKey = record => record.id;

const PickActions = ({ record, busy, onPick }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-primary"
      data-action="vault-pick-row"
      disabled={busy}
      onClick={() => onPick(record)}
    >
      {t('certs.vault.pickRow')}
    </button>
  );
};

PickActions.propTypes = {
  record: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onPick: PropTypes.func.isRequired,
};

/**
 * The dialog that picks one record of the browser's vault among the
 * given kinds: the vault's table over those records with a search, the
 * sort, hidden columns and widths kept under `prefsKey`, and Pick on a
 * row handing the record to `onPick`. `data-dialog` is `vault-pick`.
 */
const VaultPickModal = ({ kinds, title, prefsKey, busy = false, onPick, onClose }) => {
  const { t, i18n } = useTranslation();
  const vault = useVault();
  const [query, setQuery] = useState('');
  const prefs = useTablePrefs(prefsKey, vaultColumns, NAME_SORT);
  const needle = query.trim().toLowerCase();
  const rows = vault.records.filter(
    record => kinds.includes(record.kind) && (!needle || matchesRecord(record, needle))
  );
  const ctx = {
    t,
    language: i18n.language,
    now: nowOf(),
    thresholdDays: vault.preferences.threshold_days,
  };
  return (
    <Modal show onHide={onClose} size="lg" scrollable>
      <div data-dialog="vault-pick">
        <Modal.Header closeButton>
          <Modal.Title as="h5">{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <input
            className="form-control form-control-sm w-auto mb-3"
            type="search"
            placeholder={t('certs.search.placeholder')}
            aria-label={t('certs.search.placeholder')}
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
          <div data-table="vault-pick">
            <SubTable
              columns={vaultColumns}
              rows={rows}
              rowKey={recordKey}
              rowProp="record"
              RowActions={PickActions}
              actionsProps={{ busy, onPick }}
              sort={prefs.sort}
              onSort={prefs.setSort}
              hiddenColumns={prefs.hiddenColumns}
              widths={prefs.widths}
              onResize={prefs.setColumnWidth}
              ctx={ctx}
              emptyText={t(needle ? 'pages.noMatches' : 'pages.empty')}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('pages.confirm.cancel')}
          </button>
        </Modal.Footer>
      </div>
    </Modal>
  );
};

VaultPickModal.propTypes = {
  kinds: PropTypes.arrayOf(PropTypes.string).isRequired,
  title: PropTypes.string.isRequired,
  prefsKey: PropTypes.string.isRequired,
  busy: PropTypes.bool,
  onPick: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default VaultPickModal;
