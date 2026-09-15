import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import FormErrorSummary from '../../../../components/common/FormErrorSummary';
import { formRulesShape, useFormRules } from '../../../../hooks/useFormRules';
import { log } from '../../../../lib/logger';
import {
  CHECKSUM_TYPES,
  FILE_ARCHITECTURES,
  FILE_KINDS,
  FILE_PLATFORMS,
  PLACE_LABELS,
  PLACE_SCHEMA,
} from '../../../../utils/forms';
import { isVisible } from '../../../../utils/validation';
import { api } from '../api/downloads';

import { SelectField, TextField } from './fields';

const NARROW = 'mb-2 col-md-4';

const levelsShape = PropTypes.shape({
  product: PropTypes.string,
  release: PropTypes.string,
  patch: PropTypes.string,
});

const pendingShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  file_name: PropTypes.string,
  guess: PropTypes.object,
});

const fixedOf = levels => ({
  product: Boolean(levels.product),
  release: Boolean(levels.release),
  patch: Boolean(levels.patch),
});

const draftFrom = (pending, levels) => {
  const guess = pending.guess || {};
  return {
    product: levels.product || guess.product || '',
    release: levels.release || guess.release || '',
    patch: levels.patch || guess.patch || '',
    key: guess.key || '',
    file_name: pending.file_name || '',
    kind: guess.kind || FILE_KINDS[0],
    platform: guess.platform || 'any',
    architecture: guess.architecture || 'any',
    language: guess.language || 'any',
    variant: '',
    checksum_type: 'NULL',
    checksum: '',
  };
};

const LevelFields = ({ draft, rules, fixed, onChange }) => {
  const { t } = useTranslation();
  return (
    <>
      <TextField
        name="product"
        draft={draft}
        rules={rules}
        onChange={onChange}
        hint={t('downloads.place.productHint')}
        className={NARROW}
        readOnly={fixed.product}
      />
      <TextField
        name="release"
        draft={draft}
        rules={rules}
        onChange={onChange}
        hint={t('downloads.place.releaseHint')}
        className={NARROW}
        readOnly={fixed.release}
      />
      <TextField
        name="patch"
        draft={draft}
        rules={rules}
        onChange={onChange}
        hint={t('downloads.place.patchHint')}
        className={NARROW}
        readOnly={fixed.patch}
      />
    </>
  );
};

LevelFields.propTypes = {
  draft: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  fixed: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * The placing form of one dropped file: the three levels it belongs to,
 * read-only where the page already fixes them, then the file's own fields as
 * the file form draws them, prefilled from the words the file name gave.
 */
const PlaceForm = ({ draft, rules, fixed, onChange, onSubmit }) => {
  const { t } = useTranslation();
  return (
    <div className="w-100 order-last">
      <h3 className="h6 mb-2">{t('downloads.place.title')}</h3>
      <form onSubmit={onSubmit} noValidate>
        <FormErrorSummary errors={rules.summary} />
        <LevelFields draft={draft} rules={rules} fixed={fixed} onChange={onChange} />
        <TextField
          name="key"
          draft={draft}
          rules={rules}
          onChange={onChange}
          hint={t('downloads.hints.identifier')}
          className={NARROW}
        />
        <TextField
          name="file_name"
          draft={draft}
          rules={rules}
          onChange={onChange}
          className={NARROW}
        />
        <SelectField
          name="kind"
          group="kind"
          options={FILE_KINDS}
          draft={draft}
          rules={rules}
          onChange={onChange}
        />
        <SelectField
          name="platform"
          group="platform"
          options={FILE_PLATFORMS}
          draft={draft}
          rules={rules}
          onChange={onChange}
        />
        <SelectField
          name="architecture"
          group="architecture"
          options={FILE_ARCHITECTURES}
          draft={draft}
          rules={rules}
          onChange={onChange}
        />
        <TextField
          name="language"
          draft={draft}
          rules={rules}
          onChange={onChange}
          hint={t('downloads.hints.language')}
          className={NARROW}
        />
        <TextField
          name="variant"
          draft={draft}
          rules={rules}
          onChange={onChange}
          className={NARROW}
        />
        <SelectField
          name="checksum_type"
          options={CHECKSUM_TYPES}
          draft={draft}
          rules={rules}
          onChange={onChange}
        />
        {isVisible(PLACE_SCHEMA.properties.checksum, [draft]) ? (
          <TextField name="checksum" draft={draft} rules={rules} onChange={onChange} />
        ) : null}
      </form>
    </div>
  );
};

PlaceForm.propTypes = {
  draft: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  fixed: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

/**
 * The section's action row while a pending upload waits to be placed: Cancel
 * where the Add New stood and Save beside it, with the placing form wrapped
 * under the heading row. Save posts the levels and the file's fields to the
 * pending upload's `place` route and reloads the page on the address it
 * answers; a refused write paints at the fields. Cancel discards the pending
 * upload.
 *
 * @param {Object} props - The pane
 * @param {string} props.org - The organization the file went to
 * @param {Object} props.pending - The pending upload the last chunk answered
 * @param {Object} props.levels - The levels the page fixes
 * @param {boolean} props.isPublic - The visibility picked on the zone
 * @param {Function} props.notify - The chrome's notice function
 * @param {Function} props.reload - Reloads the page's data
 * @param {Function} props.onDone - Clears the pending upload the zone holds
 * @returns {React.ReactNode} The pane
 */
export const PlacePane = ({ org, pending, levels, isPublic, notify, reload, onDone }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(() => draftFrom(pending, levels));
  const rules = useFormRules({
    formKey: 'downloadFile',
    schema: PLACE_SCHEMA,
    values: draft,
    labels: PLACE_LABELS,
    idPrefix: 'download-place',
  });

  const onChange = useCallback(event => {
    const { name, value } = event.target;
    setDraft(current => ({ ...current, [name]: value }));
  }, []);

  const save = () => {
    if (!rules.validateAll()) {
      return;
    }
    api.pending
      .place(org, pending.id, { ...draft, is_public: isPublic })
      .then(() => {
        notify('success', t('downloads.place.done'));
        onDone();
        reload();
      })
      .catch(error => {
        if (rules.applyServerErrors(error)) {
          return;
        }
        log.api.error('Error placing a download file', {
          pendingId: pending.id,
          error: error.message,
        });
        notify('danger', t(error.messageKey || 'errors.request'));
      });
  };

  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  const submit = useCallback(event => {
    event.preventDefault();
    saveRef.current();
  }, []);

  const cancel = () => {
    api.pending.discard(org, pending.id).catch(error => {
      log.api.error('Error discarding a pending upload', {
        pendingId: pending.id,
        error: error.message,
      });
    });
    onDone();
  };

  return (
    <>
      <button type="button" className="btn btn-sm btn-secondary me-2" onClick={cancel}>
        {t('boxes.buttons.cancel')}
      </button>
      <button type="button" className="btn btn-sm btn-success" onClick={save}>
        {t('boxes.buttons.save')}
      </button>
      <PlaceForm
        draft={draft}
        rules={rules}
        fixed={fixedOf(levels)}
        onChange={onChange}
        onSubmit={submit}
      />
    </>
  );
};

PlacePane.propTypes = {
  org: PropTypes.string.isRequired,
  pending: pendingShape.isRequired,
  levels: levelsShape.isRequired,
  isPublic: PropTypes.bool.isRequired,
  notify: PropTypes.func.isRequired,
  reload: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
};

export default PlaceForm;
