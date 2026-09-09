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
 * order, the cleared ones and the current one marked, the group labeled
 * "Step n of m, <step>" from the current step, each dot carrying its own
 * visually hidden "Step n of m, <step>" and the current one
 * `aria-current="step"`, so a screen reader hears the progress.
 */
const StepDots = ({ steps, done, current, labels }) => {
  const { t } = useTranslation();
  const m = steps.length;
  const label = step =>
    t('stepDots.label', { n: steps.indexOf(step) + 1, m, step: labels[step] || step });
  return (
    <div className="step-dots" role="group" aria-label={label(current)}>
      {steps.map(step => (
        <span
          key={step}
          className={dotClass({ step, current, done })}
          aria-current={step === current ? 'step' : undefined}
        >
          <span className="visually-hidden">{label(step)}</span>
        </span>
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
