import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AdminRows, PptRows, RctlRows, VirtfsRows, seededRowKey } from './ResourceControlsRows';

const MEMORY_KEYS = ['physical', 'swap', 'locked'];

const FLAG_KEYS = ['default', 'lower', 'upper'];

const TriSelect = ({ id, mode, setMode, hasCurrent = false }) => {
  const { t } = useTranslation();
  return (
    <select
      id={id}
      className="form-select form-select-sm w-auto"
      value={mode}
      onChange={event => setMode(event.target.value)}
    >
      <option value="">{t('machineEdit.resources.unchanged')}</option>
      <option value="set">{t('machineEdit.resources.setOption')}</option>
      {hasCurrent ? (
        <option value="remove">{t('machineEdit.resources.removeOption')}</option>
      ) : null}
    </select>
  );
};

TriSelect.propTypes = {
  id: PropTypes.string.isRequired,
  mode: PropTypes.string.isRequired,
  setMode: PropTypes.func.isRequired,
  hasCurrent: PropTypes.bool,
};

const currentLine = value =>
  value && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');

const cleanObject = entries => {
  const cleaned = Object.fromEntries(
    Object.entries(entries)
      .map(([key, value]) => [key, String(value).trim()])
      .filter(([, value]) => value !== '')
  );
  return Object.keys(cleaned).length > 0 ? cleaned : null;
};

const seedOf = knobCurrent => ({
  cappedCpu: knobCurrent?.capped_cpu ?? null,
  cappedMemory: knobCurrent?.capped_memory ?? null,
  dedicatedCpu: knobCurrent?.dedicated_cpu ?? null,
  securityFlags: knobCurrent?.security_flags ?? null,
  fsAllowed: knobCurrent?.fs_allowed ?? null,
  rctls: Array.isArray(knobCurrent?.rctls) ? knobCurrent.rctls : [],
  admins: Array.isArray(knobCurrent?.admins) ? knobCurrent.admins : [],
  virtfs: Array.isArray(knobCurrent?.virtfs) ? knobCurrent.virtfs : [],
  ppt: Array.isArray(knobCurrent?.ppt) ? knobCurrent.ppt : [],
});

const tri = (mode, set, removeAs = null) => {
  if (mode === 'set') {
    return set();
  }
  return mode === 'remove' ? { value: removeAs } : undefined;
};

const scalarChanges = ({ cappedCpu, cappedMemory, dedicatedCpu, securityFlags, fsAllowed }) => {
  const built = {};
  const entries = [
    [
      'capped_cpu',
      tri(cappedCpu.mode, () =>
        cappedCpu.ncpus.trim() ? { value: { ncpus: Number(cappedCpu.ncpus) } } : undefined
      ),
    ],
    [
      'capped_memory',
      tri(cappedMemory.mode, () => {
        const body = cleanObject({
          physical: cappedMemory.physical,
          swap: cappedMemory.swap,
          locked: cappedMemory.locked,
        });
        return body ? { value: body } : undefined;
      }),
    ],
    [
      'dedicated_cpu',
      tri(dedicatedCpu.mode, () =>
        dedicatedCpu.ncpus.trim()
          ? {
              value: {
                ncpus: dedicatedCpu.ncpus.trim(),
                ...(dedicatedCpu.importance.trim()
                  ? { importance: Number(dedicatedCpu.importance) }
                  : {}),
              },
            }
          : undefined
      ),
    ],
    [
      'security_flags',
      tri(securityFlags.mode, () => {
        const body = cleanObject({
          default: securityFlags.default,
          lower: securityFlags.lower,
          upper: securityFlags.upper,
        });
        return body ? { value: body } : undefined;
      }),
    ],
    [
      'fs_allowed',
      tri(fsAllowed.mode, () =>
        fsAllowed.value.trim() ? { value: fsAllowed.value.trim() } : undefined
      ),
    ],
  ];
  entries.forEach(([key, outcome]) => {
    if (outcome) {
      built[key] = outcome.value;
    }
  });
  return built;
};

