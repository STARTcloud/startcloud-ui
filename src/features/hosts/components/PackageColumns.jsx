import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  FaCircle,
  FaCircleCheck,
  FaCircleInfo,
  FaDownload,
  FaSnowflake,
  FaStar,
  FaTrash,
} from 'react-icons/fa6';

import {
  PACKAGE_PUBLISHERS,
  PACKAGE_STATUSES,
  formatPackageSize,
  packageActionOf,
  packageBadgeOf,
  packageStatuses,
} from '../utils/manageCatalog';

const BADGE_KEYS = {
  manual: 'host.packageTable.manual',
  installed: 'host.packageTable.installed',
  frozen: 'host.packageTable.frozen',
  available: 'host.packageTable.available',
  notInstalled: 'host.packageTable.notInstalled',
};

const STATUS_KEYS = {
  installed: 'host.packageFilters.installed',
  frozen: 'host.packageFilters.frozen',
  manual: 'host.packageFilters.manual',
};

const ACTIONS = {
  install: { Icon: FaDownload, tone: 'success', labelKey: 'host.packageTable.install' },
  uninstall: { Icon: FaTrash, tone: 'danger', labelKey: 'host.packageTable.uninstall' },
};

const StatusGlyph = ({ pkg }) => {
  if (pkg.installed && pkg.manually_installed) {
    return <FaStar className="text-warning me-2" aria-hidden="true" />;
  }
  if (pkg.installed) {
    return <FaCircleCheck className="text-success me-2" aria-hidden="true" />;
  }
  if (pkg.frozen) {
    return <FaSnowflake className="text-info me-2" aria-hidden="true" />;
  }
  return <FaCircle className="text-muted me-2" aria-hidden="true" />;
};

StatusGlyph.propTypes = {
  pkg: PropTypes.object.isRequired,
};

/**
 * The columns of the packages table, hyperweaver-ui's: the package with
 * the glyph of its state, the publisher as a badge, the version, the
 * status badge and the size.
 */
export const PACKAGE_COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'host.packageTable.package',
    value: row => row.name || '',
    render: row => (
      <span>
        <StatusGlyph pkg={row} />
        <strong className="font-monospace">{row.name}</strong>
      </span>
    ),
  },
  {
    key: 'publisher',
    kind: 'badge',
    labelKey: 'host.packageTable.publisher',
    value: row => row.publisher || '',
    render: (row, ctx) => (
      <span className="badge text-bg-info">
        {row.publisher || ctx.t('host.packageTable.unknown')}
      </span>
    ),
  },
  {
    key: 'version',
    kind: 'text',
    labelKey: 'host.packageTable.version',
    priority: 4,
    value: row => row.version || '',
    render: (row, ctx) => (
      <span className="font-monospace small">
        {row.version || ctx.t('host.packageTable.notAvailable')}
      </span>
    ),
  },
  {
    key: 'status',
    kind: 'badge',
    labelKey: 'host.packageTable.status',
    value: row => packageBadgeOf(row, Boolean(row.remote)).key,
    render: (row, ctx) => {
      const badge = packageBadgeOf(row, Boolean(row.remote));
      return <span className={`badge text-bg-${badge.tone}`}>{ctx.t(BADGE_KEYS[badge.key])}</span>;
    },
  },
  {
    key: 'size',
    kind: 'text',
    labelKey: 'host.packageTable.size',
    priority: 5,
    value: row => formatPackageSize(row.size),
    render: (row, ctx) => formatPackageSize(row.size) || ctx.t('host.packageTable.notAvailable'),
  },
];

/**
 * The filter groups of the packages table, hyperweaver-ui's publisher
 * and status selects, the two it applied on the client.
 */
export const PACKAGE_FILTERS = [
  {
    key: 'publisher',
    labelKey: 'host.packageFilters.filterByPublisher',
    kind: 'select',
    values: row => [row.publisher || ''],
    order: PACKAGE_PUBLISHERS,
    activeClass: 'bg-primary',
    labelFor: value => value,
  },
  {
    key: 'status',
    labelKey: 'host.packageFilters.filterByStatus',
    kind: 'select',
    values: packageStatuses,
    order: PACKAGE_STATUSES,
    activeClass: 'bg-primary',
    labelFor: (value, t) => (STATUS_KEYS[value] ? t(STATUS_KEYS[value]) : value),
  },
];

/**
 * The actions of one row of the packages table, hyperweaver-ui's: Install
 * or Uninstall by the package's state and View details.
 */
export const PackageRowActions = ({ row, busy, onAction }) => {
  const { t } = useTranslation();
  const action = packageActionOf(row);
  const spec = action ? ACTIONS[action] : null;
  return (
    <span className="d-inline-flex align-items-center gap-1" data-package={row.name}>
      {spec ? (
        <button
          type="button"
          className={`btn btn-sm btn-${spec.tone}`}
          title={t(spec.labelKey)}
          aria-label={t(spec.labelKey)}
          data-action={action}
          disabled={busy}
          onClick={() => onAction(action, row)}
        >
          <spec.Icon aria-hidden="true" />
        </button>
      ) : null}
      <button
        type="button"
        className="btn btn-sm btn-secondary"
        title={t('host.packageTable.viewDetails')}
        aria-label={t('host.packageTable.viewDetails')}
        data-action="details"
        disabled={busy}
        onClick={() => onAction('details', row)}
      >
        <FaCircleInfo aria-hidden="true" />
      </button>
    </span>
  );
};

PackageRowActions.propTypes = {
  row: PropTypes.shape({ name: PropTypes.string }).isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};
