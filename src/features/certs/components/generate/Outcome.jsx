import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaVault } from 'react-icons/fa6';

import CopyButton from '../../../../components/common/CopyButton';
import SectionHeading from '../../../../components/common/SectionHeading';
import CertFacts from '../CertFacts';

/**
 * What a generate tab made: the heading with Save to vault and Download
 * in its pane, the facts under it and the PEM in a monospace block with
 * Copy beside it.
 */
const Outcome = ({ title, facts = null, pem, saved, onSave, onDownload }) => {
  const { t } = useTranslation();
  const actions = (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline-success"
        disabled={saved}
        onClick={onSave}
      >
        <FaVault className="me-1" aria-hidden="true" />
        {t('certs.convert.saveToVault')}
      </button>
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onDownload}>
        <FaDownload className="me-1" aria-hidden="true" />
        {t('certs.actions.download')}
      </button>
    </>
  );
  return (
    <div className="mt-4" data-panel="outcome">
      <SectionHeading
        title={title}
        count={saved ? t('certs.generate.saved') : null}
        state={saved ? 'success' : null}
        actions={actions}
      />
      {facts ? <CertFacts facts={facts} /> : null}
      <div className="d-flex align-items-start gap-2">
        <pre className="font-monospace small border rounded p-3 flex-grow-1 mb-0">{pem}</pre>
        <CopyButton text={pem} className="btn btn-sm btn-outline-secondary" />
      </div>
    </div>
  );
};

Outcome.propTypes = {
  title: PropTypes.string.isRequired,
  facts: PropTypes.object,
  pem: PropTypes.string.isRequired,
  saved: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
};

export default Outcome;
