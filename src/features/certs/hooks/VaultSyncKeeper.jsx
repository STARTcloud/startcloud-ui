import PropTypes from 'prop-types';
import { useEffect } from 'react';

import { BACKEND_DESTINATION } from '../utils/destinations';

import { useVaultSync } from './useVaultSync';

/**
 * The keeper of one destination's mirror, drawn inside the vault's
 * provider while that destination lists `certs-store` and a person is
 * signed in: it draws nothing, runs `useVaultSync` for the organization,
 * the destination's key, its calls `api` and whether its events reach the
 * page's stream, and hands the provider the mirror's `mirror` and `pull`
 * through `onApi`, null again as it leaves.
 */
const VaultSyncKeeper = ({
  organization,
  user,
  destination,
  api = BACKEND_DESTINATION,
  streamed = true,
  onApi,
}) => {
  const sync = useVaultSync({ organization, user, destination, api, streamed });
  const { mirror, pull } = sync;

  useEffect(() => {
    onApi({ mirror, pull });
    return () => onApi(null);
  }, [mirror, pull, onApi]);

  return null;
};

VaultSyncKeeper.propTypes = {
  organization: PropTypes.string.isRequired,
  user: PropTypes.object,
  destination: PropTypes.string.isRequired,
  api: PropTypes.object,
  streamed: PropTypes.bool,
  onApi: PropTypes.func.isRequired,
};

export default VaultSyncKeeper;
