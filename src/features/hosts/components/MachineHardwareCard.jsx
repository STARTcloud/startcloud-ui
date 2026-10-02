import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import RecordRows from '../../../components/common/RecordRows';
import SectionCard, { foldsShape } from '../../../components/common/SectionCard';
import { useHostRow } from '../hooks/useHostRow';
import { consoleDoorsOf, consoleRoute } from '../utils/consoles';
import {
  configurationOf,
  consolePortOf,
  forwardLine,
  hardwareOf,
  hasDevices,
  natForwardsOf,
  zoneSpecs,
} from '../utils/machines';

import DeviceTree from './DeviceTree';

const FOLD = 'machine-hardware';

const WORDS = {
  enabled: ['machine.machineHardware.enabledLabel', 'machine.machineHardware.disabledLabel'],
  switch: ['machine.machineHardware.onLabel', 'machine.machineHardware.offLabel'],
};

const forwardKey = forward => `${forward.name}|${forward.adapter ?? ''}`;

const specValue = (spec, t) => {
  const words = WORDS[spec.kind];
  if (words) {
    return (
      <span className={`fw-semibold ${spec.on ? 'text-success' : 'text-danger'}`}>
        {t(spec.on ? words[0] : words[1])}
      </span>
    );
  }
  const text = spec.value || t('machine.machineHardware.notApplicable');
  return spec.kind === 'code' ? <span className="text-muted font-monospace">{text}</span> : text;
};

const ConsolePort = ({ port }) => {
  const { t } = useTranslation();
  if (port.kind === 'pinned') {
    return (
      <>
        <span className="text-muted font-monospace">{port.port}</span>
        <span
          className="badge text-bg-secondary ms-2"
          title={t('machine.machineHardware.pinnedTooltip')}
        >
          {t('machine.machineHardware.pinnedBadge')}
        </span>
      </>
    );
  }
  if (port.kind === 'live') {
    return (
      <>
        <span className="text-muted font-monospace">{port.port}</span>
        <span className="text-muted small ms-2">{t('machine.machineHardware.thisSession')}</span>
      </>
    );
  }
  return (
    <span className="fw-semibold text-success">{t('machine.machineHardware.autoAgentPool')}</span>
  );
};

ConsolePort.propTypes = {
  port: PropTypes.shape({
    kind: PropTypes.string.isRequired,
    port: PropTypes.string.isRequired,
  }).isRequired,
};

const specRows = (detail, t) => {
  const specs = zoneSpecs(configurationOf(detail));
  if (specs.length === 0) {
    return [];
  }
  return [
    ...specs.map(spec => ({ key: spec.key, label: t(spec.labelKey), value: specValue(spec, t) })),
    {
      key: 'console-port',
      label: t('machine.machineHardware.vncPortLabel'),
      value: <ConsolePort port={consolePortOf(detail)} />,
    },
  ];
};

const consoleRows = ({ server, id, name, t }) =>
  consoleDoorsOf(server).map(door => ({
    key: `console-${door.key}`,
    label: t(door.labelKey),
    value: (
      <Link to={consoleRoute(id, name, door.key)} data-action={`console-${door.key}`}>
        {t('hosts.sidebar.open')}
      </Link>
    ),
  }));

const Forwards = ({ forwards }) => {
  const { t } = useTranslation();
  return (
    <div data-list="nat-forwards">
      <h6 className="fw-bold mb-2">{t('machine.machineHardware.natForwardsHeading')}</h6>
      {forwards.map(forward => (
        <div
          key={forwardKey(forward)}
          className="d-flex align-items-center gap-2 font-monospace small py-1"
        >
          <span className="badge text-bg-secondary">{forward.protocol}</span>
          {forward.adapter === undefined || forward.adapter === null ? null : (
            <span className="badge text-bg-light">
              {t('hosts.machines.hardware.adapter', { adapter: forward.adapter })}
            </span>
          )}
          <span className="text-truncate">{forwardLine(forward)}</span>
        </div>
      ))}
    </div>
  );
};

Forwards.propTypes = {
  forwards: PropTypes.arrayOf(PropTypes.object).isRequired,
};

/**
 * The hardware of one machine, hyperweaver-ui's hardware card, a section
 * card that folds under `machine-hardware`: on top the specifications of
 * a zone as record rows, the memory, the processors, the boot ROM, the
 * host bridge, the brand, the type and the switches of its
 * configuration, then the port its web console answers on, pinned, of
 * this session or handed out by the agent, and one row a console the
 * host's row lists, hyperweaver-ui's VNC and zlogin rows, VNC console,
 * zlogin console, SSH and RDP, each opening the console on the machine's
 * page; under them the devices
 * plugged into the machine as the device tree; and the NAT port
 * forwards its configuration carries. zoneweaver-agent answers the
 * specifications and the devices of a zone in `configuration`,
 * hyperweaver-agent the devices in `knob_current.devices`, and each is
 * read as it is. Nothing draws for a machine that answers none of the
 * three and whose host lists no console.
 */
const MachineHardwareCard = ({ id, name, detail, folds }) => {
  const { t } = useTranslation();
  const server = useHostRow(id);
  const specs = [...specRows(detail, t), ...consoleRows({ server, id, name, t })];
  const hardware = hardwareOf(detail);
  const forwards = natForwardsOf(detail);
  const devices = hasDevices(hardware);

  if (specs.length === 0 && !devices && forwards.length === 0) {
    return null;
  }

  return (
    <div className="col-12 col-lg-6 col-xxl-4" data-panel="machine-hardware">
      <SectionCard
        title={t('machine.machineHardware.heading')}
        className="mb-0 h-100"
        folded={folds.folded(FOLD)}
        onFold={() => folds.toggle(FOLD)}
      >
        <div className="d-flex flex-column gap-3">
          {specs.length > 0 ? <RecordRows rows={specs} className="mb-0" /> : null}
          {devices ? <DeviceTree hardware={hardware} /> : null}
          {forwards.length > 0 ? <Forwards forwards={forwards} /> : null}
        </div>
      </SectionCard>
    </div>
  );
};

MachineHardwareCard.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  detail: PropTypes.object.isRequired,
  folds: foldsShape.isRequired,
};

export default MachineHardwareCard;
