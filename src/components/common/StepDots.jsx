import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const dotClass = ({ step, current, done }) => {
  if (step === current) {
    return 'step-dot active';
  }
  return done.includes(step) ? 'step-dot done' : 'step-dot';
};

/**
 * The progress dots of a multi-step flow: one dot per step in chain
 * order, the cleared ones and the current one marked, the whole labelled
 * "Step n of m, <step>" for a screen reader from the current step's label.
 */
const StepDots = ({ steps, done, current, labels }) => {
  const { t } = useTranslation();
  const n = steps.indexOf(current) + 1;
  return (
    <div
      className="step-dots"
      role="img"
      aria-label={t('stepDots.label', { n, m: steps.length, step: labels[current] || current })}
    >
      {steps.map(step => (
        <span key={step} className={dotClass({ step, current, done })} />
      ))}
    </div>
  );
};

StepDots.propTypes = {
  steps: PropTypes.arrayOf(PropTypes.string).isRequired,
  done: PropTypes.arrayOf(PropTypes.string).isRequired,
  current: PropTypes.string.isRequired,
  labels: PropTypes.objectOf(PropTypes.string).isRequired,
};

export default StepDots;
