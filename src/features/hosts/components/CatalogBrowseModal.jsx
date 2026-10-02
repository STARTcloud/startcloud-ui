import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaDownload } from 'react-icons/fa6';

import { useStatus } from '../../../contexts/StatusContext';
import { fetchCatalog, fetchCatalogSources } from '../api/provisioning';
import { useManageRead } from '../hooks/useHostManage';

import { DialogTable } from './ManageTable';

const VERSION_COLUMNS = [
  {
    key: 'version',
    kind: 'name',
    labelKey: 'host.provisionerManagement.version',
    value: row => row.version || '',
    render: (row, ctx) => (
      <span>
        <code className="small">{row.version}</code>
        {ctx.installedKeys.has(`${row.family}/${row.version}`) ? (
          <span className="badge text-bg-success ms-2" data-note="installed">
            {ctx.t('host.provisionerManagement.installed')}
          </span>
        ) : null}
      </span>
    ),
  },
];

const InstallButton = ({ row, ctx, busy, onInstall }) => {
  const { t } = useTranslation();
  const installed = ctx.installedKeys.has(`${row.family}/${row.version}`);
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-primary"
      data-action="catalog-install"
      onClick={() => onInstall(row.family, row.version)}
      disabled={installed || busy}
      title={t(
        installed
          ? 'host.provisionerManagement.alreadyInstalledTitle'
          : 'host.provisionerManagement.installVersionTitle'
      )}
    >
      <FaDownload className="me-2" aria-hidden="true" />
      {t('host.provisionerManagement.install')}
    </button>
  );
};

InstallButton.propTypes = {
  row: PropTypes.shape({ family: PropTypes.string, version: PropTypes.string }).isRequired,
  ctx: PropTypes.shape({ installedKeys: PropTypes.instanceOf(Set).isRequired }).isRequired,
  busy: PropTypes.bool.isRequired,
  onInstall: PropTypes.func.isRequired,
};

const versionRows = family =>
  (Array.isArray(family.versions) ? family.versions : []).map(version => ({
    family: family.name,
    version: version.version,
  }));

/**
 * The catalog browser, hyperweaver-ui's: the catalog the agent relays,
 * a source select while it carries more than one catalog source, one
 * card a family with its repository and description and its versions
 * over the one table, the installed ones badged, Install on each other
 * sending `POST provisioning/catalog/install`, a queued task followed
 * to its end.
 */
const CatalogBrowseModal = ({ id, ctx, installedKeys, busy, onInstall, onClose }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [source, setSource] = useState('');
  const sources = useManageRead(
    useCallback(() => fetchCatalogSources(status, id), [status, id]),
    true
  );
  const catalog = useManageRead(
    useCallback(() => fetchCatalog(status, id, source), [status, id, source]),
    true
  );
  const sourceRows = Array.isArray(sources.data?.sources) ? sources.data.sources : [];
  const families = Array.isArray(catalog.data?.provisioners) ? catalog.data.provisioners : [];
  const tableCtx = { ...ctx, installedKeys };

  return (
    <Modal show onHide={onClose} dialogClassName="list-modal" scrollable>
      <Modal.Header closeButton>
        <Modal.Title as="h5">{t('host.provisionerManagement.catalogTitle')}</Modal.Title>
      </Modal.Header>
      <Modal.Body data-dialog="provisioner-catalog">
        {sourceRows.length > 1 ? (
          <div className="mb-3">
            <label className="form-label" htmlFor="catalog-source">
              {t('host.provisionerManagement.catalogSource')}
            </label>
            <select
              id="catalog-source"
              className="form-select"
              value={source}
              onChange={event => setSource(event.target.value)}
            >
              <option value="">{t('host.provisionerManagement.default')}</option>
              {sourceRows.map(entry => (
                <option key={entry.name} value={entry.name}>
                  {entry.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {catalog.failed ? (
          <div className="alert alert-danger py-2" role="alert" data-note="catalog-failed">
            {t('host.provisionerManagement.catalogFetchFailed', { message: catalog.message })}
          </div>
        ) : null}
        {catalog.loaded ? null : (
          <p className="text-muted mb-0">{t('host.provisionerManagement.fetchingCatalog')}</p>
        )}
        {catalog.loaded && !catalog.failed && families.length === 0 ? (
          <p className="text-muted mb-0">
            {t('host.provisionerManagement.noProvisionersInCatalog')}
          </p>
        ) : null}
        {families.map(family => (
          <div className="card mb-3" key={family.name} data-family={family.name}>
            <div className="card-body">
              <h6 className="fw-bold mb-1">{family.name}</h6>
              {family.repo ? (
                <code className="small text-muted d-block mb-1">{family.repo}</code>
              ) : null}
              {family.description ? (
                <p className="text-muted small mb-2">{family.description}</p>
              ) : null}
              {versionRows(family).length > 0 ? (
                <DialogTable
                  name={`catalog-${family.name}`}
                  columns={VERSION_COLUMNS}
                  rows={versionRows(family)}
                  rowKey={row => row.version}
                  RowActions={InstallButton}
                  actionsProps={{ ctx: tableCtx, busy, onInstall }}
                  ctx={tableCtx}
                  emptyText={t('host.provisionerManagement.noVersionsPublished')}
                />
              ) : (
                <p className="text-muted small mb-0">
                  {t('host.provisionerManagement.noVersionsPublished')}
                </p>
              )}
            </div>
          </div>
        ))}
      </Modal.Body>
    </Modal>
  );
};

CatalogBrowseModal.propTypes = {
  id: PropTypes.string.isRequired,
  ctx: PropTypes.object.isRequired,
  installedKeys: PropTypes.instanceOf(Set).isRequired,
  busy: PropTypes.bool.isRequired,
  onInstall: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default CatalogBrowseModal;
