import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { log } from '../../../lib/logger';
import { returnToShape } from '../../../utils/auth';
import { adminShape } from '../utils/adminShape';

import AdminConfig from './AdminConfig';
import AdminOrganizations from './AdminOrganizations';
import AdminStorage from './AdminStorage';
import UpdateNotice from './UpdateNotice';

const TAB_KEYS = {
  organizations: 'admin.tabs.orgsAndUsers',
  config: 'admin.tabs.configManagement',
  system: 'admin.tabs.system',
};

const tabsOf = admin => [
  ...(admin.organizationsWithUsers ? ['organizations'] : []),
  'config',
  ...(admin.storage ? ['system'] : []),
];

/**
 * The admin page of an app with configuration of its own: the update
 * notice when the app's `updateStatus` reports one, then the
 * Organizations and users tab while the adapter carries
 * `organizationsWithUsers`, the Configuration tab, and the System tab
 * while the adapter carries `storage`, every call through the app's
 * `admin` adapter; a visitor is sent to sign in and a signed-in non-admin
 * home, `allowed` being the app's global-admin flag.
 */
const AdminPage = ({ session, returnTo, allowed, admin, activeOrgKey, updateCommand }) => {
  const { t } = useTranslation();
  useEffect(() => {
    document.title = t('admin.pageTitle');
  }, [t]);

  const navigate = useNavigate();
  const tabs = tabsOf(admin);
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [updateInfo, setUpdateInfo] = useState(null);

  useEffect(() => {
    if (!session.restore()) {
      navigate(returnTo.signInTo('/admin'));
      return;
    }
    if (!allowed) {
      navigate('/');
      return;
    }
    admin
      .updateStatus()
      .then(status => {
        if (status.isAptManaged && status.updateAvailable) {
          setUpdateInfo(status);
        }
      })
      .catch(error => {
        log.api.error('Failed to check for updates', { error: error.message });
      });
  }, [admin, allowed, navigate, returnTo, session]);

  return (
    <div className="list row">
      <header>
        <h3 className="text-center">{t('admin.title')}</h3>
      </header>
      {updateInfo && <UpdateNotice updateInfo={updateInfo} command={updateCommand} />}
      <ul className="nav nav-tabs">
        {tabs.map(tab => (
          <li className="nav-item" key={tab}>
            <button
              type="button"
              className={`nav-link ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {t(TAB_KEYS[tab])}
            </button>
          </li>
        ))}
      </ul>
      <div className="tab-content mt-2">
        {activeTab === 'organizations' && admin.organizationsWithUsers ? (
          <AdminOrganizations session={session} activeOrgKey={activeOrgKey} admin={admin} />
        ) : null}
        {activeTab === 'config' ? <AdminConfig config={admin.config} /> : null}
        {activeTab === 'system' && admin.storage ? <AdminStorage storage={admin.storage} /> : null}
      </div>
    </div>
  );
};

AdminPage.propTypes = {
  session: PropTypes.object.isRequired,
  returnTo: returnToShape.isRequired,
  allowed: PropTypes.bool.isRequired,
  admin: adminShape.isRequired,
  activeOrgKey: PropTypes.string.isRequired,
  updateCommand: PropTypes.string.isRequired,
};

export default AdminPage;
