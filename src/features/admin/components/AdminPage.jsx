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

export const ADMIN_PAGES = ['organizations', 'config', 'system'];

/**
 * One admin page per sidebar entry of an app with configuration of its
 * own: the update notice while the adapter carries `updateStatus` and it
 * reports one, then
 * the page the route names, Organizations and users while the adapter
 * carries `organizationsWithUsers`, Configuration on every host, its empty
 * state when the adapter carries no `config` and reached by URL alone,
 * System while it carries `storage`, every call through the
 * app's `admin` adapter; the sidebar rows are the one navigation and no
 * tab strip is drawn; the page's own heading is drawn above Organizations
 * and System and not above Configuration, whose heading is the file's
 * root `title` drawn by `AdminConfig` (identity contract decision 129); a
 * visitor is sent to sign in and a signed-in non-admin home, `allowed`
 * being the app's global-admin flag.
 */
const AdminPage = ({ session, returnTo, allowed, admin, activeOrgKey, updateCommand, page }) => {
  const { t } = useTranslation();
  useEffect(() => {
    document.title = t('admin.pageTitle');
  }, [t]);

  const navigate = useNavigate();
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
    if (!admin.updateStatus) {
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
      {page === 'config' ? null : (
        <header>
          <h3 className="text-center">{t('admin.title')}</h3>
        </header>
      )}
      {updateInfo && <UpdateNotice updateInfo={updateInfo} command={updateCommand} />}
      <div className="mt-2">
        {page === 'organizations' && admin.organizationsWithUsers ? (
          <AdminOrganizations session={session} activeOrgKey={activeOrgKey} admin={admin} />
        ) : null}
        {page === 'config' ? <AdminConfig config={admin.config || null} /> : null}
        {page === 'system' && admin.storage ? <AdminStorage storage={admin.storage} /> : null}
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
  page: PropTypes.oneOf(ADMIN_PAGES).isRequired,
};

export default AdminPage;
