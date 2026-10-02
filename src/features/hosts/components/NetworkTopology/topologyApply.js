const vboxBody = ({ updates, adds, removes }) => ({
  ...(updates.length > 0
    ? {
        nics: updates.map(move => ({
          adapter: move.adapter,
          mode: move.toMode,
          ...(move.toMode === 'nat' ? {} : { network: move.toCarrier }),
        })),
      }
    : {}),
  ...(adds.length > 0 ? { add_nics: adds.map(move => ({ global_nic: move.toCarrier })) } : {}),
  ...(removes.length > 0 ? { remove_nics: removes.map(move => move.adapter) } : {}),
});

const bhyveBody = ({ updates, adds, removes }) => ({
  ...(updates.length > 0
    ? {
        update_nics: updates.map(move => ({
          physical: move.link,
          global_nic: move.toCarrier,
          ...(move.toVlanId > 0 ? { vlan_id: move.toVlanId } : {}),
        })),
      }
    : {}),
  ...(adds.length > 0
    ? {
        add_nics: adds.map(move => ({
          physical: String(move.newName).trim(),
          global_nic: move.toCarrier,
          ...(move.toVlanId > 0 ? { vlan_id: move.toVlanId } : {}),
        })),
      }
    : {}),
  ...(removes.length > 0 ? { remove_nics: removes.map(move => move.link) } : {}),
});

/**
 * The body of `PUT machines/{name}` a set of staged moves of one machine
 * sends, hyperweaver-ui's per host kind: bhyve speaks `update_nics`,
 * `add_nics` and `remove_nics` by VNIC name, the agent creating one on
 * demand from `global_nic` and `vlan_id`; VirtualBox speaks `nics` for
 * a re-attachment, `add_nics` always bridged and `remove_nics` by adapter
 * number. A bhyve add without its VNIC name answers the `unnamed` error.
 *
 * @param {string} hostKind - `bhyve` or `vbox`
 * @param {Array<Object>} moves - The staged rows of one machine
 * @returns {{ body?: Object, error?: string }} The body, or the error
 */
export const buildNicBody = (hostKind, moves) => {
  const adds = moves.filter(move => move.isAdd);
  const removes = moves.filter(move => move.isRemove);
  const updates = moves.filter(move => !move.isAdd && !move.isRemove);
  if (hostKind === 'vbox') {
    return { body: vboxBody({ updates, adds, removes }) };
  }
  if (adds.some(move => !String(move.newName || '').trim())) {
    return { error: 'unnamed' };
  }
  return { body: bhyveBody({ updates, adds, removes }) };
};

export default buildNicBody;
