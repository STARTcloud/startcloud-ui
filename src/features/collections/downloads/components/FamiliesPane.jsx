import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaXmark } from 'react-icons/fa6';

import ConfirmModal from '../../../../components/common/ConfirmModal';
import EmptyState from '../../../../components/common/EmptyState';
import FormErrorSummary from '../../../../components/common/FormErrorSummary';
import MarkdownText from '../../../../components/common/MarkdownText';
import SubTable from '../../../../components/common/SubTable';
import { formRulesShape, useFormRules } from '../../../../hooks/useFormRules';
import { FAMILY_LABELS, FAMILY_SCHEMA } from '../../../../utils/forms';
import { familyShape } from '../../../../utils/itemShape';
import { nextSort, sortItems } from '../../../../utils/sort';
import { downloadsAdapter } from '../api/adapter';

import { TextAreaField, TextField } from './fields';

const NO_HIDDEN = new Set();

const rowKey = row => row.name;

const linkTo = (href, label) =>
  href ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  ) : (
    ''
  );

const COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'downloads.family.name',
    value: row => row.name,
    render: row => <strong>{row.name}</strong>,
  },
  {
    key: 'vendor',
    kind: 'text',
    labelKey: 'downloads.family.vendor',
    value: row => row.vendor,
  },
  {
    key: 'description',
    kind: 'text',
    labelKey: 'downloads.family.description',
    prose: true,
    value: row => row.description,
    render: row => <MarkdownText text={row.description} />,
  },
  {
    key: 'docs',
    kind: 'link',
    labelKey: 'downloads.family.docsUrl',
    value: row => row.docsUrl,
    render: (row, ctx) => linkTo(row.docsUrl, ctx.t('downloads.actions.docs')),
  },
  {
    key: 'notes',
    kind: 'link',
    labelKey: 'downloads.family.notesUrl',
    value: row => row.notesUrl,
    render: (row, ctx) => linkTo(row.notesUrl, ctx.t('downloads.actions.notes')),
  },
  {
    key: 'products',
    kind: 'count',
    labelKey: 'downloads.families.products',
    value: row => row.products,
  },
];

const DEFAULT_SORT = [{ column: 'name', direction: 'asc' }];

const draftFrom = family => ({
  name: family?.name ?? '',
  description: family?.description ?? '',
  vendor: family?.vendor ?? '',
  docs_url: family?.docsUrl ?? '',
  notes_url: family?.notesUrl ?? '',
  icon_url: family?.iconUrl ?? '',
});

/**
 * The inline form of one family, the Add New and Edit of the Families
 * view: the name, the description, the vendor and the three links,
 * validated against the host's `family` form, Save creating or updating
 * the family and Cancel closing the form.
 */
const FamilyForm = ({ draft, rules, onChange, onSubmit, onCancel }) => {
  const { t } = useTranslation();
  return (
    <form onSubmit={onSubmit} noValidate className="mb-3">
      <FormErrorSummary errors={rules.summary} />
      <TextField name="name" draft={draft} rules={rules} onChange={onChange} />
      <TextAreaField name="description" draft={draft} rules={rules} onChange={onChange} />
      <TextField name="vendor" draft={draft} rules={rules} onChange={onChange} />
      <TextField name="docs_url" type="url" draft={draft} rules={rules} onChange={onChange} />
      <TextField name="notes_url" type="url" draft={draft} rules={rules} onChange={onChange} />
      <TextField name="icon_url" type="url" draft={draft} rules={rules} onChange={onChange} />
      <div className="d-flex gap-2">
        <button type="submit" className="btn btn-sm btn-success">
          {t('boxes.buttons.save')}
        </button>
        <button type="button" className="btn btn-sm btn-secondary" onClick={onCancel}>
          {t('boxes.buttons.cancel')}
        </button>
      </div>
    </form>
  );
};

FamilyForm.propTypes = {
  draft: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

const FamilyRowActions = ({ family, ctx }) => {
  const { t } = useTranslation();
  const [showDelete, setShowDelete] = useState(false);
  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() => ctx.onEdit(family)}
      >
        {t('boxes.buttons.edit')}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        onClick={() => setShowDelete(true)}
      >
        {t('boxes.buttons.delete')}
      </button>
      <ConfirmModal
        show={showDelete}
        handleClose={() => setShowDelete(false)}
        handleConfirm={() => ctx.onDelete(family)}
      />
    </>
  );
};

FamilyRowActions.propTypes = {
  family: familyShape.isRequired,
  ctx: PropTypes.shape({
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
  }).isRequired,
};

