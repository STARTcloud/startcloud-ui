import { useCallback, useEffect, useState } from 'react';

import { vboxModeForKind } from './topologyModelVBox';

const VLAN_MAX = 4094;

const without = (moves, drag) =>
  moves.filter(move => !(move.machineName === drag.machineName && move.link === drag.link));

/**
 * The drag-to-rewire staging of the topology, hyperweaver-ui's: the live
 * drag payload with its Ctrl-pinned carrier, the staged tray rows, the
 * rewires, the adds and the removes, the add-NIC dialog's draft and the
 * mutators the canvas and the tray call. A bhyve add chip dropped opens
 * the dialog for the name and the VLAN; a VirtualBox add stages at once,
 * bridged alone. Escape drops a pinned carrier.
 *
 * @returns {Object} The staging state and its mutators
 */
export const useTopologyRewire = () => {
  const [dragging, setDragging] = useState(null);
  const [trashOver, setTrashOver] = useState(false);
  const [pendingMoves, setPendingMoves] = useState([]);
  const [addDraft, setAddDraft] = useState(null);

  const stageMove = useCallback((hostKey, network, drag) => {
    const toCarrier = drag.pinnedCarrier || network.carrier;
    if (drag.addNew && drag.hostKind !== 'vbox') {
      setAddDraft({ hostKey, drag, carrier: toCarrier, vlanId: network.vlanId || 0 });
      setDragging(null);
      return;
    }
    setPendingMoves(prev => [
      ...without(prev, drag),
      {
        hostKey,
        hostKind: drag.hostKind,
        machineName: drag.machineName,
        link: drag.link,
        adapter: drag.adapter,
        fromNetId: drag.fromNetId,
        fromVlanId: drag.vlanId || 0,
        toNetId: drag.pinnedCarrier ? `${toCarrier}|${network.vlanId || 0}` : network.id,
        toCarrier,
        toVlanId: network.vlanId,
        toMode: vboxModeForKind[network.kind] || null,
        isAdd: Boolean(drag.addNew),
        newName: '',
      },
    ]);
    setDragging(null);
  }, []);

  const stageCarrierMove = useCallback((hostKey, carrier, drag) => {
    if (drag.addNew && drag.hostKind !== 'vbox') {
      setAddDraft({ hostKey, drag, carrier: carrier.id, vlanId: 0 });
      setDragging(null);
      return;
    }
    setPendingMoves(prev => [
      ...without(prev, drag),
      {
        hostKey,
        hostKind: drag.hostKind,
        machineName: drag.machineName,
        link: drag.link,
        adapter: drag.adapter,
        fromNetId: drag.fromNetId,
        fromVlanId: drag.vlanId || 0,
        toNetId: `${carrier.id}|${drag.vlanId || 0}`,
        toCarrier: carrier.id,
        toVlanId: drag.vlanId || 0,
        toMode: drag.hostKind === 'vbox' ? 'bridged' : null,
        isAdd: Boolean(drag.addNew),
        newName: '',
      },
    ]);
    setDragging(null);
  }, []);

  const stageRemove = useCallback((hostKey, drag) => {
    setPendingMoves(prev => [
      ...without(prev, drag),
      {
        hostKey,
        hostKind: drag.hostKind,
        machineName: drag.machineName,
        link: drag.link,
        adapter: drag.adapter,
        fromNetId: drag.fromNetId,
        fromVlanId: drag.vlanId || 0,
        toNetId: null,
        toCarrier: null,
        toVlanId: 0,
        toMode: null,
        isRemove: true,
      },
    ]);
    setDragging(null);
  }, []);

  const completeAdd = useCallback(
    ({ name, vlanId }) => {
      if (!addDraft) {
        return;
      }
      setPendingMoves(prev => [
        ...without(prev, addDraft.drag),
        {
          hostKey: addDraft.hostKey,
          hostKind: addDraft.drag.hostKind,
          machineName: addDraft.drag.machineName,
          link: addDraft.drag.link,
          adapter: null,
          fromNetId: null,
          fromVlanId: 0,
          toNetId: `${addDraft.carrier}|${vlanId}`,
          toCarrier: addDraft.carrier,
          toVlanId: vlanId,
          toMode: null,
          isAdd: true,
          newName: name,
        },
      ]);
      setAddDraft(null);
    },
    [addDraft]
  );

  const retargetVlan = useCallback((move, raw) => {
    const min = move.fromVlanId > 0 ? 1 : 0;
    const vlan = Math.max(min, Math.min(VLAN_MAX, parseInt(raw, 10) || 0));
    setPendingMoves(prev =>
      prev.map(entry =>
        entry.machineName === move.machineName && entry.link === move.link
          ? { ...entry, toVlanId: vlan, toNetId: `${entry.toCarrier}|${vlan}` }
          : entry
      )
    );
  }, []);

  const renameNic = useCallback((move, raw) => {
    setPendingMoves(prev =>
      prev.map(entry =>
        entry.machineName === move.machineName && entry.link === move.link
          ? { ...entry, newName: raw }
          : entry
      )
    );
  }, []);

  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') {
        setDragging(prev => (prev?.drag?.pinnedCarrier ? null : prev));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return {
    dragging,
    setDragging,
    trashOver,
    setTrashOver,
    pendingMoves,
    setPendingMoves,
    addDraft,
    setAddDraft,
    stageMove,
    stageCarrierMove,
    stageRemove,
    completeAdd,
    retargetVlan,
    renameNic,
  };
};

export default useTopologyRewire;
