import { lazy } from 'react';

import { hasFeatureStrict } from '../../utils/capabilities';

const ControlCommands = lazy(() => import('./components/ControlCommands'));

/**
 * The hosts feature's `controlCommands` export: the component that builds
 * the feature's command list for the route, draws its dialogs and
 * publishes it to the feature's context, where the Controls menu draws it
 * and search's `page` kind runs it. Nothing unless the host advertises
 * `hosts` and a person is signed in.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} account - The session state from `useSession`
 * @returns {Function|null} The component, taking `user`
 */
export const controlCommands = (status, account) =>
  hasFeatureStrict(status, 'hosts') && account?.user ? ControlCommands : null;
