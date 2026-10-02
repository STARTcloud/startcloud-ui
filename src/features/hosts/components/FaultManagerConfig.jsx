import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  FaCircleCheck,
  FaDatabase,
  FaGear,
  FaHardDrive,
  FaMicrochip,
  FaNetworkWired,
} from 'react-icons/fa6';

import RecordRows from '../../../components/common/RecordRows';
import { moduleGlyph, moduleType, moduleWords } from '../utils/FaultUtils';

import ManageTable from './ManageTable';

const GLYPHS = {
  chip: FaMicrochip,
  disk: FaHardDrive,
  database: FaDatabase,
  network: FaNetworkWired,
  gear: FaGear,
};

const ModuleGlyph = ({ module }) => {
  const Icon = GLYPHS[moduleGlyph(module)];
  return <Icon className="text-info me-2" aria-hidden="true" />;
};

ModuleGlyph.propTypes = {
  module: PropTypes.string,
};

/**
 * The columns of the fault manager modules table, hyperweaver-ui's: the
 * module with its glyph, the version as a badge, the description and the
 * type as a badge in its tone.
 */
export const MODULE_COLUMNS = [
  {
    key: 'module',
    kind: 'name',
    labelKey: 'host.faultManagerConfig.thModule',
    value: row => row.module || '',
    render: row => (
      <span>
        <ModuleGlyph module={row.module} />
        <span className="font-monospace fw-semibold">{row.module}</span>
      </span>
    ),
  },
  {
    key: 'version',
    kind: 'badge',
    labelKey: 'host.faultManagerConfig.thVersion',
    priority: 4,
    value: row => row.version || '',
    render: row => <span className="badge text-bg-secondary">v{row.version}</span>,
  },
  {
    key: 'description',
    kind: 'text',
    labelKey: 'host.faultManagerConfig.thDescription',
    prose: true,
    priority: 5,
    value: row => row.description || '',
    render: (row, ctx) => (
      <span className="small">
        {row.description || ctx.t('host.faultManagerConfig.noDescription')}
      </span>
    ),
  },
  {
    key: 'type',
    kind: 'badge',
    labelKey: 'host.faultManagerConfig.thType',
    value: row => moduleType(row.module).type,
    render: (row, ctx) => {
      const type = moduleType(row.module);
      return <span className={`badge text-bg-${type.tone}`}>{ctx.t(type.key)}</span>;
    },
  },
];

const HELP = [
  ['cpumem-retire', 'cpumemRetireDesc'],
  ['disk-retire', 'diskRetireDesc'],
  ['zfs-retire', 'zfsRetireDesc'],
];

const TYPES = ['retireAgents', 'detectors', 'responseAgents'];

/**
 * The fault manager's configuration, hyperweaver-ui's
 * `FaultManagerConfig` as the configuration tab of the Manage page's
 * Fault management section: the status, the count of modules, their
 * types and the active badge, the modules over the one table the page's
 * binding left, and the help; the modules read with the page and again
 * on its Refresh.
 */
const FaultManagerConfig = ({ ctx, table, reading, filtering, modules }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="card mb-3" data-panel="fault-manager-status">
        <div className="card-body">
          <h6 className="fw-bold">{t('host.faultManagerConfig.faultManagerStatus')}</h6>
          <RecordRows
            rows={[
              {
                key: 'total',
                label: t('host.faultManagerConfig.totalModules'),
                value: <span className="badge text-bg-info">{modules.length}</span>,
              },
              {
                key: 'types',
                label: t('host.faultManagerConfig.moduleTypes'),
                value: (
                  <span className="d-inline-flex flex-wrap gap-1">
                    {moduleWords(modules).map(word => (
                      <span key={word} className="badge text-bg-secondary">
                        {word}
                      </span>
                    ))}
                  </span>
                ),
              },
              {
                key: 'status',
                label: t('host.faultManagerConfig.status'),
                value: (
                  <span className="badge text-bg-success d-inline-flex align-items-center gap-1">
                    <FaCircleCheck aria-hidden="true" />
                    <span>{t('host.faultManagerConfig.active')}</span>
                  </span>
                ),
              },
            ]}
            className="mb-0"
          />
        </div>
      </div>
      <h6 className="fw-bold">{t('host.faultManagerConfig.faultManagementModules')}</h6>
      <ManageTable
        name="fault-modules"
        columns={MODULE_COLUMNS}
        table={table}
        rowKey={row => row.module}
        ctx={ctx}
        emptyKey="host.faultManagerConfig.noModulesFound"
        reading={reading}
        filtering={filtering}
      />
      <div className="card mt-3" data-panel="fault-manager-help">
        <div className="card-body small">
          <h6 className="fw-bold">{t('host.faultManagerConfig.faultManagerInformation')}</h6>
          <div className="row g-3">
            <div className="col-md-6">
              <p className="fw-semibold mb-1">{t('host.faultManagerConfig.commonModules')}</p>
              <ul className="mb-0">
                {HELP.map(([module, key]) => (
                  <li key={module}>
                    <strong>{module}:</strong> {t(`host.faultManagerConfig.${key}`)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="col-md-6">
              <p className="fw-semibold mb-1">{t('host.faultManagerConfig.moduleTypesTitle')}</p>
              <ul className="mb-0">
                {TYPES.map(type => (
                  <li key={type}>
                    <strong>{t(`host.faultManagerConfig.${type}Label`)}</strong>{' '}
                    {t(`host.faultManagerConfig.${type}Desc`)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

FaultManagerConfig.propTypes = {
  ctx: PropTypes.object.isRequired,
  table: PropTypes.object.isRequired,
  reading: PropTypes.shape({
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
  modules: PropTypes.array.isRequired,
};

export default FaultManagerConfig;
