import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCloudArrowDown, FaRotateRight } from 'react-icons/fa6';

/**
 * The card the Box step draws over its fields while the Deploy hand-off
 * names a box whose registry the host does not hold, one state of
 * `useTemplateSource`: the registry missing with Add registry and
 * continue, the write in flight, or the write refused with the agent's
 * word and Retry.
 *
 * @param {Object} props
 * @param {Object} props.source - The state of `useTemplateSource`
 */
const BoxSourceCard = ({ source }) => {
  const { t } = useTranslation();
  if (!source.offered) {
    return null;
  }
  const values = { host: source.host };
  return (
    <div
      className={`alert alert-${source.state === 'failed' ? 'danger' : 'warning'}`}
      role="status"
      data-note="box-source"
      data-state={source.state}
    >
      {source.state === 'add' ? (
        <>
          <p className="mb-2">{t('machineEdit.createWizardSteps.boxSourceMissing', values)}</p>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            data-action="box-source-add"
            onClick={source.add}
          >
            <FaCloudArrowDown className="me-2" aria-hidden="true" />
            {t('machineEdit.createWizardSteps.addRegistryAndContinue')}
          </button>
        </>
      ) : null}
      {source.state === 'adding' ? (
        <p className="mb-0">
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
          {t('machineEdit.createWizardSteps.boxSourceAdding', values)}
        </p>
      ) : null}
      {source.state === 'failed' ? (
        <>
          <p className="mb-1">{t('machineEdit.createWizardSteps.boxSourceFailed', values)}</p>
          {source.message ? <p className="small mb-2 text-break">{source.message}</p> : null}
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            data-action="box-source-retry"
            onClick={source.retry}
          >
            <FaRotateRight className="me-2" aria-hidden="true" />
            {t('machineEdit.createWizardSteps.retry')}
          </button>
        </>
      ) : null}
    </div>
  );
};

BoxSourceCard.propTypes = {
  source: PropTypes.shape({
    state: PropTypes.string.isRequired,
    offered: PropTypes.bool.isRequired,
    host: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    add: PropTypes.func.isRequired,
    retry: PropTypes.func.isRequired,
  }).isRequired,
};

export default BoxSourceCard;
