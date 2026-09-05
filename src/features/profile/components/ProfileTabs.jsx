import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

/**
 * The tab strip of the profile page: one button per tab, the active one
 * marked, and a plain link for any entry carrying an `href`, such as the
 * link out to the identity provider's own profile page.
 */
const ProfileTabs = ({ tabs, activeTab, onChange }) => {
  const { t } = useTranslation();
  return (
    <ul className="nav nav-tabs">
      {tabs.map(tab => (
        <li key={tab.key} className="nav-item">
          {tab.href ? (
            <a className="nav-link" href={tab.href} target="_blank" rel="noopener noreferrer">
              {t(tab.labelKey)}
            </a>
          ) : (
            <button
              type="button"
              className={`nav-link ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => onChange(tab.key)}
            >
              {t(tab.labelKey)}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
};

ProfileTabs.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      labelKey: PropTypes.string.isRequired,
      href: PropTypes.string,
    })
  ).isRequired,
  activeTab: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default ProfileTabs;
