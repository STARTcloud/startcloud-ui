import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import SectionCard, { foldsShape } from '../../../../components/common/SectionCard';
import { errorKeys } from '../../../../components/common/StepUpDialog';
import { useNotify } from '../../../../contexts/NoticeContext';
import { useStatus } from '../../../../contexts/StatusContext';
import { backupCodesFileName } from '../../../../utils/backupCodes';
import { downloadText } from '../../../certs/utils/download';

/**
 * The Recovery section of the Security tab: the backup-codes count badge,
 * warning at zero, Generate or Regenerate over `POST /api/user/backup-codes`,
 * stepped up, and the codes drawn once with Download shown only while
 * they are on screen, the file saved under the site, `email` and the day.
 */
const RecoverySection = ({ account, email, guard, folds }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const status = useStatus();
  const [remaining, setRemaining] = useState(null);
  const [codes, setCodes] = useState([]);

  const load = useCallback(
    () =>
      account.backupCodes
        .count()
        .then(data => setRemaining(Math.max(0, Number(data?.remaining) || 0)))
        .catch(() => setRemaining(0)),
    [account]
  );

  useEffect(() => {
    load();
  }, [load]);

  const generate = async () => {
    try {
      const data = await guard(
        () => account.backupCodes.generate(),
        t('profile.security.recovery.reason')
      );
      setCodes(Array.isArray(data?.codes) ? data.codes : []);
      await load();
    } catch (error) {
      if (error?.code !== 'step_up_required') {
        notify('danger', t(errorKeys(error)));
      }
    }
  };

  const zero = remaining === 0;

  return (
    <SectionCard
      title={t('profile.security.recovery.title')}
      folded={folds.folded('recovery')}
      onFold={() => folds.toggle('recovery')}
      badge={
        remaining === null ? null : (
          <span className={`badge ${zero ? 'bg-warning text-dark' : 'bg-secondary'}`}>
            {zero
              ? t('profile.security.recovery.none')
              : t('profile.security.recovery.remaining', { count: remaining })}
          </span>
        )
      }
    >
      {codes.length > 0 ? (
        <div className="mb-3">
          <p className="small text-body-secondary">{t('profile.security.recovery.once')}</p>
          <div className="row row-cols-2 g-2 font-monospace mb-2 recovery-codes">
            {codes.map(code => (
              <div key={code} className="col">
                {code}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() =>
              downloadText(
                `${codes.join('\n')}\n`,
                'text/plain',
                backupCodesFileName(status?.brand?.name, email)
              )
            }
          >
            {t('profile.security.recovery.download')}
          </button>
        </div>
      ) : null}
      <button type="button" className="btn btn-outline-primary" onClick={generate}>
        {zero ? t('profile.security.recovery.generate') : t('profile.security.recovery.regenerate')}
      </button>
    </SectionCard>
  );
};

RecoverySection.propTypes = {
  account: PropTypes.shape({
    backupCodes: PropTypes.shape({
      count: PropTypes.func.isRequired,
      generate: PropTypes.func.isRequired,
    }).isRequired,
  }).isRequired,
  email: PropTypes.string.isRequired,
  guard: PropTypes.func.isRequired,
  folds: foldsShape.isRequired,
};

export default RecoverySection;
