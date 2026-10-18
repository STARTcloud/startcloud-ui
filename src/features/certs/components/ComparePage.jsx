import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import MethodList, { MethodRow } from '../../../components/common/MethodList';
import SectionCard from '../../../components/common/SectionCard';
import SectionHeading from '../../../components/common/SectionHeading';
import { useFolds } from '../../../hooks/useFolds';
import { pageContextShape } from '../../../utils/itemShape';
import { useEngine } from '../hooks/useEngine';
import { firstOf } from '../utils/components';
import { foldOf } from '../utils/folds';
import { CERT_COMPONENT_KINDS } from '../utils/records';

import CertFacts from './CertFacts';
import InputZone from './InputZone';

const Differences = ({ compared }) => {
  const { t } = useTranslation();
  const differing = compared.filter(entry => !entry.same);
  return (
    <div data-panel="differences">
      <SectionHeading
        title={t('certs.compare.differences')}
        count={
          differing.length === 0
            ? t('certs.compare.identical')
            : t('certs.compare.differCount', { count: differing.length })
        }
        state={differing.length === 0 ? 'success' : 'warning'}
      />
      <MethodList className="mb-3">
        {differing.map(entry => (
          <MethodRow
            key={entry.field}
            label={t(`certs.compare.field.${entry.field}`)}
            badges={<span className="badge text-bg-warning">{t('certs.compare.differs')}</span>}
          />
        ))}
      </MethodList>
    </div>
  );
};

Differences.propTypes = {
  compared: PropTypes.arrayOf(
    PropTypes.shape({ field: PropTypes.string.isRequired, same: PropTypes.bool.isRequired })
  ).isRequired,
};

const Side = ({ titleKey, foldKey, folds, onDetected, cert }) => {
  const { t } = useTranslation();
  return (
    <div className="col-lg-6">
      <SectionCard title={t(titleKey)} {...foldOf(folds, foldKey)}>
        <InputZone idPrefix={foldKey} onDetected={onDetected} />
      </SectionCard>
      {cert ? <CertFacts facts={cert.facts} /> : null}
    </div>
  );
};

Side.propTypes = {
  titleKey: PropTypes.string.isRequired,
  foldKey: PropTypes.string.isRequired,
  folds: PropTypes.object.isRequired,
  onDetected: PropTypes.func.isRequired,
  cert: PropTypes.object,
};

/**
 * The Compare page at `/certs/compare`: two Input cards side by side,
 * each followed by its certificate's facts, and once both are read the
 * verdict as a heading's state, the same in every field or how many
 * differ, over the list of the fields that differ as the engine compared
 * them, subject, issuer, serial, validity, algorithm, bits, names and
 * fingerprint.
 */
const ComparePage = ({ context }) => {
  const { t } = useTranslation();
  const engine = useEngine();
  const folds = useFolds(`${context.prefsPrefix}_certs_compare`);
  const [left, setLeft] = useState(null);
  const [right, setRight] = useState(null);
  const [compared, setCompared] = useState(null);

  useEffect(() => {
    document.title = `${t('certs.sidebar.compare')} · ${context.appName}`;
  }, [context.appName, t]);

  const compute = (nextLeft, nextRight) => {
    if (!nextLeft || !nextRight) {
      setCompared(null);
      return;
    }
    engine.run(held => held.compare(nextLeft.der_b64, nextRight.der_b64)).then(setCompared);
  };

  const onLeft = detected => {
    const next = firstOf(detected, CERT_COMPONENT_KINDS);
    setLeft(next);
    compute(next, right);
  };

  const onRight = detected => {
    const next = firstOf(detected, CERT_COMPONENT_KINDS);
    setRight(next);
    compute(left, next);
  };

  return (
    <div className="list row" data-page="certs-compare">
      {compared ? <Differences compared={compared} /> : null}
      <div className="row g-3">
        <Side
          titleKey="certs.compare.left"
          foldKey="compare-left"
          folds={folds}
          onDetected={onLeft}
          cert={left}
        />
        <Side
          titleKey="certs.compare.right"
          foldKey="compare-right"
          folds={folds}
          onDetected={onRight}
          cert={right}
        />
      </div>
    </div>
  );
};

ComparePage.propTypes = {
  context: pageContextShape.isRequired,
};

export default ComparePage;
