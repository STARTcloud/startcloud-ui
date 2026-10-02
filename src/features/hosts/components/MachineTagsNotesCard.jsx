import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFloppyDisk } from 'react-icons/fa6';

import SectionCard, { foldsShape } from '../../../components/common/SectionCard';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { saveMachineNotes, saveMachineTags } from '../api/machines';
import { parseTags, tagsOf, tagsText } from '../utils/machines';

const FOLD = 'machine-tags-notes';

const NOTE_ROWS = 2;

const seedOf = ({ id, name, detail }) => {
  const tags = tagsText(tagsOf(detail.machine_info));
  const notes = typeof detail.machine_info?.notes === 'string' ? detail.machine_info.notes : '';
  return { key: `${id}|${name}|${tags}|${notes}`, tags, notes };
};

const writesOf = ({ status, id, name, seed, draft }) => {
  const tags = parseTags(draft.tags);
  return [
    ...(draft.tags === seed.tags
      ? []
      : [saveMachineTags(status, id, name, tags.length > 0 ? tags : null)]),
    ...(draft.notes === seed.notes
      ? []
      : [saveMachineNotes(status, id, name, draft.notes.trim() === '' ? null : draft.notes)]),
  ];
};

/**
 * The tags and the notes of one machine, hyperweaver-ui's tags and notes
 * panel, a section card that folds under `machine-tags-notes`: the tags
 * as one field, a comma between two, and the notes as free text, both
 * kept by the agent at once with no task and while the machine runs.
 * Save is held until a field differs from what the detail answered and
 * sends the one request of each field that does, `PUT
 * machines/{name}/tags` and `PUT machines/{name}/notes`, an emptied
 * field sent as null; one notice says the save or carries the agent's
 * own message, and after a success `onSaved` reads the held copies again
 * once. The fields take the detail's values again whenever it answers
 * new ones.
 */
const MachineTagsNotesCard = ({ id, name, detail, onSaved, folds }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const seed = seedOf({ id, name, detail });
  const [draft, setDraft] = useState(seed);
  const [saving, setSaving] = useState(false);

  if (draft.key !== seed.key) {
    setDraft(seed);
  }

  const changed = draft.tags !== seed.tags || draft.notes !== seed.notes;

  const save = async () => {
    setSaving(true);
    const answers = await Promise.allSettled(writesOf({ status, id, name, seed, draft }));
    const failed = answers.filter(answer => answer.status === 'rejected');
    setSaving(false);
    if (failed.length > 0) {
      notify('danger', failed.map(answer => answer.reason.message).join('; '));
    } else {
      notify('success', t('machine.tagsNotesPanel.saved'));
    }
    if (failed.length < answers.length) {
      onSaved();
    }
  };

  return (
    <div className="col-12 col-lg-6 col-xxl-4" data-panel="machine-tags-notes">
      <SectionCard
        title={t('machine.tagsNotesPanel.heading')}
        className="mb-0 h-100"
        folded={folds.folded(FOLD)}
        onFold={() => folds.toggle(FOLD)}
      >
        <p className="form-text text-muted mt-0">
          {t('machine.tagsNotesPanel.savedImmediatelyNote')}
        </p>
        <div className="mb-3">
          <label className="form-label" htmlFor="machine-tags">
            {t('machine.tagsNotesPanel.tagsLabel')}
          </label>
          <input
            id="machine-tags"
            className="form-control"
            type="text"
            placeholder={t('machine.tagsNotesPanel.tagsPlaceholder')}
            value={draft.tags}
            disabled={saving}
            onChange={event => setDraft({ ...draft, tags: event.target.value })}
          />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="machine-notes">
            {t('machine.tagsNotesPanel.notesLabel')}
          </label>
          <textarea
            id="machine-notes"
            className="form-control"
            rows={NOTE_ROWS}
            value={draft.notes}
            disabled={saving}
            onChange={event => setDraft({ ...draft, notes: event.target.value })}
          />
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          data-action="save-tags-notes"
          disabled={saving || !changed}
          onClick={save}
        >
          <FaFloppyDisk className="me-2" aria-hidden="true" />
          {t('machine.tagsNotesPanel.saveButton')}
        </button>
      </SectionCard>
    </div>
  );
};

MachineTagsNotesCard.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  detail: PropTypes.object.isRequired,
  onSaved: PropTypes.func.isRequired,
  folds: foldsShape.isRequired,
};

export default MachineTagsNotesCard;
