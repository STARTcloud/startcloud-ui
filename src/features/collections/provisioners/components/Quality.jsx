import PropTypes from 'prop-types';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaChevronDown, FaTriangleExclamation } from 'react-icons/fa6';

import { useCssVar } from '../../../../hooks/useCssVar';
import { RULES_GUIDE, TIERS, openTierOf, percentOf, scoreOf, tierRulesOf } from '../utils/quality';

const RING_RADIUS = 42;
const MINI_RADIUS = 8;

const qualityShape = PropTypes.shape({
  tier: PropTypes.string.isRequired,
  rules: PropTypes.object.isRequired,
  measuredOn: PropTypes.string.isRequired,
});

const arcOf = (radius, share) => {
  const length = 2 * Math.PI * radius;
  return `${(length * share).toFixed(1)} ${length.toFixed(1)}`;
};

const shareOf = ({ passed, total }) => (total === 0 ? 0 : passed / total);

/**
 * A tier as its pill, the plain badge in the tier's own colour.
 */
export const TierPill = ({ tier, className = '', title = '' }) => {
  const { t } = useTranslation();
  return (
    <span
      className={`badge tier-badge tier-${tier}${className ? ` ${className}` : ''}`}
      title={title || undefined}
    >
      {t(`provisioners.tiers.${tier}`)}
    </span>
  );
};

TierPill.propTypes = {
  tier: PropTypes.string.isRequired,
  className: PropTypes.string,
  title: PropTypes.string,
};

/**
 * The Quality fold's signal: a small ring of the share of rules passed
 * and the count, passed over every rule.
 */
export const QualitySignal = ({ rules }) => {
  const score = scoreOf(rules);
  return (
    <>
      <svg className="q-mini-ring" viewBox="0 0 20 20" aria-hidden="true">
        <circle
          cx="10"
          cy="10"
          r={MINI_RADIUS}
          fill="none"
          strokeWidth="3"
          className="q-ring-track"
        />
        <circle
          cx="10"
          cy="10"
          r={MINI_RADIUS}
          fill="none"
          strokeWidth="3"
          className="q-ring-fill"
          strokeDasharray={arcOf(MINI_RADIUS, shareOf(score))}
          transform="rotate(-90 10 10)"
        />
      </svg>
      <span className="fw-semibold" data-field="quality-score">
        {score.passed}/{score.total}
      </span>
    </>
  );
};

QualitySignal.propTypes = {
  rules: PropTypes.object.isRequired,
};

const RuleDot = ({ rule }) => {
  const { t } = useTranslation();
  const requirement = t(`provisioners.rules.${rule.key}.requirement`, { defaultValue: '' });
  const title = t(
    rule.passed ? 'provisioners.quality.rulePassed' : 'provisioners.quality.ruleUnmet',
    { requirement }
  );
  return (
    <a
      className={`dot-rule ${rule.passed ? 'pass' : 'unmet'}`}
      href={`${RULES_GUIDE}#${rule.tier}-rules`}
      target="_blank"
      rel="noreferrer"
      title={title}
      data-rule={rule.key}
    >
      <span className="dot" aria-hidden="true" />
      <span className="dot-name">
        {t(`provisioners.rules.${rule.key}.label`, { defaultValue: rule.name })}
      </span>
    </a>
  );
};

RuleDot.propTypes = {
  rule: PropTypes.shape({
    key: PropTypes.string.isRequired,
    tier: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    passed: PropTypes.bool.isRequired,
  }).isRequired,
};

const RuleLine = ({ rule }) => {
  const { t } = useTranslation();
  const Icon = rule.passed ? FaCheck : FaTriangleExclamation;
  return (
    <li className={`meter-rule ${rule.passed ? 'pass' : 'unmet'}`}>
      <Icon className="meter-rule-icon" aria-hidden="true" />
      <span>
        <a
          className="fw-semibold"
          href={`${RULES_GUIDE}#${rule.tier}-rules`}
          target="_blank"
          rel="noreferrer"
        >
          {t(`provisioners.rules.${rule.key}.label`, { defaultValue: rule.name })}
        </a>
        <span className="rule-req">
          {t(`provisioners.rules.${rule.key}.requirement`, { defaultValue: '' })}
        </span>
      </span>
    </li>
  );
};

