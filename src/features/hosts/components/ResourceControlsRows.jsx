import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaTrash, FaXmark } from 'react-icons/fa6';

const RCTL_KEYS = ['name', 'limit', 'priv', 'action'];

const ADMIN_KEYS = ['user', 'auths'];

const rowKey = () => `${Date.now()}-${Math.random()}`;

const patchAt = (rows, key, patch) =>
  rows.map(entry => (entry.key === key ? { ...entry, ...patch } : entry));

const withoutKey = (rows, key) => rows.filter(entry => entry.key !== key);

const MarkButton = ({ marked, onClick }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={`btn btn-sm ${marked ? 'btn-danger' : 'btn-outline-danger'} ms-auto`}
      title={t('machineEdit.resources.markRemove')}
      onClick={onClick}
    >
      <FaTrash aria-hidden="true" />
    </button>
  );
};

MarkButton.propTypes = {
  marked: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

const DropButton = ({ onClick }) => {
  const { t } = useTranslation();
  return (
    <div className="col-auto">
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        title={t('machineEdit.resources.dropRow')}
        onClick={onClick}
      >
        <FaXmark aria-hidden="true" />
      </button>
    </div>
  );
};

DropButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};

const AddButton = ({ labelKey, onClick }) => {
  const { t } = useTranslation();
  return (
    <button type="button" className="btn btn-sm btn-outline-primary mb-3" onClick={onClick}>
      <FaPlus className="me-1" aria-hidden="true" />
      {t(labelKey)}
    </button>
  );
};

