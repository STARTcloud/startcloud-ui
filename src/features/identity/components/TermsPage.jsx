import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import ConfirmModal from '../../../components/common/ConfirmModal';
import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import SortableList from '../../../components/common/SortableList';
import TermIcon from '../../../components/common/TermIcon';
import { useNotify } from '../../../contexts/NoticeContext';
import { useClientFilters } from '../../../hooks/useClientFilters';
import { useFormRules } from '../../../hooks/useFormRules';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';
import { useUrlNarrowing } from '../../../hooks/useUrlNarrowing';
import {
  createTerm,
  deleteTerm,
  placeholders as readPlaceholders,
  reorderTerms,
  terms,
} from '../api/content';
import { useAdminRead } from '../hooks/useAdminRead';
import { PLACEHOLDERS, TERMS } from '../utils/examples';

import AdminLoading from './AdminLoading';
import DateCell from './DateCell';
import TermDialog, { termShape } from './TermDialog';

const COPY_SCHEMA = { required: ['name'], properties: { name: { $ref: '#/$defs/slug' } } };
const COPY_LABELS = { name: 'admin.terms.field.name' };
const ORDER_KEY = 'terms-order';

const byOrder = (a, b) => (a.display_order || 0) - (b.display_order || 0);

const keyOf = term => term.name;

const matches = (term, needle) =>
  [term.name, term.friendly_name || ''].some(text => text.toLowerCase().includes(needle));

const FILTER_GROUPS = [
  {
    key: 'type',
    labelKey: 'admin.terms.field.type',
    values: term => [String(term.type).toLowerCase()],
    activeClass: 'bg-info text-dark',
    labelFor: (value, t) => t(`admin.terms.type.${value}`, { defaultValue: value }),
  },
  {
    key: 'public',
    labelKey: 'admin.terms.field.public',
    values: term => (term.is_public ? ['public'] : []),
    activeClass: 'bg-success',
    labelFor: (value, t) => t(`admin.terms.${value}`),
  },
];
const FILTER_KEYS = FILTER_GROUPS.map(group => group.key);

const reorderWithin = (all, shown) => {
  const names = new Set(shown.map(keyOf));
  let index = 0;
  return all.map(term => {
    if (!names.has(term.name)) {
      return term;
    }
    index += 1;
    return shown[index - 1];
  });
};

const TermCard = ({ term, handle, onEdit, onCopy, onDelete }) => {
  const { t } = useTranslation();
  return (
    <>
      {handle}
      <div className="flex-grow-1 min-width-0">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <TermIcon icon={term.icon} className={term.icon} aria-hidden="true" />
          <strong>{term.friendly_name || term.name}</strong>
          {term.is_public ? (
            <span className="badge bg-success">{t('admin.terms.public')}</span>
          ) : null}
          <span className="badge bg-info text-dark">
            {t(`admin.terms.type.${String(term.type).toLowerCase()}`, { defaultValue: term.type })}
          </span>
        </div>
        <div className="small text-muted">
          <code>{term.name}</code>
          {' · '}
          {t('admin.terms.version', { version: term.version || '' })}
          {term.updated_at ? (
            <>
              {' · '}
              {t('admin.terms.updatedAt')} <DateCell value={term.updated_at} />
            </>
          ) : null}
          {term.created_by ? ` · ${term.created_by}` : ''}
        </div>
      </div>
      <div className="d-flex flex-wrap gap-1">
        <Link
          to={`/public/policies/${encodeURIComponent(term.name)}`}
          className="btn btn-sm btn-outline-secondary"
        >
          {t('admin.terms.preview')}
        </Link>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onCopy(term)}
        >
          {t('admin.terms.copy')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onEdit(term)}
        >
          {t('admin.terms.edit')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          onClick={() => onDelete(term)}
        >
          {t('admin.terms.delete')}
        </button>
      </div>
    </>
  );
};

