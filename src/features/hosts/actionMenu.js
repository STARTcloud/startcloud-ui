import { lazy } from 'react';

import { hasFeatureStrict } from '../../utils/capabilities';

const HostControls = lazy(() => import('./components/HostControls'));

/**
 * The hosts feature's `actionMenu` export of the navbar contract's Sidebar
 * section, its Foot bullet: while a mounted feature exports one, the
 * header's account slot draws that menu in the same toggle shape and the
 * user menu draws at the sidebar's foot as a drop-up. Nothing unless the
 * host advertises `hosts` and a person is signed in; else the Controls
 * menu component, the machine power rows on a machine route and the host
 * power rows on a host route.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} account - The session state from `useSession`
 * @returns {Function|null} The menu component, taking `user`
 */
export const actionMenu = (status, account) =>
  hasFeatureStrict(status, 'hosts') && account?.user ? HostControls : null;