RuleLine.propTypes = RuleDot.propTypes;

const MeterFill = ({ percent }) => {
  const fill = useRef(null);
  useCssVar(fill, '--meter-width', `${percent}%`);
  return <span ref={fill} className={`meter-fill${percent === 100 ? '' : ' partial'}`} />;
};

MeterFill.propTypes = {
  percent: PropTypes.number.isRequired,
};

const TierMeter = ({ tier, rules, held, open }) => {
  const { t } = useTranslation();
  const tierRules = tierRulesOf(rules, tier);
  const passed = tierRules.filter(rule => rule.passed).length;
  const percent = percentOf(tierRules);
  return (
    <details
      className={`meter tier-tone-${tier}${held ? ' achieved' : ''}`}
      open={open}
      data-tier={tier}
    >
      <summary>
        <FaChevronDown className="fold-chevron" aria-hidden="true" />
        <TierPill tier={tier} />
        <span
          className="meter-track"
          role="img"
          aria-label={t('provisioners.quality.meterLabel', {
            passed,
            total: tierRules.length,
          })}
        >
          <MeterFill percent={percent} />
        </span>
        <span className="meter-pct">{percent}%</span>
      </summary>
      <div className="meter-body">
        <div className="dot-list">
          {tierRules.map(rule => (
            <RuleDot key={rule.key} rule={rule} />
          ))}
        </div>
        <ul className="list-unstyled mt-2 mb-0 pt-2 border-top d-flex flex-column gap-2">
          {tierRules.map(rule => (
            <RuleLine key={rule.key} rule={rule} />
          ))}
        </ul>
      </div>
    </details>
  );
};

TierMeter.propTypes = {
  tier: PropTypes.string.isRequired,
  rules: PropTypes.object.isRequired,
  held: PropTypes.bool.isRequired,
  open: PropTypes.bool.isRequired,
};

/**
 * The quality of one measured version: "Measured on <version>", the score
 * ring with the tier held inside it under "rules pass", then one meter a
 * tier, Bronze to Diamond, the held tier's row outlined in its colour and
 * the tier above it open; each meter opens to its rules as named dots and
 * every rule with its definition link and its description.
 */
export const QualityPanel = ({ quality }) => {
  const { t } = useTranslation();
  const score = scoreOf(quality.rules);
  const above = openTierOf(quality.tier);
  return (
    <div data-panel="quality" data-tier={quality.tier}>
      <div className="measured mb-2">
        {t('provisioners.quality.measuredOn', { version: quality.measuredOn })}
      </div>
      <div className="p-score">
        <div className="q-ring">
          <svg viewBox="0 0 96 96" aria-hidden="true">
            <circle
              className="q-ring-track"
              cx="48"
              cy="48"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="7"
            />
            <circle
              className="q-ring-fill"
              cx="48"
              cy="48"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={arcOf(RING_RADIUS, shareOf(score))}
            />
          </svg>
          <div className="q-ring-text">
            <div>
              <div className="q-ring-score">
                {score.passed}/{score.total}
              </div>
              <div className="measured">{t('provisioners.quality.rulesPass')}</div>
              <TierPill tier={quality.tier} className="p-tier" />
            </div>
          </div>
        </div>
      </div>
      <div className="meter-rows">
        {TIERS.map(tier => (
          <TierMeter
            key={`${quality.measuredOn}:${tier}`}
            tier={tier}
            rules={quality.rules}
            held={tier === quality.tier}
            open={tier === above}
          />
        ))}
      </div>
    </div>
  );
};

QualityPanel.propTypes = {
  quality: qualityShape.isRequired,
};