const listChanges = ({
  rctlAdds,
  rctlRemoves,
  adminAdds,
  adminRemoves,
  virtfsRows,
  virtfsDirty,
  pptRows,
  pptDirty,
}) => {
  const built = {};
  const rctls = rctlAdds
    .filter(row => row.name.trim() && row.limit.trim())
    .map(row => ({
      name: row.name.trim(),
      limit: row.limit.trim(),
      ...(row.priv.trim() ? { priv: row.priv.trim() } : {}),
      ...(row.action.trim() ? { action: row.action.trim() } : {}),
    }));
  if (rctls.length > 0) {
    built.rctls = rctls;
  }
  if (rctlRemoves.length > 0) {
    built.remove_rctls = rctlRemoves;
  }
  const admins = adminAdds
    .filter(row => row.user.trim() && row.auths.trim())
    .map(row => ({ user: row.user.trim(), auths: row.auths.trim() }));
  if (admins.length > 0) {
    built.admins = admins;
  }
  if (adminRemoves.length > 0) {
    built.remove_admins = adminRemoves;
  }
  if (virtfsDirty) {
    built.virtfs = virtfsRows
      .filter(row => row.name.trim() && row.path.trim())
      .map(row => ({
        name: row.name.trim(),
        path: row.path.trim(),
        ...(row.ro ? { ro: true } : {}),
      }));
  }
  if (pptDirty) {
    built.ppt = pptRows
      .filter(row => row.device.trim())
      .map(row => ({
        device: row.device.trim(),
        ...(row.state.trim() ? { state: row.state.trim() } : {}),
      }));
  }
  return built;
};

const TriBlock = ({ id, titleKey, current, mode, setMode, children }) => {
  const { t } = useTranslation();
  return (
    <div className="col-12 col-lg-6">
      <h6 className="fw-bold">{t(titleKey)}</h6>
      <p className="form-text mt-0 mb-1">
        {t('machineEdit.resources.current')}: {currentLine(current) || '—'}
      </p>
      <div className="d-flex gap-2 align-items-center flex-wrap">
        <TriSelect id={id} mode={mode} setMode={setMode} hasCurrent={Boolean(current)} />
        {mode === 'set' ? children : null}
      </div>
    </div>
  );
};

TriBlock.propTypes = {
  id: PropTypes.string.isRequired,
  titleKey: PropTypes.string.isRequired,
  current: PropTypes.any,
  mode: PropTypes.string.isRequired,
  setMode: PropTypes.func.isRequired,
  children: PropTypes.node,
};

const SmallInput = ({ labelKey, value, onChange }) => {
  const { t } = useTranslation();
  return (
    <input
      className="form-control form-control-sm w-auto"
      placeholder={t(labelKey)}
      aria-label={t(labelKey)}
      value={value}
      onChange={event => onChange(event.target.value)}
    />
  );
};

