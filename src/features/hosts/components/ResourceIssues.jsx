import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCircleExclamation, FaHardDrive, FaMemory, FaMicrochip } from 'react-icons/fa6';

const ICONS = {
  storage: FaHardDrive,
  memory: FaMemory,
  cpu: FaMicrochip,
};

const keyOf = issue => `${issue.resource || 'issue'}:${issue.message}`;

/**
 * What an agent that lacks the resources for a machine answers, its
 * 400's `details`, hyperweaver-ui's resource issue list: the sentence
 * that says resources are short and one line a detail, the glyph of its
 * resource, the storage, the memory or the processors, and the agent's
 * own message.
 */
const ResourceIssues = ({ issues }) => {
  const { t } = useTranslation();
  return (
    <div className="alert alert-danger" role="alert" data-list="resource-issues">
      <strong>{t('common.resourceIssueList.insufficientResources')}</strong>
      <ul className="list-unstyled mb-0 mt-1">
        {issues.map(issue => {
          const Icon = ICONS[issue.resource] || FaCircleExclamation;
          return (
            <li key={keyOf(issue)}>
              <Icon className="me-2" aria-hidden="true" />
              {issue.message}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

ResourceIssues.propTypes = {
  issues: PropTypes.arrayOf(
    PropTypes.shape({
      resource: PropTypes.string,
      message: PropTypes.string.isRequired,
    })
  ).isRequired,
};

export default ResourceIssues;
