import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import RecordRows from '../../../components/common/RecordRows';

import ToolFormDialog from './ToolFormDialog';

const DETAILS = {
  install: {
    titleKey: 'host.packageActionModal.installPackage',
    descriptionKey: 'host.packageActionModal.installPackageDescription',
    warningKey: 'host.packageActionModal.installWarning',
    variant: 'success',
  },
  uninstall: {
    titleKey: 'host.packageActionModal.uninstallPackage',
    descriptionKey: 'host.packageActionModal.uninstallPackageDescription',
    warningKey: 'host.packageActionModal.uninstallWarning',
    variant: 'danger',
  },
};

/**
 * The dialog of a package install or uninstall, hyperweaver-ui's: the
 * package's name, publisher and version, the action's sentence and its
 * warning, the dry run switch, the accept licenses switch on an install
 * and the boot environment's name; the submit hands the options up.
 */
const PackageActionModal = ({ pkg, action, busy, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [options, setOptions] = useState({ dryRun: false, acceptLicenses: false, beName: '' });
  const details = DETAILS[action];
  const rows = [
    {
      key: 'name',
      label: t('host.packageActionModal.packageName'),
      value: <span className="font-monospace">{pkg.name}</span>,
    },
    {
      key: 'publisher',
      label: t('host.packageActionModal.publisher'),
      value: (
        <span className="badge text-bg-info">
          {pkg.publisher || t('host.packageActionModal.unknown')}
        </span>
      ),
    },
    {
      key: 'version',
      label: t('host.packageActionModal.version'),
      value: (
        <span className="font-monospace">{pkg.version || t('host.packageActionModal.latest')}</span>
      ),
    },
  ];
  return (
    <ToolFormDialog
      dialog={`package-${action}`}
      title={t(details.titleKey)}
      submitKey={details.titleKey}
      variant={details.variant}
      busy={busy}
      onClose={onClose}
      onSubmit={() => onConfirm(options)}
    >
      <h6 className="fw-bold">{t('host.packageActionModal.packageInformation')}</h6>
      <RecordRows rows={rows} />
      <div className="alert alert-info" role="note">
        <p className="mb-1">
          <strong>{t('host.packageActionModal.action')}</strong>{' '}
          {t(details.descriptionKey, { name: pkg.name })}
        </p>
        <p className="mb-0">{t(details.warningKey)}</p>
      </div>
      <h6 className="fw-bold">{t('host.packageActionModal.options')}</h6>
      <div className="form-check mb-2">
        <input
          id="package-dry-run"
          className="form-check-input"
          type="checkbox"
          checked={options.dryRun}
          onChange={event => setOptions(current => ({ ...current, dryRun: event.target.checked }))}
        />
        <label className="form-check-label" htmlFor="package-dry-run">
          <strong>{t('host.packageActionModal.dryRun')}</strong> -{' '}
          {t('host.packageActionModal.dryRunDescription')}
        </label>
      </div>
      {action === 'install' ? (
        <div className="form-check mb-2">
          <input
            id="package-accept-licenses"
            className="form-check-input"
            type="checkbox"
            checked={options.acceptLicenses}
            onChange={event =>
              setOptions(current => ({ ...current, acceptLicenses: event.target.checked }))
            }
          />
          <label className="form-check-label" htmlFor="package-accept-licenses">
            <strong>{t('host.packageActionModal.acceptLicenses')}</strong> -{' '}
            {t('host.packageActionModal.acceptLicensesDescription')}
          </label>
        </div>
      ) : null}
      <div className="mb-2">
        <label className="form-label" htmlFor="package-be-name">
          {t('host.packageActionModal.bootEnvironmentName')}
        </label>
        <input
          id="package-be-name"
          className="form-control"
          type="text"
          placeholder={t('host.packageActionModal.leaveEmptyToUseDefault')}
          value={options.beName}
          onChange={event => setOptions(current => ({ ...current, beName: event.target.value }))}
        />
        <p className="form-text text-muted mb-0">
          {t('host.packageActionModal.bootEnvironmentDescription')}
        </p>
      </div>
    </ToolFormDialog>
  );
};

PackageActionModal.propTypes = {
  pkg: PropTypes.shape({
    name: PropTypes.string,
    publisher: PropTypes.string,
    version: PropTypes.string,
  }).isRequired,
  action: PropTypes.oneOf(['install', 'uninstall']).isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default PackageActionModal;
