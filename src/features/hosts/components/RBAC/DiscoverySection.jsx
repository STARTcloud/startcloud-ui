import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import TabStrip from '../../../../components/common/TabStrip';
import ManageTable from '../ManageTable';

import { AUTHORIZATION_COLUMNS, CopyNameAction } from './AuthorizationsTab';
import { PROFILE_COLUMNS } from './ProfilesTab';
import { RBAC_ROLE_COLUMNS } from './RolesTab';

const TABS = [
  {
    key: 'rbac-authorizations',
    table: 'authorizations',
    labelKey: 'hostTools.DiscoverySection.tabAuthorizationsLabel',
    columns: AUTHORIZATION_COLUMNS,
    emptyKey: 'hostTools.AuthorizationsTab.noAuthorizationsFound',
    copyKey: 'hostTools.AuthorizationsTab.copyToClipboard',
  },
  {
    key: 'rbac-profiles',
    table: 'profiles',
    labelKey: 'hostTools.DiscoverySection.tabProfilesLabel',
    columns: PROFILE_COLUMNS,
    emptyKey: 'hostTools.ProfilesTab.noProfilesFound',
    copyKey: 'hostTools.ProfilesTab.copyToClipboard',
  },
  {
    key: 'rbac-roles',
    table: 'roles',
    labelKey: 'hostTools.DiscoverySection.tabRolesLabel',
    columns: RBAC_ROLE_COLUMNS,
    emptyKey: 'hostTools.RolesTab.noRolesFound',
    copyKey: 'hostTools.RolesTab.copyToClipboard',
  },
];

const rowKey = row => row.name;

/**
 * The RBAC discovery of a host, hyperweaver-ui's section as the RBAC
 * tab of the Manage page's Users and groups section: its three tabs on
 * the one tab strip, the authorizations, the profiles and the roles,
 * each the one table over the rows the page's binding left with Copy
 * on every row, the limit of the first two in the navbar's panel, and
 * hyperweaver-ui's tip under them, the wildcard note on the
 * authorizations.
 */
const RBACDiscoverySection = ({ hostname, ctx, tables, readings, filtering }) => {
  const { t } = useTranslation();
  const [active, setActive] = useState('rbac-authorizations');
  const tab = TABS.find(entry => entry.key === active);
  return (
    <div data-tabs="rbac">
      <p className="text-muted">
        {t('hostTools.DiscoverySection.description', { serverHostname: hostname })}
      </p>
      <TabStrip
        tabs={TABS.map(entry => ({ key: entry.key, label: t(entry.labelKey) }))}
        active={active}
        onSelect={setActive}
        className="mb-3"
      />
      <ManageTable
        name={tab.key}
        columns={tab.columns}
        table={tables[tab.table]}
        rowKey={rowKey}
        RowActions={CopyNameAction}
        actionsProps={{ labelKey: tab.copyKey }}
        ctx={ctx}
        emptyKey={tab.emptyKey}
        reading={readings[tab.table]}
        filtering={filtering}
      />
      <div className="alert alert-info mt-3 mb-0" role="note">
        <p className={tab.table === 'authorizations' ? 'mb-1' : 'mb-0'}>
          <strong>{t('hostTools.DiscoverySection.tipHeading')}</strong>{' '}
          {t('hostTools.DiscoverySection.tipContent')}
        </p>
        {tab.table === 'authorizations' ? (
          <p className="mb-0">
            <strong>{t('hostTools.DiscoverySection.authorizationWildcardsHeading')}</strong>{' '}
            {t('hostTools.DiscoverySection.authorizationWildcardsContent')}
          </p>
        ) : null}
      </div>
    </div>
  );
};

const readingShape = PropTypes.shape({
  loaded: PropTypes.bool.isRequired,
  failed: PropTypes.bool.isRequired,
});

RBACDiscoverySection.propTypes = {
  hostname: PropTypes.string.isRequired,
  ctx: PropTypes.object.isRequired,
  tables: PropTypes.shape({
    authorizations: PropTypes.object.isRequired,
    profiles: PropTypes.object.isRequired,
    roles: PropTypes.object.isRequired,
  }).isRequired,
  readings: PropTypes.shape({
    authorizations: readingShape.isRequired,
    profiles: readingShape.isRequired,
    roles: readingShape.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
};

export default RBACDiscoverySection;
