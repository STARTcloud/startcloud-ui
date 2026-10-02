import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const VLAN_MAX = 4094;

const lineOf = (move, t) => {
  if (move.isRemove) {
    return t('hostTools.topology.removeLine', { machine: move.machineName, link: move.link });
  }
  return t(move.isAdd ? 'hostTools.topology.addLine' : 'hostTools.topology.moveLine', {
    machine: move.machineName,
    link: move.link,
    carrier: move.toCarrier,
    vlan: '',
  });
};

const TrayRow = ({ move, onRetargetVlan, onRenameNic }) => {
  const { t } = useTranslation();
  const bhyve = move.hostKind !== 'vbox';
  return (
    <div
      className={`hw-topo-tray-row font-monospace d-flex align-items-center gap-2 flex-wrap ${
        move.isRemove ? 'hw-topo-tray-remove' : ''
      }`}
      data-move={`${move.machineName}|${move.link}`}
    >
      <span>{lineOf(move, t)}</span>
      {move.isAdd && bhyve ? (
        <input
          type="text"
          className="form-control form-control-sm hw-topo-tray-name"
          placeholder={t('hostTools.topology.trayName')}
          value={move.newName || ''}
          onChange={event => onRenameNic(move, event.target.value)}
          aria-label={t('hostTools.topology.trayName')}
        />
      ) : null}
      {!move.isRemove && bhyve ? (
        <>
          <span className="hw-topo-card-meta">{t('hostTools.topology.trayVlan')}</span>
          <input
            type="number"
            className="form-control form-control-sm hw-topo-tray-vlan"
            min={move.fromVlanId > 0 ? 1 : 0}
            max={VLAN_MAX}
            value={move.toVlanId}
            onChange={event => onRetargetVlan(move, event.target.value)}
            title={t('hostTools.topology.trayVlanTitle')}
            aria-label={t('hostTools.topology.trayVlan')}
          />
        </>
      ) : null}
    </div>
  );
};

TrayRow.propTypes = {
  move: PropTypes.object.isRequired,
  onRetargetVlan: PropTypes.func.isRequired,
  onRenameNic: PropTypes.func.isRequired,
};

/**
 * The staged-rewire tray and the apply-results tray, hyperweaver-ui's:
 * every staged row with, on bhyve, its editable target VLAN and its
 * VNIC name for an add, Apply and Discard, and after an apply one line
 * a machine saying what the agent answered.
 */
const TopologyTray = ({
  pendingMoves,
  applyBusy,
  onApply,
  onDiscard,
  onRetargetVlan,
  onRenameNic,
  applyResults,
  onClearResults,
}) => {
  const { t } = useTranslation();
  return (
    <>
      {pendingMoves.length > 0 ? (
        <div className="hw-topo-tray" data-tray="staged">
          <div className="hw-topo-tray-head">
            <span className="fw-semibold">
              {t('hostTools.topology.stagedHeading', { count: pendingMoves.length })}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-warning ms-auto"
              disabled={applyBusy}
              onClick={onApply}
              data-tool="apply-moves"
            >
              {t('hostTools.topology.applyChanges')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-light"
              disabled={applyBusy}
              onClick={onDiscard}
              data-tool="discard-moves"
            >
              {t('hostTools.topology.discard')}
            </button>
          </div>
          {pendingMoves.map(move => (
            <TrayRow
              key={`${move.machineName}|${move.link}`}
              move={move}
              onRetargetVlan={onRetargetVlan}
              onRenameNic={onRenameNic}
            />
          ))}
          <div className="hw-topo-tray-note">{t('hostTools.topology.trayNote')}</div>
        </div>
      ) : null}
      {applyResults.length > 0 ? (
        <div className="hw-topo-tray" data-tray="results">
          {applyResults.map(result => (
            <div
              key={result.machineName + result.message}
              className={`hw-topo-tray-row ${result.ok ? '' : 'hw-topo-tray-fail'}`}
            >
              <span className="fw-semibold">{result.machineName}</span> — {result.message}
            </div>
          ))}
          <button
            type="button"
            className="btn btn-sm btn-light mt-1"
            onClick={onClearResults}
            data-tool="clear-results"
          >
            {t('hostTools.topology.closeDrill')}
          </button>
        </div>
      ) : null}
    </>
  );
};

TopologyTray.propTypes = {
  pendingMoves: PropTypes.array.isRequired,
  applyBusy: PropTypes.bool.isRequired,
  onApply: PropTypes.func.isRequired,
  onDiscard: PropTypes.func.isRequired,
  onRetargetVlan: PropTypes.func.isRequired,
  onRenameNic: PropTypes.func.isRequired,
  applyResults: PropTypes.array.isRequired,
  onClearResults: PropTypes.func.isRequired,
};

export default TopologyTray;
