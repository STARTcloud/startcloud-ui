import PropTypes from 'prop-types';
import { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaCheck,
  FaPenToSquare,
  FaPlus,
  FaStar,
  FaToggleOff,
  FaToggleOn,
  FaTrash,
} from 'react-icons/fa6';

import SubTable, { hasAny } from '../../../components/common/SubTable';
import { nextSort, sortItems } from '../../../utils/sort';

const NO_HIDDEN = new Set();

const check = on => (on ? <FaCheck className="text-success" aria-hidden="true" /> : null);

const COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'host.templatesManagement.name',
    value: row => row.name,
    render: row => <span className="fw-semibold">{row.name}</span>,
  },
  {
    key: 'key',
    kind: 'word',
    labelKey: 'hosts.manage.sources.key',
    value: row => row.key,
    render: row => <code className="checksum">{row.key}</code>,
  },
  {
    key: 'url',
    kind: 'text',
    labelKey: 'hosts.manage.sources.url',
    value: row => row.url,
    render: row => <span className="text-body-secondary">{row.url}</span>,
  },
  {
    key: 'default',
    kind: 'badge',
    labelKey: 'hosts.manage.sources.default',
    value: row => (row.isDefault ? 1 : 0),
    render: row => check(row.isDefault),
  },
  {
    key: 'enabled',
    kind: 'badge',
    labelKey: 'hosts.manage.sources.enabled',
    when: hasAny(row => typeof row.enabled === 'boolean'),
    value: row => (row.enabled ? 1 : 0),
    render: row => check(row.enabled),
  },
];

const rowShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
  isDefault: PropTypes.bool.isRequired,
  enabled: PropTypes.bool,
  source: PropTypes.object.isRequired,
});

const offersShape = PropTypes.shape({
  default: PropTypes.bool,
  toggle: PropTypes.bool,
  edit: PropTypes.bool,
  remove: PropTypes.bool,
});

const SourceActions = ({ row, offers, busy, onAction }) => {
  const { t } = useTranslation();
  const disabled = row.enabled === false;
  return (
    <span className="d-inline-flex gap-1" data-source={row.key}>
      {offers.default && !row.isDefault ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-success py-0"
          title={t('host.templatesManagement.makeDefaultRegistry')}
          aria-label={t('host.templatesManagement.makeDefaultRegistry')}
          data-action="source-default"
          onClick={() => onAction('default', row.source)}
          disabled={busy}
        >
          <FaStar aria-hidden="true" />
        </button>
      ) : null}
      {offers.toggle ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary py-0"
          title={t(
            disabled ? 'host.templatesManagement.enable' : 'host.templatesManagement.disable'
          )}
          aria-label={t(
            disabled ? 'host.templatesManagement.enable' : 'host.templatesManagement.disable'
          )}
          data-action="source-toggle"
          onClick={() => onAction('toggle', row.source)}
          disabled={busy}
        >
          {disabled ? <FaToggleOff aria-hidden="true" /> : <FaToggleOn aria-hidden="true" />}
        </button>
      ) : null}
      {offers.edit ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-warning py-0"
          title={t('host.templatesManagement.edit')}
          aria-label={t('host.templatesManagement.edit')}
          data-action="source-edit"
          onClick={() => onAction('edit', row.source)}
          disabled={busy}
        >
          <FaPenToSquare aria-hidden="true" />
        </button>
      ) : null}
      {offers.remove ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-danger py-0"
          title={t('host.templatesManagement.removeRegistry')}
          aria-label={t('host.templatesManagement.removeRegistry')}
          data-action="source-remove"
          onClick={() => onAction('remove', row.source)}
          disabled={busy}
        >
          <FaTrash aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
};

SourceActions.propTypes = {
  row: rowShape.isRequired,
  offers: offersShape.isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};

/**
 * The form drawn under the sources table while Add or Edit is pressed:
 * its heading, the sentence that says why it cannot be sent while
 * `problemKey` names one, the fields, then Cancel and Save, both held
 * while `busy`; the form carries `dialog` as `data-dialog`.
 */
export const InlineForm = ({
  dialog,
  title,
  problemKey = '',
  busy,
  onCancel,
  onSubmit,
  children,
}) => {
  const { t } = useTranslation();
  return (
    <form
      className="source-form border-top mt-3 pt-3"
      data-dialog={dialog}
      noValidate
      onSubmit={event => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <h3 className="h6 mb-3">{title}</h3>
      {problemKey ? (
        <div className="alert alert-danger" role="alert" data-note="problem">
          {t(problemKey)}
        </div>
      ) : null}
      {children}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
          {t('pages.confirm.cancel')}
        </button>
        <button type="submit" className="btn btn-primary" data-action="submit" disabled={busy}>
          {t('host.templatesManagement.save')}
        </button>
      </div>
    </form>
  );
};

InlineForm.propTypes = {
  dialog: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  problemKey: PropTypes.string,
  busy: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

/**
 * The one modal of a host's catalog sources and box registries: the
 * title and the close button, a heading pane with `label` and the Add
 * press at its right, the one table of the rows, Name, Key, URL, Default
 * and, while a row carries it, Enabled, each row's actions among Make
 * default, Enable or Disable, Edit and Remove as `offers` says, and under
 * the table the `form` the page gives while Add or Edit is pressed, so
 * no dialog opens over the modal. `kind` names the modal's `data-dialog`,
 * `<kind>-sources`, and `addAction` the Add press's `data-action`.
 */
const SourcesModal = ({
  kind,
  title,
  label,
  addLabelKey,
  addAction,
  emptyKey,
  rows,
  offers,
  busy,
  form = null,
  onAdd,
  onAction,
  onClose,
}) => {
  const { t } = useTranslation();
  const [sort, setSort] = useState([]);
  const ctx = { t };
  const acts = Object.values(offers).some(Boolean);
  return (
    <Modal show onHide={onClose} dialogClassName="form-modal" scrollable>
      <Modal.Header closeButton>
        <Modal.Title as="h5">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body data-dialog={`${kind}-sources`}>
        <div className="d-flex align-items-center gap-2">
          <span className="fw-semibold">{label}</span>
          <span className="ms-auto">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              data-action={addAction}
              onClick={onAdd}
              disabled={busy}
            >
              <FaPlus className="me-1" aria-hidden="true" />
              {t(addLabelKey)}
            </button>
          </span>
        </div>
        <SubTable
          columns={COLUMNS}
          rows={sortItems(rows, sort, COLUMNS, ctx)}
          rowKey={row => row.key}
          rowId={row => `source-${row.key}`}
          RowActions={acts ? SourceActions : null}
          actionsProps={{ offers, busy, onAction }}
          sort={sort}
          onSort={(column, options) => setSort(current => nextSort(current, column, options))}
          hiddenColumns={NO_HIDDEN}
          ctx={ctx}
          emptyText={t(emptyKey)}
        />
        {form}
      </Modal.Body>
    </Modal>
  );
};

SourcesModal.propTypes = {
  kind: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  addLabelKey: PropTypes.string.isRequired,
  addAction: PropTypes.string.isRequired,
  emptyKey: PropTypes.string.isRequired,
  rows: PropTypes.arrayOf(rowShape).isRequired,
  offers: offersShape.isRequired,
  busy: PropTypes.bool.isRequired,
  form: PropTypes.node,
  onAdd: PropTypes.func.isRequired,
  onAction: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SourcesModal;
