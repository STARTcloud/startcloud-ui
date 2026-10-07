import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaDownload } from 'react-icons/fa6';

import { itemShape } from '../../../utils/itemShape';
import { deployableVersion } from '../../deploy';
import { versionKeyOf } from '../utils/hostCatalog';

const installCtxShape = PropTypes.shape({
  installedKeys: PropTypes.instanceOf(Set).isRequired,
  busy: PropTypes.bool.isRequired,
  onInstall: PropTypes.func.isRequired,
});

/**
 * One version's place on the host's catalog: Installed while the host
 * holds that version of the family, else Install, which hands the family
 * and the version to `ctx.onInstall`, held while `ctx.busy`.
 */
export const VersionInstall = ({ item, version, ctx }) => {
  const { t } = useTranslation();
  if (!version) {
    return null;
  }
  if (ctx.installedKeys.has(versionKeyOf(item.name, version))) {
    return (
      <span className="badge text-bg-success" data-note="installed" data-version={version}>
        {t('host.provisionerManagement.installed')}
      </span>
    );
  }
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-primary"
      data-action="catalog-install"
      data-family={item.name}
      data-version={version}
      title={t('host.provisionerManagement.installVersionTitle')}
      onClick={() => ctx.onInstall(item.name, version)}
      disabled={ctx.busy}
    >
      <FaDownload className="me-2" aria-hidden="true" />
      {t('host.provisionerManagement.install')}
    </button>
  );
};

VersionInstall.propTypes = {
  item: itemShape.isRequired,
  version: PropTypes.string.isRequired,
  ctx: installCtxShape.isRequired,
};

/**
 * The column of the host's catalog in the Deploy column's place: the
 * newest deployable version's Install, or Installed.
 */
export const installColumn = {
  key: 'install',
  kind: 'badge',
  labelKey: 'pages.table.install',
  priority: 2,
  value: item => deployableVersion(item.versions),
  render: (item, ctx) => (
    <VersionInstall item={item} version={deployableVersion(item.versions)} ctx={ctx} />
  ),
};

/**
 * The card glyph of the host's catalog, the install column's cell.
 */
export const InstallGlyph = ({ item, ctx }) => installColumn.render(item, ctx);

InstallGlyph.propTypes = {
  item: itemShape.isRequired,
  ctx: installCtxShape.isRequired,
};
