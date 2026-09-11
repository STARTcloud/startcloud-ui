import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { errorKeys } from '../../../../components/common/StepUpDialog';
import { useNotify } from '../../../../contexts/NoticeContext';

const download = codes => {
  const blob = new Blob([`${codes.join('\n')}\n`], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'backup-codes.txt';
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * The Recovery section of the Security tab: the backup-codes count badge,
 * warning at zero, Generate or Regenerate over `POST /api/user/backup-codes`,
 * stepped up, and the codes drawn once with Download shown only while
 * they are on screen.
 */
const RecoverySection = ({ account, guard }) => {
  const { t } = useTranslation();
  const notify = useNotify();
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
    <div className="mb-4">
      <h5>
        {t('profile.security.recovery.title')}{' '}
        {remaining === null ? null : (
          <span className={`badge ${zero ? 'bg-warning text-dark' : 'bg-secondary'}`}>
            {zero
              ? t('profile.security.recovery.none')
              : t('profile.security.recovery.remaining', { count: remaining })}
          </span>
        )}
      </h5>
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
            onClick={() => download(codes)}
          >
            {t('profile.security.recovery.download')}
          </button>
        </div>
      ) : null}
      <button type="button" className="btn btn-sm btn-outline-primary" onClick={generate}>
        {zero ? t('profile.security.recovery.generate') : t('profile.security.recovery.regenerate')}
      </button>
    </div>
  );
};

RecoverySection.propTypes = {
  account: PropTypes.shape({
    backupCodes: PropTypes.shape({
      count: PropTypes.func.isRequired,
      generate: PropTypes.func.isRequired,
    }).isRequired,
  }).isRequired,
  guard: PropTypes.func.isRequired,
};

export default RecoverySection;
