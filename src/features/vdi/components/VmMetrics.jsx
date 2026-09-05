import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaArrowUpRightFromSquare } from 'react-icons/fa6';

export const grafanaShape = PropTypes.shape({
  enabled: PropTypes.bool.isRequired,
  base_url: PropTypes.string.isRequired,
  dashboard_uid: PropTypes.string.isRequired,
  vm_var: PropTypes.string.isRequired,
  panels: PropTypes.arrayOf(PropTypes.number).isRequired,
});

const dashboardUrl = ({ grafana, hostname, theme }) =>
  `${grafana.base_url}/d/${grafana.dashboard_uid}/?var-${grafana.vm_var}=${encodeURIComponent(hostname)}&theme=${theme}`;

const panelUrl = ({ grafana, hostname, theme, panel }) =>
  `${grafana.base_url}/d-solo/${grafana.dashboard_uid}/?orgId=1&var-${grafana.vm_var}=${encodeURIComponent(hostname)}&panelId=${panel}&theme=${theme}&refresh=30s&kiosk&hideLogo=true`;

/**
 * The Grafana panels of one VM while the host's Grafana settings are
 * enabled: the Open in Grafana link to the dashboard filtered to the
 * hostname, then one embedded panel per configured id in the app's theme,
 * or a note that none is configured; nothing while Grafana is disabled.
 */
const VmMetrics = ({ vm, grafana, theme }) => {
  const { t } = useTranslation();
  if (!grafana.enabled) {
    return null;
  }
  const { hostname } = vm;
  return (
    <div>
      <div className="mb-3">
        <a
          href={dashboardUrl({ grafana, hostname, theme })}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-2"
        >
          {t('vdi.metrics.open')}
          <FaArrowUpRightFromSquare aria-hidden />
        </a>
      </div>
      {grafana.panels.length > 0 ? (
        <div className="row row-cols-1 row-cols-lg-2 g-3">
          {grafana.panels.map(panel => (
            <div key={panel} className="col">
              <iframe
                className="metrics-panel rounded border"
                src={panelUrl({ grafana, hostname, theme, panel })}
                title={t('vdi.metrics.panel', { id: panel })}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-body-secondary small">{t('vdi.metrics.noPanels')}</div>
      )}
    </div>
  );
};

VmMetrics.propTypes = {
  vm: PropTypes.object.isRequired,
  grafana: grafanaShape.isRequired,
  theme: PropTypes.string.isRequired,
};

export default VmMetrics;