TermCard.propTypes = {
  term: termShape.isRequired,
  handle: PropTypes.node.isRequired,
  onEdit: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

const CopyDialog = ({ source, onClose, onSaved }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [form, setForm] = useState({ name: `${source.name}-copy` });
  const [busy, setBusy] = useState(false);
  const rules = useFormRules({
    formKey: 'terms',
    schema: COPY_SCHEMA,
    values: form,
    labels: COPY_LABELS,
    idPrefix: 'term-copy',
  });

  const save = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    setBusy(true);
    createTerm({
      name: form.name,
      friendly_name: source.friendly_name,
      icon: source.icon,
      version: source.version,
      type: source.type,
      is_public: source.is_public,
      display_order: source.display_order,
      content: source.content,
    })
      .then(() => {
        notify('success', t('admin.terms.copied'));
        onSaved();
        onClose();
      })
      .catch(error => {
        if (!rules.applyServerErrors(error)) {
          notify('danger', t(error.messageKey || 'errors.request'));
        }
      })
      .finally(() => setBusy(false));
  };

  return (
    <Modal show onHide={onClose} dialogClassName="form-modal" scrollable>
      <form onSubmit={save} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h5">{t('admin.terms.copyTitle', { name: source.name })}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormErrorSummary errors={rules.summary} />
          <Field
            id={rules.idFor('name')}
            label={t('admin.terms.copyName')}
            error={rules.errors.name || ''}
          >
            {aria => (
              <input
                {...aria}
                type="text"
                className="form-control"
                value={form.name}
                onChange={event => setForm({ name: event.target.value })}
                onBlur={() => rules.onBlur('name')}
              />
            )}
          </Field>
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            {t('admin.buttons.cancel')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {t('admin.terms.copy')}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

CopyDialog.propTypes = {
  source: termShape.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
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

const useOrdered = data => {
  const sorted = useMemo(() => (Array.isArray(data) ? [...data].sort(byOrder) : []), [data]);
  const [local, setLocal] = useState({ base: sorted, items: sorted });
  const ordered = local.base === sorted ? local.items : sorted;
  const setOrdered = items => setLocal({ base: sorted, items });
  return { ordered, setOrdered };
};

/**
 * Content › Terms: the templates as cards in a `SortableList`, a drag
 * writing the order at once and raising a success card carrying Undo,
 * which writes the previous order back; Public and type badges, Preview
 * to the public policy page, Copy through a small dialog asking the new
 * name, Edit and Create in one dialog, Delete behind the confirm; every
 * change saved as it is made and the list re-fetched; the navbar search
 * bound with a query over the cards by name and display name and the
 * Type and Public `toggle` groups narrowing the cards client-side, the
 * query and the groups' values in the URL as `search`, `type` and
 * `public` through `useUrlNarrowing`.
 */
const TermsPage = () => {
  const { t } = useTranslation();
  const notify = useNotify();
  const placeholders = usePlaceholders();
  const { data, loading, reload } = useAdminRead({ read: terms, example: TERMS });
  const { ordered, setOrdered } = useOrdered(data);
  const url = useUrlNarrowing({ queryKey: 'search', filterKeys: FILTER_KEYS });
  const needle = url.query.trim().toLowerCase();
  const searched = needle ? ordered.filter(term => matches(term, needle)) : ordered;
  const filters = useClientFilters({ specs: FILTER_GROUPS, rows: searched, bound: url });
  const shown = filters.rows;
  const narrowing = needle !== '' || filters.active;

  useNavbarSearchBinding({
    query: url.query,
    onQueryChange: url.setQuery,
    placeholder: t('admin.terms.search'),
    matched: shown.length,
    total: ordered.length,
    groups: filters.groups,
    onClearFilters: filters.clear,
  });
  const [dialog, setDialog] = useState({ open: false, term: null });
  const [copying, setCopying] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    document.title = t('admin.terms.title');
  }, [t]);

  const fail = error => notify('danger', t(error.messageKey || 'errors.request'));

  const writeOrder = (next, previous) => {
    setOrdered(next);
    reorderTerms(next.map(keyOf))
      .then(() => {
        notify('success', t('admin.terms.orderSaved'), {
          key: ORDER_KEY,
          action: { label: t('admin.terms.undo'), onClick: () => writeOrder(previous, next) },
        });
      })
      .catch(error => {
        setOrdered(previous);
        fail(error);
      });
  };

  const confirmDelete = () => {
    deleteTerm(deleting.name)
      .then(() => {
        notify('success', t('admin.terms.deleted', { name: deleting.name }));
        reload();
      })
      .catch(fail);
  };

  if (loading && !data) {
    return <AdminLoading />;
  }

  return (
    <div>
      <div className="d-flex justify-content-end mb-3">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => setDialog({ open: true, term: null })}
        >
          <FaPlus className="me-1" aria-hidden="true" />
          {t('admin.terms.create')}
        </button>
      </div>
      {shown.length === 0 ? (
        <div className="text-muted">{narrowing ? t('pages.noMatches') : t('pages.empty')}</div>
      ) : null}
      <SortableList
        items={shown}
        keyOf={keyOf}
        onReorder={next => writeOrder(reorderWithin(ordered, next), ordered)}
        renderItem={(term, handle) => (
          <TermCard
            term={term}
            handle={handle}
            onEdit={entry => setDialog({ open: true, term: entry })}
            onCopy={setCopying}
            onDelete={setDeleting}
          />
        )}
      />
      {dialog.open ? (
        <TermDialog
          term={dialog.term}
          placeholders={placeholders}
          onClose={() => setDialog({ open: false, term: null })}
          onSaved={reload}
        />
      ) : null}
      {copying ? (
        <CopyDialog source={copying} onClose={() => setCopying(null)} onSaved={reload} />
      ) : null}
      <ConfirmModal
        show={Boolean(deleting)}
        handleClose={() => setDeleting(null)}
        handleConfirm={confirmDelete}
        title={t('admin.terms.deleteTitle')}
        message={t('admin.terms.deleteBody', {
          name: deleting?.name || '',
          keyword: t('pages.confirm.keyword'),
        })}
      />
    </div>
  );
};

export default TermsPage;