SmallInput.propTypes = {
  labelKey: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The zonecfg resource controls of a zone, hyperweaver-ui's Resources
 * tab: `capped_cpu`, `capped_memory`, `dedicated_cpu`, `security_flags`
 * and `fs_allowed` each set, removed as null or left alone; the `rctls`
 * and `admins` as adds and removals; the `virtfs` and `ppt` sets replaced
 * whole once touched. The editor seeds from `knob_current` and hands
 * `onChanges` the changed members alone, null while nothing changed.
 */
const ResourceControlsEditor = ({ knobCurrent = null, onChanges, disabled = false }) => {
  const { t } = useTranslation();
  const seed = useMemo(() => seedOf(knobCurrent), [knobCurrent]);
  const [cappedCpu, setCappedCpu] = useState({ mode: '', ncpus: '' });
  const [cappedMemory, setCappedMemory] = useState({
    mode: '',
    physical: '',
    swap: '',
    locked: '',
  });
  const [dedicatedCpu, setDedicatedCpu] = useState({ mode: '', ncpus: '', importance: '' });
  const [securityFlags, setSecurityFlags] = useState({
    mode: '',
    default: '',
    lower: '',
    upper: '',
  });
  const [fsAllowed, setFsAllowed] = useState({ mode: '', value: '' });
  const [rctlAdds, setRctlAdds] = useState([]);
  const [rctlRemoves, setRctlRemoves] = useState([]);
  const [adminAdds, setAdminAdds] = useState([]);
  const [adminRemoves, setAdminRemoves] = useState([]);
  const [virtfsRows, setVirtfsRows] = useState(() =>
    seed.virtfs.map(row => ({
      key: seededRowKey(),
      name: row.name || '',
      path: row.path || '',
      ro: Boolean(row.ro),
    }))
  );
  const [virtfsDirty, setVirtfsDirty] = useState(false);
  const [pptRows, setPptRows] = useState(() =>
    seed.ppt.map(row => ({ key: seededRowKey(), device: row.device || '', state: row.state || '' }))
  );
  const [pptDirty, setPptDirty] = useState(false);

  const changes = useMemo(() => {
    const built = {
      ...scalarChanges({ cappedCpu, cappedMemory, dedicatedCpu, securityFlags, fsAllowed }),
      ...listChanges({
        rctlAdds,
        rctlRemoves,
        adminAdds,
        adminRemoves,
        virtfsRows,
        virtfsDirty,
        pptRows,
        pptDirty,
      }),
    };
    return Object.keys(built).length > 0 ? built : null;
  }, [
    cappedCpu,
    cappedMemory,
    dedicatedCpu,
    securityFlags,
    fsAllowed,
    rctlAdds,
    rctlRemoves,
    adminAdds,
    adminRemoves,
    virtfsRows,
    virtfsDirty,
    pptRows,
    pptDirty,
  ]);

  useEffect(() => {
    onChanges(changes);
  }, [changes, onChanges]);

  const toggleRemove = (list, setList) => name =>
    setList(list.includes(name) ? list.filter(entry => entry !== name) : [...list, name]);

  return (
    <fieldset disabled={disabled} data-editor="resource-controls">
      <p className="form-text text-muted">{t('machineEdit.resources.hint')}</p>
      <div className="row g-4">
        <TriBlock
          id="hw-res-capped-cpu"
          titleKey="machineEdit.resources.cappedCpu"
          current={seed.cappedCpu}
          mode={cappedCpu.mode}
          setMode={mode => setCappedCpu(prev => ({ ...prev, mode }))}
        >
          <SmallInput
            labelKey="machineEdit.resources.ncpus"
            value={cappedCpu.ncpus}
            onChange={ncpus => setCappedCpu(prev => ({ ...prev, ncpus }))}
          />
        </TriBlock>
        <TriBlock
          id="hw-res-dedicated-cpu"
          titleKey="machineEdit.resources.dedicatedCpu"
          current={seed.dedicatedCpu}
          mode={dedicatedCpu.mode}
          setMode={mode => setDedicatedCpu(prev => ({ ...prev, mode }))}
        >
          <SmallInput
            labelKey="machineEdit.resources.ncpusRange"
            value={dedicatedCpu.ncpus}
            onChange={ncpus => setDedicatedCpu(prev => ({ ...prev, ncpus }))}
          />
          <SmallInput
            labelKey="machineEdit.resources.importance"
            value={dedicatedCpu.importance}
            onChange={importance => setDedicatedCpu(prev => ({ ...prev, importance }))}
          />
        </TriBlock>
        <TriBlock
          id="hw-res-capped-memory"
          titleKey="machineEdit.resources.cappedMemory"
          current={seed.cappedMemory}
          mode={cappedMemory.mode}
          setMode={mode => setCappedMemory(prev => ({ ...prev, mode }))}
        >
          {MEMORY_KEYS.map(key => (
            <SmallInput
              key={key}
              labelKey={`machineEdit.resources.${key}`}
              value={cappedMemory[key]}
              onChange={value => setCappedMemory(prev => ({ ...prev, [key]: value }))}
            />
          ))}
        </TriBlock>
        <TriBlock
          id="hw-res-security-flags"
          titleKey="machineEdit.resources.securityFlags"
          current={seed.securityFlags}
          mode={securityFlags.mode}
          setMode={mode => setSecurityFlags(prev => ({ ...prev, mode }))}
        >
          {FLAG_KEYS.map(key => (
            <input
              key={key}
              className="form-control form-control-sm w-auto"
              placeholder={key}
              aria-label={`${t('machineEdit.resources.securityFlags')} ${key}`}
              value={securityFlags[key]}
              onChange={event => setSecurityFlags(prev => ({ ...prev, [key]: event.target.value }))}
            />
          ))}
        </TriBlock>
        <TriBlock
          id="hw-res-fs-allowed"
          titleKey="machineEdit.resources.fsAllowed"
          current={seed.fsAllowed}
          mode={fsAllowed.mode}
          setMode={mode => setFsAllowed(prev => ({ ...prev, mode }))}
        >
          <input
            className="form-control form-control-sm"
            placeholder="ufs,pcfs"
            aria-label={t('machineEdit.resources.fsAllowed')}
            value={fsAllowed.value}
            onChange={event => setFsAllowed(prev => ({ ...prev, value: event.target.value }))}
          />
        </TriBlock>
      </div>
      <hr />
      <RctlRows
        seedRctls={seed.rctls}
        rctlRemoves={rctlRemoves}
        onToggleRemove={toggleRemove(rctlRemoves, setRctlRemoves)}
        rctlAdds={rctlAdds}
        setRctlAdds={setRctlAdds}
      />
      <AdminRows
        seedAdmins={seed.admins}
        adminRemoves={adminRemoves}
        onToggleRemove={toggleRemove(adminRemoves, setAdminRemoves)}
        adminAdds={adminAdds}
        setAdminAdds={setAdminAdds}
      />
      <VirtfsRows
        virtfsRows={virtfsRows}
        setVirtfsRows={setVirtfsRows}
        setVirtfsDirty={setVirtfsDirty}
      />
      <PptRows pptRows={pptRows} setPptRows={setPptRows} setPptDirty={setPptDirty} />
    </fieldset>
  );
};

ResourceControlsEditor.propTypes = {
  knobCurrent: PropTypes.object,
  onChanges: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default ResourceControlsEditor;
