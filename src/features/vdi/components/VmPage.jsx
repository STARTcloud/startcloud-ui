import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import PageHeader from '../../../components/common/PageHeader';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { authMethod } from '../../../utils/capabilities';
import { fetchPools, fetchVm } from '../api/fleet';
import { useGrafana } from '../hooks/useGrafana';
import { useVmHistory } from '../hooks/useVmHistory';
import { statusBadgeClass, vmStatus } from '../utils/vmStatus';

import CacheBadge from './CacheBadge';
import VmHistory from './VmHistory';
import VmMetrics from './VmMetrics';
import VmOverview from './VmOverview';
import VmStats from './VmStats';

const TICK_MS = 5000;

const useVm = instance => {
  const [state, setState] = useState({ key: '', vm: null, pools: {}, missing: false });
  const [now, setNow] = useState(() => Date.now());
  const ready = state.key === instance;

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchVm(instance), fetchPools().catch(() => ({ pools: {} }))])
      .then(([vm, answer]) => {
        if (mounted) {
          setState({ key: instance, vm, pools: answer.pools || {}, missing: false });
        }
      })
      .catch(error => {
        log.api.error('Error fetching VM', { instance, error: error.message });
        if (mounted) {
          setState({ key: instance, vm: null, pools: {}, missing: true });
        }
      });
    return () => {
      mounted = false;
    };
  }, [instance]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  useEventStream('vm-updated', vm => {
    if (vm.instance_id === instance) {
      setState(current => ({ ...current, vm }));
    }
  });

  useEventStream('fleet-snapshot', data => {
    const vm = (data.vms || []).find(entry => entry.instance_id === instance);
    setState(current => ({ ...current, vm: vm || current.vm, pools: data.pools || current.pools }));
  });

  useEventStream('pools-updated', data => {
    setState(current => {
      const uds = current.vm ? data.vms?.[current.vm.hostname] : null;
      return {
        ...current,
        vm: uds && current.vm.status !== 'decommissioned' ? { ...current.vm, uds } : current.vm,
        pools: data.pools || current.pools,
      };
    });
  });

  return { ...state, ready, now };
};

const Section = ({ title, children }) => (
  <div className="list-table mb-4">
    <h4 className="mb-3">{title}</h4>
    {children}
  </div>
);

Section.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

const VmBody = ({ instance, theme }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const { vm, pools, missing, ready, now } = useVm(instance);
  const grafana = useGrafana();
  const history = useVmHistory(instance);

  useEffect(() => {
    document.title = vm?.hostname || instance;
  }, [vm, instance]);

  useEffect(() => {
    if (ready && missing) {
      notify('danger', t('vdi.vm.notFound'));
    }
  }, [ready, missing, notify, t]);

  if (!ready) {
    return (
      <div className="list row">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }
  if (!vm) {
    return <div className="list row" />;
  }

  const status = vmStatus(vm, now);
  const chips = (
    <>
      <span className={`badge ${statusBadgeClass(status)}`}>{t(`vdi.status.${status}`)}</span>
      {vm.uds?.pool_name ? <span className="badge bg-secondary">{vm.uds.pool_name}</span> : null}
      <CacheBadge uds={vm.uds} />
      {vm.uds?.stale_image ? (
        <span className="badge text-bg-danger">{t('vdi.publication.staleImage')}</span>
      ) : null}
    </>
  );

  return (
    <div className="list row">
      <PageHeader title={vm.hostname} subtitle={vm.instance_id} chips={chips} />
      <Section title={t('vdi.detail.overview')}>
        <VmOverview vm={vm} pools={pools} now={now} />
      </Section>
      {grafana.enabled ? (
        <Section title={t('vdi.detail.metrics')}>
          <VmMetrics vm={vm} grafana={grafana} theme={theme} />
        </Section>
      ) : null}
      <Section title={t('vdi.detail.history')}>
        <VmHistory history={history} />
      </Section>
      <Section title={t('vdi.detail.stats')}>
        <VmStats stats={history.stats} loading={history.loading} />
      </Section>
    </div>
  );
};

VmBody.propTypes = {
  instance: PropTypes.string.isRequired,
  theme: PropTypes.string.isRequired,
};

/**
 * One VM at `/vm/{instance_id}`: the hostname as the title with the
 * status, pool, cache and stale-image chips, then Overview, Metrics
 * (while Grafana is enabled), History and Stats, the VM kept live by the
 * stream and its history refetched when `vm-events` names it; a host that
 * needs a session shows the sign-in note until one exists and fetches
 * nothing before.
 */
const VmPage = ({ instance, theme, user = null }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const allowed = authMethod(status) === 'none' || Boolean(user);
  if (!allowed) {
    return (
      <div className="list row">
        <div className="alert alert-secondary">{t('vdi.fleet.signIn')}</div>
      </div>
    );
  }
  return <VmBody instance={instance} theme={theme} />;
};

VmPage.propTypes = {
  instance: PropTypes.string.isRequired,
  theme: PropTypes.string.isRequired,
  user: PropTypes.object,
};

export default VmPage;
