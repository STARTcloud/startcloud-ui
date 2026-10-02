import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa6';

import {
  getKnownOrgs,
  getMachineOrgs,
  getServerOrgs,
  setMachineOrgs,
  setServerOrgs,
} from '../api/orgAccessAPI';

import ToolFormDialog from './ToolFormDialog';

const UUID_PATTERN = /^[0-9a-fA-F-]{8,}$/u;

const LOADING = { loading: true, forbidden: false, problem: '', knownOrgs: [] };

const orgRows = (knownOrgs, selected) => {
  const knownUuids = new Set(knownOrgs.map(org => org.uuid));
  return [
    ...knownOrgs,
    ...selected
      .filter(uuid => !knownUuids.has(uuid))
      .map(uuid => ({ uuid, name: null, roles: [], primary: false })),
  ];
};

const readOf = ([assignment, known], t) => {
  const state = {
    loading: false,
    forbidden: false,
    problem: '',
    knownOrgs: known.status === 'fulfilled' ? known.value : [],
    selected: [],
  };
  if (assignment.status === 'fulfilled') {
    state.selected = assignment.value?.orgs || [];
  } else if (assignment.reason.status === 403) {
    state.forbidden = true;
  } else {
    state.problem = assignment.reason.message || t('host.orgAssignment.loadFailed');
  }
  return state;
};

/**
 * The dialog that assigns the organizations of a registered agent, with
 * no `machineName`, or of one machine, on the `hyperweaver-server` role
 * alone, hyperweaver-ui's: every organization the person can reach as a
 * box, a uuid outside that list kept as its own row so a narrower
 * manager never drops another's assignment, and a typed uuid added by
 * hand; Save sends the whole list, `PUT /api/servers/{id}/orgs` or
 * `PUT /api/servers/{id}/machines/{name}/orgs`, a 403 drawn as the
 * forbidden line. The assignment and the organizations are read once on
 * open.
 */
const OrgAssignmentModal = ({ serverId, machineName = null, targetLabel, onClose }) => {
  const { t } = useTranslation();
  const [read, setRead] = useState(LOADING);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [manualUuid, setManualUuid] = useState('');

  const load = useCallback(
    () =>
      Promise.allSettled([
        machineName === null ? getServerOrgs(serverId) : getMachineOrgs(serverId, machineName),
        getKnownOrgs(),
      ]).then(answers => {
        const { selected: chosen, ...state } = readOf(answers, t);
        setRead(state);
        setSelected(chosen);
      }),
    [serverId, machineName, t]
  );

  useEffect(() => {
    load();
  }, [load]);

  const options = useMemo(() => orgRows(read.knownOrgs, selected), [read.knownOrgs, selected]);
  const setProblem = problem => setRead(current => ({ ...current, problem }));

  const toggle = uuid =>
    setSelected(current =>
      current.includes(uuid) ? current.filter(item => item !== uuid) : [...current, uuid]
    );

  const addManual = () => {
    const uuid = manualUuid.trim();
    if (!UUID_PATTERN.test(uuid)) {
      setProblem(t('host.orgAssignment.invalidUuid'));
      return;
    }
    setProblem('');
    if (!selected.includes(uuid)) {
      setSelected(current => [...current, uuid]);
    }
    setManualUuid('');
  };

  const submit = async () => {
    setSaving(true);
    setProblem('');
    try {
      if (machineName === null) {
        await setServerOrgs(serverId, selected);
      } else {
        await setMachineOrgs(serverId, machineName, selected);
      }
      onClose(true);
    } catch (error) {
      if (error.status === 403) {
        setRead(current => ({ ...current, forbidden: true }));
      } else {
        setProblem(error.message || t('host.orgAssignment.saveFailed'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ToolFormDialog
      dialog="org-assignment"
      title={
        machineName === null
          ? t('host.orgAssignment.agentTitle', { target: targetLabel })
          : t('host.orgAssignment.machineTitle', { target: targetLabel })
      }
      submitKey="host.orgAssignment.save"
      busy={saving || read.loading || read.forbidden}
      onClose={() => onClose(false)}
      onSubmit={submit}
    >
      {read.problem ? (
        <div className="alert alert-danger" role="alert" data-note="problem">
          {read.problem}
        </div>
      ) : null}
      {read.forbidden ? (
        <div className="alert alert-warning" role="alert" data-note="forbidden">
          {t('host.orgAssignment.forbidden')}
        </div>
      ) : null}
      <p className="text-muted">
        {machineName === null
          ? t('host.orgAssignment.agentHelp')
          : t('host.orgAssignment.machineHelp')}
      </p>
      {read.loading ? (
        <div className="text-center py-3">
          <span
            className="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          />
          {t('host.orgAssignment.loading')}
        </div>
      ) : (
        <>
          {options.length === 0 ? (
            <p className="text-muted fst-italic">{t('host.orgAssignment.noKnownOrgs')}</p>
          ) : null}
          {options.map(org => (
            <div className="form-check" key={org.uuid} data-org-option={org.uuid}>
              <input
                className="form-check-input"
                type="checkbox"
                id={`org-${org.uuid}`}
                checked={selected.includes(org.uuid)}
                onChange={() => toggle(org.uuid)}
                disabled={read.forbidden}
              />
              <label className="form-check-label" htmlFor={`org-${org.uuid}`}>
                {org.name || <code>{org.uuid}</code>}
                {org.name ? <code className="ms-2 small text-muted">{org.uuid}</code> : null}
                {org.primary ? (
                  <span className="badge text-bg-info ms-2">{t('host.orgAssignment.primary')}</span>
                ) : null}
              </label>
            </div>
          ))}
          <div className="input-group mt-3">
            <input
              type="text"
              className="form-control"
              placeholder={t('host.orgAssignment.manualUuidPlaceholder')}
              value={manualUuid}
              onChange={event => setManualUuid(event.target.value)}
              disabled={read.forbidden}
              aria-label={t('host.orgAssignment.manualUuidPlaceholder')}
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              data-action="add-uuid"
              onClick={addManual}
              disabled={read.forbidden || !manualUuid.trim()}
            >
              <FaPlus className="me-1" aria-hidden="true" />
              {t('host.orgAssignment.addUuid')}
            </button>
          </div>
          {machineName === null && selected.length === 0 ? (
            <div className="alert alert-info mt-3 mb-0" role="status">
              {t('host.orgAssignment.openAgentNote')}
            </div>
          ) : null}
        </>
      )}
    </ToolFormDialog>
  );
};

OrgAssignmentModal.propTypes = {
  serverId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  machineName: PropTypes.string,
  targetLabel: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default OrgAssignmentModal;
