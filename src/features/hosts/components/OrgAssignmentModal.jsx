import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBuildingUser } from 'react-icons/fa6';

import DiscardPrompt, { useDiscardGuard } from '../../../components/common/DiscardPrompt';
import { OrgSwitcherModal } from '../../../components/layout/OrgSwitcherModal';
import {
  getKnownOrgs,
  getMachineOrgs,
  getServerOrgs,
  setMachineOrgs,
  setServerOrgs,
} from '../api/orgAccessAPI';

const LOADING = {
  loading: true,
  forbidden: false,
  unread: false,
  problem: '',
  knownOrgs: [],
  assigned: [],
};

/**
 * The rows of the assignment switcher, which draws them by name: every
 * organization the person can reach, and each assigned uuid outside that
 * list as a row of its own, named by the uuid, so a narrower manager
 * never drops another's assignment.
 *
 * @param {Array<{ uuid: string, name: string }>} knownOrgs - The organizations of `getKnownOrgs`
 * @param {Array<string>} assigned - The uuids the assignment answered
 * @returns {Array<Object>} The rows in the chrome's organization shape
 */
export const assignmentRows = (knownOrgs, assigned) => {
  const knownUuids = new Set(knownOrgs.map(org => org.uuid));
  return [
    ...knownOrgs,
    ...assigned
      .filter(uuid => !knownUuids.has(uuid))
      .map(uuid => ({ uuid, name: uuid, roles: [], primary: false })),
  ];
};

const sameUuids = (a, b) => a.length === b.length && a.every(uuid => b.includes(uuid));

const readOf = ([assignment, known], t) => {
  const state = {
    loading: false,
    forbidden: false,
    unread: false,
    problem: '',
    knownOrgs: known.status === 'fulfilled' ? known.value : [],
    assigned: [],
  };
  if (assignment.status === 'fulfilled') {
    state.assigned = assignment.value?.orgs || [];
  } else if (assignment.reason.status === 403) {
    state.forbidden = true;
  } else {
    state.unread = true;
    state.problem = assignment.reason.message || t('host.orgAssignment.loadFailed');
  }
  return state;
};

/**
 * The dialog that assigns the organizations of a registered agent, with
 * no `machineName`, or of one machine, on the `hyperweaver-server` role
 * alone: the organization switcher in its multi-select variant, every
 * organization the person can reach as a row, the assigned ones selected
 * on open, a row toggling in or out of the selection, an assigned uuid
 * outside the person's reach kept as its own row so a narrower manager
 * never drops another's assignment; Save sends the whole list,
 * `PUT /api/servers/{id}/orgs` or
 * `PUT /api/servers/{id}/machines/{name}/orgs`, a 403 drawn as the
 * forbidden line and Save held while the assignment could not be read.
 * The assignment and the organizations are read once on open. While the
 * selection differs from the assignment read, a backdrop click, Escape,
 * the close button and Cancel ask the discard prompt before the dialog
 * closes.
 */
const OrgAssignmentModal = ({ serverId, machineName = null, targetLabel, onClose }) => {
  const { t } = useTranslation();
  const [read, setRead] = useState(LOADING);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const guard = useDiscardGuard(!sameUuids(selected, read.assigned), () => onClose(false));

  const load = useCallback(
    () =>
      Promise.allSettled([
        machineName === null ? getServerOrgs(serverId) : getMachineOrgs(serverId, machineName),
        getKnownOrgs(),
      ]).then(answers => {
        const state = readOf(answers, t);
        setRead(state);
        setSelected(state.assigned);
      }),
    [serverId, machineName, t]
  );

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(
    () => assignmentRows(read.knownOrgs, read.assigned),
    [read.knownOrgs, read.assigned]
  );
  const setProblem = problem => setRead(current => ({ ...current, problem }));

  const toggle = uuid =>
    setSelected(current =>
      current.includes(uuid) ? current.filter(item => item !== uuid) : [...current, uuid]
    );

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
    <>
      <OrgSwitcherModal
        show
        onHide={guard.close}
        dialog="org-assignment"
        icon={<FaBuildingUser className="me-2" />}
        title={
          machineName === null
            ? t('host.orgAssignment.agentTitle', { target: targetLabel })
            : t('host.orgAssignment.machineTitle', { target: targetLabel })
        }
        organizations={rows}
        selection={{
          selected,
          onToggle: toggle,
          onSave: submit,
          saveText: t('host.orgAssignment.save'),
          busy: saving || read.loading || read.forbidden || read.unread,
        }}
        loading={read.loading}
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
        {rows.length === 0 ? (
          <p className="text-muted fst-italic">{t('host.orgAssignment.noKnownOrgs')}</p>
        ) : null}
        {machineName === null && selected.length === 0 ? (
          <div className="alert alert-info" role="status" data-note="open-agent">
            {t('host.orgAssignment.openAgentNote')}
          </div>
        ) : null}
      </OrgSwitcherModal>
      <DiscardPrompt {...guard.prompt} />
    </>
  );
};

OrgAssignmentModal.propTypes = {
  serverId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  machineName: PropTypes.string,
  targetLabel: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default OrgAssignmentModal;
