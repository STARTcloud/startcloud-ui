import { useEffect, useState } from 'react';

import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { fetchFleet } from '../api/fleet';
import { vmKey } from '../utils/vmStatus';

const TICK_MS = 5000;

const keyed = vms => Object.fromEntries((vms || []).map(vm => [vmKey(vm), vm]));

const applyPools = (current, { vms: udsByHost = {}, synthetic = {}, pools = {} }) => {
  const next = {};
  Object.values(current.vms).forEach(vm => {
    if (vm._synthetic && !synthetic[vm.hostname]) {
      return;
    }
    const uds = vm.status !== 'decommissioned' ? udsByHost[vm.hostname] : undefined;
    next[vmKey(vm)] = uds ? { ...vm, uds } : vm;
  });
  Object.entries(synthetic).forEach(([hostname, vm]) => {
    next[vm.instance_id || hostname] = vm;
  });
  return { ...current, vms: next, pools };
};

const without = (vms, key) => {
  if (!vms[key]) {
    return vms;
  }
  const next = { ...vms };
  delete next[key];
  return next;
};

/**
 * The fleet a host streams: every vm keyed by instance id and the pool
 * summary, loaded once from `/api/vdi/fleet`, then kept live by the
 * `fleet` topic of the event stream (`fleet-snapshot`, `vm-updated`,
 * `vm-removed`, `vm-events`, `pools-updated`), with a five-second tick
 * (`now`) every relative time and stale flag is derived against, and the
 * time of the last event received.
 *
 * @returns {{ vms: Object, pools: Object, now: number, loaded: boolean, failed: boolean, lastEventAt: number|null }} The fleet
 */
export const useFleet = () => {
  const [state, setState] = useState({ vms: {}, pools: {}, loaded: false, failed: false });
  const [now, setNow] = useState(() => Date.now());
  const [lastEventAt, setLastEventAt] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchFleet()
      .then(data => {
        if (mounted) {
          setState({ vms: keyed(data.vms), pools: data.pools || {}, loaded: true, failed: false });
        }
      })
      .catch(error => {
        log.api.error('Error fetching fleet', { error: error.message });
        if (mounted) {
          setState(current => ({ ...current, loaded: true, failed: true }));
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const touch = () => setLastEventAt(Date.now());

  useEventStream('fleet-snapshot', data => {
    touch();
    setState({ vms: keyed(data.vms), pools: data.pools || {}, loaded: true, failed: false });
  });

  useEventStream('vm-updated', vm => {
    touch();
    setState(current => ({ ...current, vms: { ...current.vms, [vmKey(vm)]: vm } }));
  });

  useEventStream('vm-removed', data => {
    touch();
    setState(current => ({ ...current, vms: without(current.vms, data.instance_id) }));
  });

  useEventStream('vm-events', touch);

  useEventStream('pools-updated', data => {
    touch();
    setState(current => applyPools(current, data));
  });

  return { ...state, now, lastEventAt };
};
