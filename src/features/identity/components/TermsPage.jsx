import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import { resultLineOf } from '../../../components/common/bulkResult';
import ConfirmModal from '../../../components/common/ConfirmModal';
import MarkdownArticle from '../../../components/common/MarkdownArticle';
import SectionHeading from '../../../components/common/SectionHeading';
import { errorKeys } from '../../../components/common/StepUpDialog';
import TermIcon, { RegionFlag } from '../../../components/common/TermIcon';
import { useGuard } from '../../../contexts/GuardContext';
import { useNotify } from '../../../contexts/NoticeContext';
import { useClientFilters } from '../../../hooks/useClientFilters';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { useUrlNarrowing } from '../../../hooks/useUrlNarrowing';
import { deleteTerm, placeholders as readPlaceholders, terms, termsBulk } from '../api/content';
import { useAdminRead } from '../hooks/useAdminRead';
import { PLACEHOLDERS, TERMS } from '../utils/examples';

import AdminLoading from './AdminLoading';
import DateCell from './DateCell';
import {
  copyShape,
  defaultCopyOf,
  documentShape,
  regionOfCopy,
  regionsOf,
  TermCopyDialog,
  TermDocumentDialog,
} from './TermDialog';

const keyOf = document => document.name;

const matches = (document, needle) =>
  [document.name, document.friendly_name || ''].some(text => text.toLowerCase().includes(needle));

const FILTER_GROUPS = [
  {
    key: 'type',
    labelKey: 'admin.terms.field.type',
    values: document => [String(document.type).toLowerCase()],
    activeClass: 'bg-info text-dark',
    labelFor: (value, t) => t(`admin.terms.type.${value}`, { defaultValue: value }),
  },
  {
    key: 'public',
    labelKey: 'admin.terms.field.public',
    values: document => (document.is_public ? ['public'] : []),
    activeClass: 'bg-success',
    labelFor: (value, t) => t(`admin.terms.${value}`),
  },
];
const FILTER_KEYS = FILTER_GROUPS.map(group => group.key);

const TypeBadge = ({ document }) => {
  const { t } = useTranslation();
  return (
    <span className="badge bg-info text-dark">
      {t(`admin.terms.type.${String(document.type).toLowerCase()}`, {
        defaultValue: document.type,
      })}
    </span>
  );
};

TypeBadge.propTypes = {
  document: documentShape.isRequired,
};

const PreviewDialog = ({ document, copy, onClose }) => {
  const { t } = useTranslation();
  return (
    <Modal show onHide={onClose} dialogClassName="list-modal" scrollable>
      <Modal.Header closeButton>
        <Modal.Title as="h5" className="d-flex flex-wrap align-items-center gap-2">
          <TermIcon icon={document.icon} className={document.icon} aria-hidden="true" />
          <span>{document.friendly_name || document.name}</span>
          <span className="badge bg-secondary">
            {t('admin.terms.version', { version: copy.version || '' })}
          </span>
          <TypeBadge document={document} />
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <MarkdownArticle markdown={copy.content || ''} />
      </Modal.Body>
    </Modal>
  );
};

PreviewDialog.propTypes = {
  document: documentShape.isRequired,
  copy: copyShape.isRequired,
  onClose: PropTypes.func.isRequired,
};

const CopyRow = ({ copy, onPreview, onEdit, onCopy, onDelete }) => {
  const { t } = useTranslation();
  const regions = regionsOf(copy);
  return (
    <li className="list-group-item d-flex flex-wrap align-items-center gap-2">
      <div className="d-flex flex-wrap align-items-center gap-2 flex-grow-1 min-width-0">
        {regions.length > 0 ? (
          regions.map(code => <RegionFlag key={code} region={code} aria-hidden="true" />)
        ) : (
          <span className="badge bg-secondary">{t('admin.terms.everywhereElse')}</span>
        )}
        {regions.length > 0 ? <span className="small">{regions.join(', ')}</span> : null}
        <span className="small text-muted">
          {t('admin.terms.version', { version: copy.version || '' })}
          {copy.updated_at ? (
            <>
              {' · '}
              {t('admin.terms.updatedAt')} <DateCell value={copy.updated_at} />
            </>
          ) : null}
        </span>
      </div>
      <div className="d-flex flex-wrap gap-1">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onPreview(copy)}
        >
          {t('admin.terms.preview')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onEdit(copy)}
        >
          {t('admin.terms.edit')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onCopy(copy)}
        >
          {t('admin.terms.copies.duplicate')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          onClick={() => onDelete(copy)}
        >
          {t('admin.terms.delete')}
        </button>
      </div>
    </li>
  );
};