const useFamilyEditor = ({ org, ctx, onSaved }) => {
  const { t } = useTranslation();
  const { notify } = ctx;
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(() => draftFrom(null));
  const rules = useFormRules({
    formKey: 'family',
    schema: FAMILY_SCHEMA,
    values: draft,
    labels: FAMILY_LABELS,
    idPrefix: 'family-edit',
  });

  const onChange = useCallback(event => {
    const { name, value } = event.target;
    setDraft(current => ({ ...current, [name]: value }));
  }, []);

  const open = family => {
    setEditing(family ? family.name : '');
    setDraft(draftFrom(family));
    rules.reset();
  };

  const cancel = () => {
    setEditing(null);
    rules.reset();
  };

  const submit = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    const call = editing
      ? downloadsAdapter.families.update(org, editing, draft)
      : downloadsAdapter.families.create(org, draft);
    call
      .then(() => {
        notify('success', t(editing ? 'downloads.families.updated' : 'downloads.families.created'));
        setEditing(null);
        onSaved();
      })
      .catch(error => {
        if (rules.applyServerErrors(error)) {
          return;
        }
        notify('danger', t(error.messageKey || 'errors.request'));
      });
  };

  return { editing, draft, rules, onChange, open, cancel, submit };
};

/**
 * The Families view of an organization's downloads, drawn full width
 * under the heading row the way the Duplicates view is: one line per
 * family with its vendor, description, links and product count, Edit and
 * Delete on each, Add New and Edit opening one inline form above the
 * table; a save or a delete reloads the view and the listing behind it.
 */
const FamiliesPane = ({ org, ctx, onClose }) => {
  const { t } = useTranslation();
  const [rows, setRows] = useState(null);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [nonce, setNonce] = useState(0);
  const reloadPane = () => setNonce(current => current + 1);
  const editor = useFamilyEditor({
    org,
    ctx,
    onSaved: () => {
      reloadPane();
      ctx.reload();
    },
  });

  useEffect(() => {
    let mounted = true;
    downloadsAdapter.families
      .list(org)
      .then(loaded => {
        if (mounted) {
          setRows(loaded);
        }
      })
      .catch(() => {
        if (mounted) {
          setRows([]);
        }
      });
    return () => {
      mounted = false;
    };
  }, [org, nonce]);

  const remove = family => {
    downloadsAdapter.families
      .remove(org, family.name)
      .then(() => {
        ctx.notify('success', t('downloads.families.deleted'));
        reloadPane();
        ctx.reload();
      })
      .catch(error => ctx.notify('danger', t(error.messageKey || 'errors.request')));
  };

  const tableCtx = { ...ctx, onEdit: editor.open, onDelete: remove };

  const sorted = useMemo(
    () => (rows ? sortItems(rows, sort, COLUMNS, ctx) : []),
    [rows, sort, ctx]
  );

  return (
    <div className="w-100 order-last">
      <div className="d-flex align-items-center gap-2 mb-2">
        <h3 className="h6 mb-0">{t('downloads.families.title')}</h3>
        {rows ? <span className="badge bg-secondary bg-opacity-50">{rows.length}</span> : null}
        <button
          type="button"
          className="btn btn-sm btn-outline-success ms-auto"
          onClick={() => editor.open(null)}
        >
          {t('pages.addNew')}
        </button>
        <button
          type="button"
          className="navbar-search-tool"
          onClick={onClose}
          title={t('boxes.buttons.close')}
          aria-label={t('boxes.buttons.close')}
        >
          <FaXmark />
        </button>
      </div>
      {editor.editing === null ? null : (
        <FamilyForm
          draft={editor.draft}
          rules={editor.rules}
          onChange={editor.onChange}
          onSubmit={editor.submit}
          onCancel={editor.cancel}
        />
      )}
      {rows === null ? <div>{t('pages.loading')}</div> : null}
      {rows && rows.length === 0 ? (
        <EmptyState title={t('downloads.families.none')} className="empty-state-sm" />
      ) : null}
      {rows && rows.length > 0 ? (
        <SubTable
          columns={COLUMNS}
          rows={sorted}
          rowKey={rowKey}
          rowProp="family"
          RowActions={FamilyRowActions}
          actionsProps={{ ctx: tableCtx }}
          sort={sort}
          onSort={(column, options) => setSort(current => nextSort(current, column, options))}
          hiddenColumns={NO_HIDDEN}
          ctx={tableCtx}
          emptyText={t('downloads.families.none')}
        />
      ) : null}
    </div>
  );
};

FamiliesPane.propTypes = {
  org: PropTypes.string.isRequired,
  ctx: PropTypes.shape({
    reload: PropTypes.func.isRequired,
    notify: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default FamiliesPane;
