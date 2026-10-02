import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  FaBoxArchive,
  FaFileZipper,
  FaFolder,
  FaGear,
  FaPen,
  FaUpRightAndDownLeftFromCenter,
} from 'react-icons/fa6';

import { filesInDirectory, isArchiveFile, isTextFile } from '../../utils/fileManager';

const ToolButton = ({ action, tone, Icon, label, disabled, onClick }) => (
  <button
    type="button"
    className={`btn btn-sm btn-outline-${tone}`}
    data-action={action}
    title={label}
    disabled={disabled}
    onClick={onClick}
  >
    <Icon className="me-1" aria-hidden="true" />
    {label}
  </button>
);

ToolButton.propTypes = {
  action: PropTypes.string.isRequired,
  tone: PropTypes.string.isRequired,
  Icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  disabled: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

/**
 * The bar over the file manager, hyperweaver-ui's action bar and the
 * toolbar buttons its cubone extensions drew: the current directory as
 * a badge, and for the selection Edit while the one file is text,
 * Extract while it is an archive, Properties for one file, Archive for
 * the selection, and Archive directory for everything in the current
 * directory; every button held while a request is in flight and drawn
 * for a person the permissions allow.
 */
const HostFileManagerActionBar = ({
  currentPath,
  files,
  selected,
  permissions,
  busy,
  onEdit,
  onExtract,
  onProperties,
  onArchive,
}) => {
  const { t } = useTranslation();
  const one = selected.length === 1 ? selected[0] : null;
  const inDirectory = filesInDirectory(files, currentPath);
  return (
    <div
      className="d-flex align-items-center flex-wrap gap-2 mb-3"
      data-panel="file-manager-actions"
      data-path={currentPath}
    >
      <span className="badge text-bg-info d-inline-flex align-items-center gap-1">
        <FaFolder aria-hidden="true" />
        <span>{t('fileManager.hostFileManagerActionBar.current', { path: currentPath })}</span>
      </span>
      <span className="d-inline-flex align-items-center flex-wrap gap-2 ms-auto">
        {permissions.edit && one && isTextFile(one) ? (
          <ToolButton
            action="edit"
            tone="primary"
            Icon={FaPen}
            label={t('fileManager.cuboneExtensions.edit')}
            disabled={busy}
            onClick={() => onEdit(one)}
          />
        ) : null}
        {permissions.archive && one && isArchiveFile(one) ? (
          <ToolButton
            action="extract"
            tone="success"
            Icon={FaUpRightAndDownLeftFromCenter}
            label={t('fileManager.cuboneExtensions.extract')}
            disabled={busy}
            onClick={() => onExtract(one)}
          />
        ) : null}
        {permissions.properties && one ? (
          <ToolButton
            action="properties"
            tone="secondary"
            Icon={FaGear}
            label={t('fileManager.cuboneExtensions.properties')}
            disabled={busy}
            onClick={() => onProperties(one)}
          />
        ) : null}
        {permissions.archive ? (
          <ToolButton
            action="archive-selection"
            tone="info"
            Icon={FaFileZipper}
            label={
              selected.length > 0
                ? t('fileManager.hostFileManagerActionBar.archiveCount', { count: selected.length })
                : t('fileManager.hostFileManagerActionBar.archive')
            }
            disabled={busy || selected.length === 0}
            onClick={() => onArchive(selected)}
          />
        ) : null}
        {permissions.archive ? (
          <ToolButton
            action="archive-directory"
            tone="success"
            Icon={FaBoxArchive}
            label={t('fileManager.hostFileManagerActionBar.archiveDirectory')}
            disabled={busy || inDirectory.length === 0}
            onClick={() => onArchive(inDirectory)}
          />
        ) : null}
      </span>
    </div>
  );
};

HostFileManagerActionBar.propTypes = {
  currentPath: PropTypes.string.isRequired,
  files: PropTypes.array.isRequired,
  selected: PropTypes.array.isRequired,
  permissions: PropTypes.objectOf(PropTypes.bool).isRequired,
  busy: PropTypes.bool.isRequired,
  onEdit: PropTypes.func.isRequired,
  onExtract: PropTypes.func.isRequired,
  onProperties: PropTypes.func.isRequired,
  onArchive: PropTypes.func.isRequired,
};

export default HostFileManagerActionBar;
