import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import MethodList, { MethodRow } from '../../../components/common/MethodList';

const TONES = {
  valid: 'text-bg-success',
  self_signed: 'text-bg-info',
  missing_issuer: 'text-bg-warning',
  invalid: 'text-bg-danger',
};

export const chainShape = PropTypes.shape({
  order: PropTypes.arrayOf(PropTypes.number).isRequired,
  hops: PropTypes.arrayOf(
    PropTypes.shape({
      from: PropTypes.number.isRequired,
      to: PropTypes.number,
      status: PropTypes.string.isRequired,
    })
  ).isRequired,
});

const hasIssuer = hop => hop && hop.to !== null && hop.to !== undefined;

/**
 * The chain's order with the leaves first: every certificate no hop
 * reaches before the ones that issue another, each run in the engine's
 * order.
 *
 * @param {{ order: Array<number>, hops: Array<Object> }} chain - The chain the engine built
 * @returns {Array<number>} The indexes, leaves first
 */
export const leavesFirst = chain => {
  const issuers = new Set(chain.hops.filter(hasIssuer).map(hop => hop.to));
  return [
    ...chain.order.filter(index => !issuers.has(index)),
    ...chain.order.filter(index => issuers.has(index)),
  ];
};

const labelOf = (label, path) => (path ? <Link to={path}>{label}</Link> : label);

/**
 * One chain as the engine built it, the leaves first: one row a
 * certificate, its name a link while `paths` names the record's page,
 * the badge of its hop, valid, self-signed, missing issuer or invalid,
 * and the name of the issuer the hop reached as its subline.
 */
const ChainView = ({ chain, labels, paths = [] }) => {
  const { t } = useTranslation();
  return (
    <MethodList className="mb-3">
      {leavesFirst(chain).map(index => {
        const hop = chain.hops.find(entry => entry.from === index) || null;
        return (
          <MethodRow
            key={index}
            label={labelOf(labels[index], paths[index])}
            badges={
              hop ? (
                <span className={`badge ${TONES[hop.status] || 'text-bg-secondary'}`}>
                  {t(`certs.chain.${hop.status}`)}
                </span>
              ) : null
            }
            subline={hasIssuer(hop) ? t('certs.chain.issuedBy', { name: labels[hop.to] }) : null}
          />
        );
      })}
    </MethodList>
  );
};

ChainView.propTypes = {
  chain: chainShape.isRequired,
  labels: PropTypes.arrayOf(PropTypes.string).isRequired,
  paths: PropTypes.arrayOf(PropTypes.string),
};

export default ChainView;
