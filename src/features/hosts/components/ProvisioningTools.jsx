import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const toneOf = tool => {
  if (tool.installed) {
    return 'text-bg-success';
  }
  return tool.soft ? 'text-bg-warning' : 'text-bg-danger';
};

const titleKeyOf = tool => {
  if (tool.installed) {
    return 'hosts.overview.toolInstalled';
  }
  return tool.soft ? 'hosts.overview.toolMissingSoft' : 'hosts.overview.toolMissing';
};

/**
 * The provisioning tools a host answers as the value of one record row,
 * a badge a tool: success while it is installed, danger while it is
 * missing, and warning while rsync or scp is missing on an agent whose
 * built-in transport covers folder sync, the tooltip saying which; under
 * the badges the count of the tools provisioning fails without, while
 * any is missing.
 */
const ProvisioningTools = ({ tools, missing }) => {
  const { t } = useTranslation();
  return (
    <>
      <span className="d-flex flex-wrap gap-1">
        {tools.map(tool => (
          <span
            key={tool.name}
            className={`badge ${toneOf(tool)}`}
            title={t(titleKeyOf(tool), { tool: tool.name })}
          >
            {tool.name}
          </span>
        ))}
      </span>
      {missing > 0 ? (
        <span className="d-block small text-warning mt-1">
          {t('hosts.overview.toolsMissing', { count: missing })}
        </span>
      ) : null}
    </>
  );
};

ProvisioningTools.propTypes = {
  tools: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      installed: PropTypes.bool.isRequired,
      soft: PropTypes.bool.isRequired,
    })
  ).isRequired,
  missing: PropTypes.number.isRequired,
};

export default ProvisioningTools;
