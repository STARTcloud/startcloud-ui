import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { formRulesShape } from '../../../../hooks/useFormRules';
import { SwitchField, TextField } from '../fields';

/**
 * The issue members a certificate starts from: one year, not an
 * authority, any path length.
 */
export const EMPTY_ISSUE = { days: '365', is_ca: false, path_len: '' };

/**
 * The issue the engine takes from a draft: the days as a number, the
 * path length a number or null while an authority, null otherwise.
 *
 * @param {Object} draft - The form's draft
 * @returns {{ days: number, is_ca: boolean, path_len: number|null }} The issue
 */
export const issueOf = draft => ({
  days: Number(draft.days),
  is_ca: Boolean(draft.is_ca),
  path_len: draft.is_ca && draft.path_len !== '' ? Number(draft.path_len) : null,
});

/**
 * The fields an issue shares between a self-signed certificate and a
 * signed request, over the form's rules: the validity in days, the
 * Certificate authority switch with its hint, and the signing depth with
 * its hint while it is an authority, each checked on blur and on submit.
 */
const IssueFields = ({ draft, rules, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="row g-3 mb-3" data-panel="issue">
      <div className="col-md-4">
        <TextField
          name="days"
          type="number"
          min={1}
          draft={draft}
          rules={rules}
          onChange={onChange}
          className="mb-0"
        />
      </div>
      <div className="col-md-4">
        <SwitchField
          name="is_ca"
          draft={draft}
          rules={rules}
          onChange={onChange}
          hint={t('certs.generate.authorityHint')}
          className="mb-0"
        />
      </div>
      {draft.is_ca ? (
        <div className="col-md-4">
          <TextField
            name="path_len"
            type="number"
            min={0}
            draft={draft}
            rules={rules}
            onChange={onChange}
            hint={t('certs.generate.pathLenHint')}
            placeholder={t('certs.generate.pathLenAny')}
            className="mb-0"
          />
        </div>
      ) : null}
    </div>
  );
};

IssueFields.propTypes = {
  draft: PropTypes.object.isRequired,
  rules: formRulesShape.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default IssueFields;