AddButton.propTypes = {
  labelKey: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

/**
 * The resource controls of a zone, `rctls`: the current ones with a mark
 * that removes each and the rows to add, name, limit, privilege and
 * action.
 */
export const RctlRows = ({ seedRctls, rctlRemoves, onToggleRemove, rctlAdds, setRctlAdds }) => {
  const { t } = useTranslation();
  return (
    <>
      <h6 className="fw-bold">{t('machineEdit.resources.rctls')}</h6>
      {seedRctls.map(row => (
        <div key={row.name} className="d-flex align-items-center gap-2 small font-monospace py-1">
          <span className="text-truncate">
            {row.name} = {row.limit} ({row.priv || 'privileged'}/{row.action || 'deny'})
          </span>
          <MarkButton
            marked={rctlRemoves.includes(row.name)}
            onClick={() => onToggleRemove(row.name)}
          />
        </div>
      ))}
      {rctlAdds.map(row => (
        <div key={row.key} className="row g-2 align-items-center mb-1">
          {RCTL_KEYS.map(key => (
            <div className="col" key={key}>
              <input
                className="form-control form-control-sm"
                placeholder={t(`machineEdit.resources.rctl_${key}`)}
                aria-label={t(`machineEdit.resources.rctl_${key}`)}
                value={row[key]}
                onChange={event =>
                  setRctlAdds(prev => patchAt(prev, row.key, { [key]: event.target.value }))
                }
              />
            </div>
          ))}
          <DropButton onClick={() => setRctlAdds(prev => withoutKey(prev, row.key))} />
        </div>
      ))}
      <AddButton
        labelKey="machineEdit.resources.addRctl"
        onClick={() =>
          setRctlAdds(prev => [
            ...prev,
            { key: rowKey(), name: '', limit: '', priv: '', action: '' },
          ])
        }
      />
    </>
  );
};

RctlRows.propTypes = {
  seedRctls: PropTypes.array.isRequired,
  rctlRemoves: PropTypes.array.isRequired,
  onToggleRemove: PropTypes.func.isRequired,
  rctlAdds: PropTypes.array.isRequired,
  setRctlAdds: PropTypes.func.isRequired,
};

/**
 * The delegated administrators of a zone, `admins`: the current ones with
 * a mark that removes each and the rows to add, user and authorizations.
 */
export const AdminRows = ({
  seedAdmins,
  adminRemoves,
  onToggleRemove,
  adminAdds,
  setAdminAdds,
}) => {
  const { t } = useTranslation();
  return (
    <>
      <h6 className="fw-bold">{t('machineEdit.resources.admins')}</h6>
      {seedAdmins.map(row => (
        <div key={row.user} className="d-flex align-items-center gap-2 small font-monospace py-1">
          <span className="text-truncate">
            {row.user}: {row.auths}
          </span>
          <MarkButton
            marked={adminRemoves.includes(row.user)}
            onClick={() => onToggleRemove(row.user)}
          />
        </div>
      ))}
      {adminAdds.map(row => (
        <div key={row.key} className="row g-2 align-items-center mb-1">
          {ADMIN_KEYS.map(key => (
            <div className="col" key={key}>
              <input
                className="form-control form-control-sm"
                placeholder={t(`machineEdit.resources.admin_${key}`)}
                aria-label={t(`machineEdit.resources.admin_${key}`)}
                value={row[key]}
                onChange={event =>
                  setAdminAdds(prev => patchAt(prev, row.key, { [key]: event.target.value }))
                }
              />
            </div>
          ))}
          <DropButton onClick={() => setAdminAdds(prev => withoutKey(prev, row.key))} />
        </div>
      ))}
      <AddButton
        labelKey="machineEdit.resources.addAdmin"
        onClick={() => setAdminAdds(prev => [...prev, { key: rowKey(), user: '', auths: '' }])}
      />
    </>
  );
};

AdminRows.propTypes = {
  seedAdmins: PropTypes.array.isRequired,
  adminRemoves: PropTypes.array.isRequired,
  onToggleRemove: PropTypes.func.isRequired,
  adminAdds: PropTypes.array.isRequired,
  setAdminAdds: PropTypes.func.isRequired,
};

/**
 * The virtfs shares of a zone, the whole set replaced on apply: a share
 * name, its host path and whether it is read-only.
 */
export const VirtfsRows = ({ virtfsRows, setVirtfsRows, setVirtfsDirty }) => {
  const { t } = useTranslation();
  const patch = (key, change) => {
    setVirtfsDirty(true);
    setVirtfsRows(prev => patchAt(prev, key, change));
  };
  return (
    <>
      <h6 className="fw-bold">{t('machineEdit.resources.virtfs')}</h6>
      <p className="form-text mt-0 mb-1">{t('machineEdit.resources.virtfsNote')}</p>
      {virtfsRows.map(row => (
        <div key={row.key} className="row g-2 align-items-center mb-1">
          <div className="col-3">
            <input
              className="form-control form-control-sm"
              placeholder={t('machineEdit.resources.shareName')}
              aria-label={t('machineEdit.resources.shareName')}
              value={row.name}
              onChange={event => patch(row.key, { name: event.target.value })}
            />
          </div>
          <div className="col">
            <input
              className="form-control form-control-sm font-monospace"
              placeholder={t('machineEdit.resources.sharePath')}
              aria-label={t('machineEdit.resources.sharePath')}
              value={row.path}
              onChange={event => patch(row.key, { path: event.target.value })}
            />
          </div>
          <div className="col-auto form-check ms-2">
            <input
              id={`hw-virtfs-ro-${row.key}`}
              className="form-check-input"
              type="checkbox"
              checked={row.ro}
              onChange={event => patch(row.key, { ro: event.target.checked })}
            />
            <label className="form-check-label" htmlFor={`hw-virtfs-ro-${row.key}`}>
              {t('machineEdit.resources.readOnly')}
            </label>
          </div>
          <DropButton
            onClick={() => {
              setVirtfsDirty(true);
              setVirtfsRows(prev => withoutKey(prev, row.key));
            }}
          />
        </div>
      ))}
      <AddButton
        labelKey="machineEdit.resources.addShare"
        onClick={() => {
          setVirtfsDirty(true);
          setVirtfsRows(prev => [...prev, { key: rowKey(), name: '', path: '', ro: false }]);
        }}
      />
    </>
  );
};

VirtfsRows.propTypes = {
  virtfsRows: PropTypes.array.isRequired,
  setVirtfsRows: PropTypes.func.isRequired,
  setVirtfsDirty: PropTypes.func.isRequired,
};

/**
 * The PCI passthrough devices of a zone, the whole set replaced on apply:
 * a device and its state.
 */
export const PptRows = ({ pptRows, setPptRows, setPptDirty }) => {
  const { t } = useTranslation();
  const patch = (key, change) => {
    setPptDirty(true);
    setPptRows(prev => patchAt(prev, key, change));
  };
  return (
    <>
      <h6 className="fw-bold">{t('machineEdit.resources.ppt')}</h6>
      <p className="form-text mt-0 mb-1">{t('machineEdit.resources.pptNote')}</p>
      {pptRows.map(row => (
        <div key={row.key} className="row g-2 align-items-center mb-1">
          <div className="col-3">
            <input
              className="form-control form-control-sm font-monospace"
              placeholder="ppt0"
              aria-label={t('machineEdit.resources.pptDevice')}
              value={row.device}
              onChange={event => patch(row.key, { device: event.target.value })}
            />
          </div>
          <div className="col-3">
            <input
              className="form-control form-control-sm"
              placeholder={t('machineEdit.resources.pptState')}
              aria-label={t('machineEdit.resources.pptState')}
              value={row.state}
              onChange={event => patch(row.key, { state: event.target.value })}
            />
          </div>
          <DropButton
            onClick={() => {
              setPptDirty(true);
              setPptRows(prev => withoutKey(prev, row.key));
            }}
          />
        </div>
      ))}
      <AddButton
        labelKey="machineEdit.resources.addPpt"
        onClick={() => {
          setPptDirty(true);
          setPptRows(prev => [...prev, { key: rowKey(), device: '', state: '' }]);
        }}
      />
    </>
  );
};

PptRows.propTypes = {
  pptRows: PropTypes.array.isRequired,
  setPptRows: PropTypes.func.isRequired,
  setPptDirty: PropTypes.func.isRequired,
};

export const seededRowKey = rowKey;
