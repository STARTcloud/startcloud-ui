import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCircleCheck, FaCircleXmark, FaGears } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import RecordRows from '../../../components/common/RecordRows';
import TabStrip from '../../../components/common/TabStrip';
import { useStatus } from '../../../contexts/StatusContext';
import { useSyslogData } from '../hooks/useSyslogData';
import { getServiceStatusColor, getServiceType } from '../utils/syslogUtils';

import ConfigEditorView from './SyslogConfiguration/ConfigEditorView';
import CurrentRulesView from './SyslogConfiguration/CurrentRulesView';
import HelpSection from './SyslogConfiguration/HelpSection';
import RuleBuilderView from './SyslogConfiguration/RuleBuilderView';
import SyslogGlyph from './SyslogConfiguration/syslogGlyphs';
import TaskDialog from './TaskDialog';

const TABS = [
  { key: 'current', labelKey: 'hostTime.syslogConfiguration.tabCurrentRules' },
  { key: 'editor', labelKey: 'hostTime.syslogConfiguration.tabConfigEditor' },
  { key: 'builder', labelKey: 'hostTime.syslogConfiguration.tabRuleBuilder' },
];

const SERVICES = ['syslog', 'rsyslog'];

const statusRows = ({ config, t }) => {
  const serviceType = getServiceType(config);
  const state = config.service_status?.state;
  const StateIcon = state === 'online' ? FaCircleCheck : FaCircleXmark;
  return [
    {
      key: 'service',
      label: t('hostTime.syslogConfiguration.serviceTypeLabel'),
      value: (
        <span className="badge text-bg-primary d-inline-flex align-items-center gap-1">
          <SyslogGlyph name={serviceType.icon} className="" />
          <span>{serviceType.display}</span>
        </span>
      ),
    },
    {
      key: 'status',
      label: t('hostTime.syslogConfiguration.serviceStatusLabel'),
      value: (
        <span
          className={`badge text-bg-${getServiceStatusColor(config.service_status)} d-inline-flex align-items-center gap-1`}
          data-service-state={state || ''}
        >
          <StateIcon aria-hidden="true" />
          <span>{state || t('hostTime.syslogConfiguration.unknownStatus')}</span>
        </span>
      ),
    },
    {
      key: 'file',
      label: t('hostTime.syslogConfiguration.configFileLabel'),
      value: <span className="badge text-bg-info">{config.config_file || '/etc/syslog.conf'}</span>,
    },
    {
      key: 'rules',
      label: t('hostTime.syslogConfiguration.activeRulesLabel'),
      value: (
        <span className="badge text-bg-secondary">
          {t('hostTime.syslogConfiguration.rulesCount', {
            count: config.parsed_rules?.length || 0,
          })}
        </span>
      ),
    },
  ];
};

/**
 * The syslog configuration of a host, hyperweaver-ui's
 * `SyslogConfiguration` as the body of the Manage page's Syslog section:
 * the status of the logging service, its type, its state, its file and
 * its rule count, the switch between the traditional syslog and rsyslog
 * behind the typed confirmation, then the current rules over the one
 * table the page's binding narrows, the configuration editor and the
 * rule builder on the one tab strip, and the help. Every write is one
 * request and one notice, the configuration read again on a success.
 * Nothing polls.
 */
const SyslogSection = ({ id, ctx, table, reading, filtering }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const data = useSyslogData({ id, reading });
  const { config } = data;
  const serviceType = getServiceType(config);
  const switchMessage = (
    <p className="mb-0" data-dialog="syslog-switch">
      <FaGears className="me-2" aria-hidden="true" />
      {t('hostTime.syslogConfiguration.switchModalMessage', {
        target: data.pendingSwitchTarget || '',
      })}
    </p>
  );

  return (
    <div data-tabs="syslog">
      {reading.loaded ? null : <p>{t('pages.loading')}</p>}
      {reading.failed ? (
        <div className="alert alert-danger" role="alert">
          {t('hosts.overview.readError')}
        </div>
      ) : null}
      {config ? (
        <div className="card mb-3" data-panel="syslog-status">
          <div className="card-body">
            <h6 className="fw-bold">{t('hostTime.syslogConfiguration.statusHeading')}</h6>
            <RecordRows rows={statusRows({ config, t })} className="mb-2" />
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="small text-muted flex-grow-1">
                {t('hostTime.syslogConfiguration.switchServiceText')}
              </span>
              {SERVICES.map(service => (
                <button
                  key={service}
                  type="button"
                  className={`btn btn-sm btn-${serviceType.name === service ? 'primary' : 'outline-secondary'}`}
                  data-action={`syslog-switch-${service}`}
                  onClick={() => data.requestSwitchService(service)}
                  disabled={data.busy || serviceType.name === service}
                >
                  <SyslogGlyph name={service === 'rsyslog' ? 'gears' : 'file'} />
                  {t(
                    service === 'rsyslog'
                      ? 'hostTime.syslogConfiguration.modernRsyslogButton'
                      : 'hostTime.syslogConfiguration.traditionalSyslogButton'
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <TabStrip
        tabs={TABS.map(tab => ({ key: tab.key, label: t(tab.labelKey) }))}
        active={data.activeView}
        onSelect={data.setActiveView}
        className="mb-3"
      />
      {data.activeView === 'current' ? (
        <CurrentRulesView table={table} reading={reading} filtering={filtering} ctx={ctx} />
      ) : null}
      {data.activeView === 'editor' ? (
        <ConfigEditorView
          configContent={data.configContent}
          setConfigContent={data.setConfigContent}
          validation={data.validation}
          busy={data.busy}
          validating={data.validating}
          validateConfiguration={data.validateConfiguration}
          applyConfiguration={data.applyConfiguration}
          reloadSyslog={data.reloadSyslog}
        />
      ) : null}
      {data.activeView === 'builder' ? (
        <RuleBuilderView
          config={config}
          facilities={data.facilities}
          ruleBuilder={data.ruleBuilder}
          handleRuleBuilderChange={data.handleRuleBuilderChange}
          addRule={data.addRule}
        />
      ) : null}
      <HelpSection config={config} />

      <ConfirmModal
        show={data.pendingSwitchTarget !== null}
        handleClose={data.cancelSwitchService}
        handleConfirm={data.confirmSwitchService}
        title={t('hostTime.syslogConfiguration.switchModalTitle')}
        message={switchMessage}
        confirmText={t('hostTime.syslogConfiguration.switchModalConfirm')}
        variant="restart"
        keyword="switch"
      />
      {data.task ? (
        <TaskDialog status={status} id={id} task={data.task.row} onHide={data.closeTask} />
      ) : null}
    </div>
  );
};

SyslogSection.propTypes = {
  id: PropTypes.string.isRequired,
  ctx: PropTypes.object.isRequired,
  table: PropTypes.object.isRequired,
  reading: PropTypes.shape({
    data: PropTypes.object,
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
    refresh: PropTypes.func.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
};

export default SyslogSection;
