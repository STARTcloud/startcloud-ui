import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaDesktop, FaTerminal, FaWindows } from 'react-icons/fa6';

import { consoleDoorsOf } from '../utils/consoles';

const LOOKS = {
  vnc: { tone: 'btn-warning', icon: FaDesktop, word: 'Vnc' },
  zlogin: { tone: 'btn-warning', icon: FaTerminal, word: 'Zlogin' },
  ssh: { tone: 'btn-success', icon: FaTerminal, word: 'Ssh' },
  rdp: { tone: 'btn-info', icon: FaWindows, word: 'Rdp' },
};

const Busy = () => <span className="spinner-border spinner-border-sm" aria-hidden="true" />;

const SwitchButton = ({ kind, prefix, active, busy, onSwitch, onStart }) => {
  const { t } = useTranslation();
  const { tone, icon: Icon, word } = LOOKS[kind];
  const label = active ? t(`${prefix}.switchTo${word}`) : t(`${prefix}.start${word}`);
  const waiting = !active && busy;
  return (
    <button
      type="button"
      className={`btn btn-sm ${tone}`}
      onClick={() => (active ? onSwitch(kind) : onStart(kind))}
      disabled={waiting}
      title={label}
      aria-label={label}
      data-action={active ? `console-switch-${kind}` : `console-start-${kind}`}
    >
      {waiting ? <Busy /> : <Icon aria-hidden="true" />}
    </button>
  );
};

SwitchButton.propTypes = {
  kind: PropTypes.string.isRequired,
  prefix: PropTypes.string.isRequired,
  active: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  onSwitch: PropTypes.func.isRequired,
  onStart: PropTypes.func.isRequired,
};

/**
 * The switch-or-start buttons of a console header, hyperweaver-ui's row
 * shared by every console: one button a console the host's row offers
 * other than the one drawn, in the order of `CONSOLE_DOORS`, Switch to
 * it while its session is active and Start it otherwise, the VNC start
 * waiting on its own flag and the rest on the shared one; the labels
 * are the drawing console's own keys under `prefix`, `switchToVnc`,
 * `startVnc` and their kin.
 */
const ConsoleSwitchButtons = ({
  prefix,
  server = null,
  current,
  held,
  loading,
  loadingVnc,
  onSwitch,
  onStart,
}) =>
  consoleDoorsOf(server)
    .filter(door => door.key !== current)
    .map(door => (
      <SwitchButton
        key={door.key}
        kind={door.key}
        prefix={prefix}
        active={Boolean(held[door.key])}
        busy={door.key === 'vnc' ? loadingVnc : loading}
        onSwitch={onSwitch}
        onStart={onStart}
      />
    ));

ConsoleSwitchButtons.propTypes = {
  prefix: PropTypes.string.isRequired,
  server: PropTypes.object,
  current: PropTypes.string.isRequired,
  held: PropTypes.object.isRequired,
  loading: PropTypes.bool.isRequired,
  loadingVnc: PropTypes.bool.isRequired,
  onSwitch: PropTypes.func.isRequired,
  onStart: PropTypes.func.isRequired,
};

export default ConsoleSwitchButtons;