CopyRow.propTypes = {
  copy: copyShape.isRequired,
  onPreview: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

const DocumentCard = ({
  document,
  selected,
  onToggle,
  onEditDocument,
  onAddCopy,
  onPreviewCopy,
  onEditCopy,
  onCopyCopy,
  onDeleteCopy,
}) => {
  const { t } = useTranslation();
  const regionOnly = !defaultCopyOf(document);
  return (
    <li className="list-group-item">
      <div className="d-flex flex-wrap align-items-center gap-2">
        <input
          type="checkbox"
          className="form-check-input flex-shrink-0"
          checked={selected}
          onChange={onToggle}
          aria-label={document.friendly_name || document.name}
        />
        <TermIcon icon={document.icon} className={document.icon} aria-hidden="true" />
        <strong>{document.friendly_name || document.name}</strong>
        <code className="small">{document.name}</code>
        {document.is_public ? (
          <span className="badge bg-success">{t('admin.terms.public')}</span>
        ) : null}
        <TypeBadge document={document} />
        {regionOnly ? (
          <span className="badge bg-warning text-dark">{t('admin.terms.regionOnly')}</span>
        ) : null}
        <div className="d-flex flex-wrap gap-1 ms-auto">
          {document.is_public ? (
            <Link
              to={`/public/policies/${encodeURIComponent(document.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-outline-secondary"
            >
              {t('admin.terms.openPublic')}
            </Link>
          ) : null}
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => onAddCopy(document)}
          >
            {t('admin.terms.copies.add')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => onEditDocument(document)}
          >
            {t('admin.terms.edit')}
          </button>
        </div>
      </div>
      <ul className="list-group list-group-flush mt-2 term-document-copies">
        {document.copies.map(copy => (
          <CopyRow
            key={copy.id}
            document={document}
            copy={copy}
            onPreview={onPreviewCopy}
            onEdit={onEditCopy}
            onCopy={onCopyCopy}
            onDelete={onDeleteCopy}
          />
        ))}
      </ul>
    </li>
  );
};

DocumentCard.propTypes = {
  document: documentShape.isRequired,
  selected: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onEditDocument: PropTypes.func.isRequired,
  onAddCopy: PropTypes.func.isRequired,
  onPreviewCopy: PropTypes.func.isRequired,
  onEditCopy: PropTypes.func.isRequired,
  onCopyCopy: PropTypes.func.isRequired,
  onDeleteCopy: PropTypes.func.isRequired,
};

const usePlaceholders = () => {
  const [list, setList] = useState([]);
  useEffect(() => {
    let mounted = true;
    readPlaceholders()
      .then(answer => {
        if (mounted) {
          setList(Array.isArray(answer) ? answer : []);
        }
      })
      .catch(error => {
        if (mounted && error.status === 404) {
          setList(PLACEHOLDERS);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);
  return list;
};

const useSelection = rows => {
  const [selected, setSelected] = useState(() => new Set());
  const toggle = key =>
    setSelected(current => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  const allSelected = rows.length > 0 && rows.every(row => selected.has(keyOf(row)));
  const someSelected = selected.size > 0;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map(keyOf)));
  const clear = () => setSelected(new Set());
  return { selected, toggle, toggleAll, allSelected, someSelected, clear };
};

/**
 * The Terms page's bulk actions, drawn in the heading's action pane while
 * cards are picked: Make public, Make private and Delete over
 * `POST /api/admin/terms/bulk` with the picked documents' copy ids, Delete
 * behind the shared confirm and the step-up dialog, the result line naming
 * processed, skipped and each error's code translated (decision 150).
 */
const TermsBulkActions = ({ ids, onDone }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const guard = useGuard();
  const [pending, setPending] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = action => {
    setBusy(true);
    guard(() => termsBulk({ action, ids }), t('admin.terms.bulk.stepUpReason'))
      .then(answer => {
        setResult(answer);
        onDone();
      })
      .catch(error => {
        if (error?.code !== 'step_up_required') {
          notify('danger', t(errorKeys(error)));
        }
      })
      .finally(() => {
        setBusy(false);
        setPending('');
      });
  };

  const line = resultLineOf(t, 'admin.terms.bulk', result);

  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        disabled={busy || ids.length === 0}
        onClick={() => run('set_public')}
      >
        {t('admin.terms.bulk.set_public')}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        disabled={busy || ids.length === 0}
        onClick={() => run('set_private')}
      >
        {t('admin.terms.bulk.set_private')}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        disabled={busy || ids.length === 0}
        onClick={() => setPending('delete')}
      >
        {t('admin.terms.bulk.delete')}
      </button>
      {line ? (
        <span className="small text-muted" role="status">
          {line}
        </span>
      ) : null}
      <ConfirmModal
        show={pending === 'delete'}
        handleClose={() => setPending('')}
        handleConfirm={() => run('delete')}
        title={t('admin.terms.bulk.confirmTitle')}
        message={t('admin.terms.bulk.confirmBody', {
          count: ids.length,
          keyword: t('pages.confirm.keyword'),
        })}
      />
    </>
  );
};

TermsBulkActions.propTypes = {
  ids: PropTypes.array.isRequired,
  onDone: PropTypes.func.isRequired,
};

/**
 * Legal › Terms: a `SectionHeading` over the cards, the document count as
 * muted text after the title, Create as the heading's action; one card
 * per document, no drag handles and no order write, its copies listed
 * inside with their flag, regions, version, updated date and the
 * per-copy actions Preview, Edit, Copy (to a new region) and Delete; a
 * "region-only" badge on a document with no default copy; Add a copy on
 * the card opening the create dialog prefilled with the document's name;
 * the document-level fields (name, display name, icon, type, public)
 * edited once from the card's Edit and written to every copy; Public
 * still links "Open public page"; a checkbox per card and the heading's
 * select-all, the action pane gaining, while cards are picked, "N
 * selected", Clear selection, Make public, Make private and Delete over
 * `POST /api/admin/terms/bulk` with the picked documents' copy ids,
 * Delete behind the confirm and the step-up dialog (decision 150); the
 * navbar search bound with a query over the cards by name and display
 * name and the Type and Public `toggle` groups narrowing the cards
 * client-side, the query and the groups' values in the URL as `search`,
 * `type` and `public` through `useUrlNarrowing`.
 */
const TermsPage = () => {
  const { t } = useTranslation();
  const notify = useNotify();
  const placeholders = usePlaceholders();
  const { data, loading, reload } = useAdminRead({ read: terms, example: TERMS });
  const documents = Array.isArray(data) ? data : [];
  const url = useUrlNarrowing({ queryKey: 'search', filterKeys: FILTER_KEYS });
  const needle = url.query.trim().toLowerCase();
  const searched = needle ? documents.filter(document => matches(document, needle)) : documents;
  const filters = useClientFilters({ specs: FILTER_GROUPS, rows: searched, bound: url });
  const shown = filters.rows;
  const narrowing = needle !== '' || filters.active;

  useNavbarSearchBinding({
    query: url.query,
    onQueryChange: url.setQuery,
    placeholder: t('admin.terms.search'),
    matched: shown.length,
    total: documents.length,
    groups: filters.groups,
    onClearFilters: filters.clear,
  });
  const selection = useSelection(shown);
  const [documentDialog, setDocumentDialog] = useState({ open: false, document: null });
  const [copyDialog, setCopyDialog] = useState(null);
  const [previewing, setPreviewing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    document.title = t('admin.terms.title');
  }, [t]);

  const fail = error => notify('danger', t(error.messageKey || 'errors.request'));

  const confirmDelete = () => {
    deleteTerm(deleting.document.name, regionOfCopy(deleting.copy))
      .then(() => {
        notify('success', t('admin.terms.deleted', { name: deleting.document.name }));
        reload();
      })
      .catch(fail);
  };

  if (loading && !data) {
    return <AdminLoading />;
  }

  const createAction = (
    <button
      type="button"
      className="btn btn-sm btn-primary"
      onClick={() => setDocumentDialog({ open: true, document: null })}
    >
      <FaPlus className="me-1" aria-hidden="true" />
      {t('admin.terms.create')}
    </button>
  );

  const pickedIds = [...selection.selected]
    .map(name => shown.find(document => document.name === name))
    .filter(Boolean)
    .flatMap(document => document.copies.map(copy => copy.id));

  const headingActions = selection.someSelected ? (
    <>
      <strong>{t('admin.terms.bulk.selected', { count: selection.selected.size })}</strong>
      <button type="button" className="btn btn-sm btn-link" onClick={selection.clear}>
        {t('admin.terms.bulk.clearSelection')}
      </button>
      <TermsBulkActions
        ids={pickedIds}
        onDone={() => {
          selection.clear();
          reload();
        }}
      />
    </>
  ) : (
    createAction
  );

  return (
    <div>
      <SectionHeading
        title={t('admin.terms.title')}
        count={documents.length}
        actions={headingActions}
        selectAll={{
          allSelected: selection.allSelected,
          someSelected: selection.someSelected,
          onToggleAll: selection.toggleAll,
          label: t('pages.selectColumn'),
        }}
      />
      {shown.length === 0 ? (
        <div className="text-muted">{narrowing ? t('pages.noMatches') : t('pages.empty')}</div>
      ) : null}
      <ul className="list-group">
        {shown.map(document => (
          <DocumentCard
            key={keyOf(document)}
            document={document}
            selected={selection.selected.has(keyOf(document))}
            onToggle={() => selection.toggle(keyOf(document))}
            onEditDocument={entry => setDocumentDialog({ open: true, document: entry })}
            onAddCopy={entry => setCopyDialog({ document: entry, source: null, editing: false })}
            onPreviewCopy={copy => setPreviewing({ document, copy })}
            onEditCopy={copy => setCopyDialog({ document, source: copy, editing: true })}
            onCopyCopy={copy => setCopyDialog({ document, source: copy, editing: false })}
            onDeleteCopy={copy => setDeleting({ document, copy })}
          />
        ))}
      </ul>
      {documentDialog.open ? (
        <TermDocumentDialog
          document={documentDialog.document}
          onClose={() => setDocumentDialog({ open: false, document: null })}
          onSaved={reload}
        />
      ) : null}
      {copyDialog ? (
        <TermCopyDialog
          document={copyDialog.document}
          source={copyDialog.source}
          editing={copyDialog.editing}
          placeholders={placeholders}
          onClose={() => setCopyDialog(null)}
          onSaved={reload}
        />
      ) : null}
      {previewing ? (
        <PreviewDialog
          document={previewing.document}
          copy={previewing.copy}
          onClose={() => setPreviewing(null)}
        />
      ) : null}
      <ConfirmModal
        show={Boolean(deleting)}
        handleClose={() => setDeleting(null)}
        handleConfirm={confirmDelete}
        title={t('admin.terms.deleteTitle')}
        message={t('admin.terms.deleteBody', {
          name: deleting?.document.name || '',
          keyword: t('pages.confirm.keyword'),
        })}
      />
    </div>
  );
};

export default TermsPage;
