import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import RecordRows from '../../../components/common/RecordRows';
import SectionCard from '../../../components/common/SectionCard';
import SectionHeading from '../../../components/common/SectionHeading';
import { useFolds } from '../../../hooks/useFolds';
import { pageContextShape } from '../../../utils/itemShape';
import { useEngine } from '../hooks/useEngine';
import { lastOf } from '../utils/components';
import { foldOf } from '../utils/folds';
import { EMPTY_READ, withRead } from '../utils/reads';
import { CERT_COMPONENT_KINDS } from '../utils/records';

import InputZone from './InputZone';

const SUBJECT_KINDS = [...CERT_COMPONENT_KINDS, 'csr'];

const KEY_KINDS = ['key', 'public_key'];

const describe = component =>
  `${component.facts?.algorithm || ''} ${component.facts?.curve || component.facts?.bits || ''}`.trim();

const sideOf = (held, kinds) => ({ component: lastOf(held, kinds), read: held.read });

const afterRead = (answer, name) => held => (answer ? withRead(held, answer, name) : EMPTY_READ);

const verdictOf = (pair, subject, key) =>
  pair && pair.subject === subject && pair.key === key ? pair.answer : null;

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
 * certificate or a request and one for a key, every read adding its
 * components to the side's held ones as Convert does, the newest of the
 * side's kind standing as its material, a side that read material of
 * the other kind alone saying so in its heading, and once both are read
 * the verdict as the heading's state, whether the key is the one the
 * certificate or the request carries, over both public key hashes and
 * the algorithm.
 */
const MatchPage = ({ context }) => {
  const { t } = useTranslation();
  const { run } = useEngine();
  const folds = useFolds(`${context.prefsPrefix}_certs_match`);
  const [subjectHeld, setSubjectHeld] = useState(EMPTY_READ);
  const [keyHeld, setKeyHeld] = useState(EMPTY_READ);
  const [pair, setPair] = useState(null);
  const subject = sideOf(subjectHeld, SUBJECT_KINDS);
  const key = sideOf(keyHeld, KEY_KINDS);
  const { component: subjectComponent } = subject;
  const { component: keyComponent } = key;
  const verdict = verdictOf(pair, subjectComponent, keyComponent);

  useEffect(() => {
    document.title = `${t('certs.sidebar.match')} · ${context.appName}`;
  }, [context.appName, t]);

  useEffect(() => {
    let current = true;
    if (subjectComponent && keyComponent) {
      run(held => ({
        subjectHash: held.public_key_hash(subjectComponent.der_b64, subjectComponent.kind),
        keyHash: held.public_key_hash(keyComponent.der_b64, keyComponent.kind),
        algorithm: `${describe(subjectComponent)} / ${describe(keyComponent)}`,
      })).then(answer => {
        if (current && answer) {
          setPair({ subject: subjectComponent, key: keyComponent, answer });
        }
      });
    }
    return () => {
      current = false;
    };
  }, [run, subjectComponent, keyComponent]);

  const onSubject = (answer, { name }) => setSubjectHeld(afterRead(answer, name));

  const onKey = (answer, { name }) => setKeyHeld(afterRead(answer, name));

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
      {verdict ? <Verdict pair={verdict} /> : null}
    </div>
  );
};

MatchPage.propTypes = {
  context: pageContextShape.isRequired,
};

export default MatchPage;
