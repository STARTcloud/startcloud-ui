import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import RecordRows from '../../../components/common/RecordRows';
import SectionCard from '../../../components/common/SectionCard';
import SectionHeading from '../../../components/common/SectionHeading';
import { useFolds } from '../../../hooks/useFolds';
import { pageContextShape } from '../../../utils/itemShape';
import { useEngine } from '../hooks/useEngine';
import { firstOf } from '../utils/components';
import { foldOf } from '../utils/folds';
import { CERT_COMPONENT_KINDS } from '../utils/records';

import InputZone from './InputZone';

const SUBJECT_KINDS = [...CERT_COMPONENT_KINDS, 'csr'];

const KEY_KINDS = ['key', 'public_key'];

const NONE = { component: null, read: false };

const describe = component =>
  `${component.facts?.algorithm || ''} ${component.facts?.curve || component.facts?.bits || ''}`.trim();

const sideOf = (detected, kinds) => ({
  component: firstOf(detected, kinds),
  read: Boolean(detected),
});

const Verdict = ({ pair }) => {
  const { t } = useTranslation();
  const same = pair.subjectHash === pair.keyHash;
  return (
    <div data-panel="verdict">
      <SectionHeading
        title={t('certs.match.verdict')}
        count={t(same ? 'certs.match.matches' : 'certs.match.differs')}
        state={same ? 'success' : 'warning'}
      />
      <RecordRows
        rows={[
          {
            key: 'subject',
            label: t('certs.match.subjectHash'),
            value: <code className="checksum">{pair.subjectHash}</code>,
          },
          {
            key: 'key',
            label: t('certs.match.keyHash'),
            value: <code className="checksum">{pair.keyHash}</code>,
          },
          { key: 'algorithm', label: t('certs.facts.algorithm'), value: pair.algorithm },
        ]}
      />
    </div>
  );
};

Verdict.propTypes = {
  pair: PropTypes.shape({
    subjectHash: PropTypes.string.isRequired,
    keyHash: PropTypes.string.isRequired,
    algorithm: PropTypes.string.isRequired,
  }).isRequired,
};

const Side = ({ titleKey, foldKey, folds, side, missingKey, onDetected }) => {
  const { t } = useTranslation();
  const missing = side.read && !side.component;
  return (
    <div className="col-lg-6">
      <SectionCard
        title={t(titleKey)}
        badge={missing ? <span className="badge bg-warning text-dark">{t(missingKey)}</span> : null}
        {...foldOf(folds, foldKey)}
      >
        <InputZone idPrefix={foldKey} onDetected={onDetected} />
      </SectionCard>
    </div>
  );
};

Side.propTypes = {
  titleKey: PropTypes.string.isRequired,
  foldKey: PropTypes.string.isRequired,
  folds: PropTypes.object.isRequired,
  side: PropTypes.shape({ component: PropTypes.object, read: PropTypes.bool.isRequired })
    .isRequired,
  missingKey: PropTypes.string.isRequired,
  onDetected: PropTypes.func.isRequired,
};

/**
 * The Match page at `/certs/match`: two Input cards, one for a
 * certificate or a request and one for a key, a side that read
 * material of the other kind saying so in its heading, and once both
 * are read the verdict as the heading's state, whether the key is the
 * one the certificate or the request carries, over both public key
 * hashes and the algorithm.
 */
const MatchPage = ({ context }) => {
  const { t } = useTranslation();
  const engine = useEngine();
  const folds = useFolds(`${context.prefsPrefix}_certs_match`);
  const [subject, setSubject] = useState(NONE);
  const [key, setKey] = useState(NONE);
  const [pair, setPair] = useState(null);

  useEffect(() => {
    document.title = `${t('certs.sidebar.match')} · ${context.appName}`;
  }, [context.appName, t]);

  const compute = (nextSubject, nextKey) => {
    if (!nextSubject || !nextKey) {
      setPair(null);
      return;
    }
    engine
      .run(held => ({
        subjectHash: held.public_key_hash(nextSubject.der_b64, nextSubject.kind),
        keyHash: held.public_key_hash(nextKey.der_b64, nextKey.kind),
        algorithm: `${describe(nextSubject)} / ${describe(nextKey)}`,
      }))
      .then(setPair);
  };

  const onSubject = detected => {
    const next = sideOf(detected, SUBJECT_KINDS);
    setSubject(next);
    compute(next.component, key.component);
  };

  const onKey = detected => {
    const next = sideOf(detected, KEY_KINDS);
    setKey(next);
    compute(subject.component, next.component);
  };

  return (
    <div className="list row" data-page="certs-match">
      <div className="row g-3">
        <Side
          titleKey="certs.match.subject"
          foldKey="match-subject"
          folds={folds}
          side={subject}
          missingKey="certs.match.noSubject"
          onDetected={onSubject}
        />
        <Side
          titleKey="certs.match.key"
          foldKey="match-key"
          folds={folds}
          side={key}
          missingKey="certs.match.noKey"
          onDetected={onKey}
        />
      </div>
      {pair ? <Verdict pair={pair} /> : null}
    </div>
  );
};

MatchPage.propTypes = {
  context: pageContextShape.isRequired,
};

export default MatchPage;
