import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaVault } from 'react-icons/fa6';

import CopyButton from '../../../../components/common/CopyButton';
import SectionHeading from '../../../../components/common/SectionHeading';
import CertFacts from '../CertFacts';

const PRE_CLASS = 'font-monospace small border rounded p-3 flex-grow-1 mb-0';

const PemBlock = ({ pem }) => (
  <div className="d-flex align-items-start gap-2">
    <pre className={PRE_CLASS}>{pem}</pre>
    <CopyButton text={pem} className="btn btn-sm btn-outline-secondary" />
  </div>
);

PemBlock.propTypes = {
  pem: PropTypes.string.isRequired,
};

const countOf = (saved, shownKey, t) => {
  if (saved) {
    return t(shownKey ? 'certs.generate.savedWithKey' : 'certs.generate.saved');
  }
  return shownKey ? t('certs.generate.withNewKey', { alg: shownKey.alg }) : null;
};

/**
 * What a generate tab made: the heading with Save to vault and Download
 * in its pane, the facts under it and the PEM in a monospace block with
 * Copy beside it; `shownKey`, given while the form generated the key or
 * read it from a file, names the new key in the heading's muted text and
 * draws the key's PEM under its own small heading with its own Copy.
 */
const Outcome = ({ title, facts = null, pem, shownKey = null, saved, onSave, onDownload }) => {
  const { t } = useTranslation();
  const actions = (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline-success"
        data-action="save-vault"
        disabled={saved}
        onClick={onSave}
      >
        <FaVault className="me-1" aria-hidden="true" />
        {t('certs.convert.saveToVault')}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        data-action="download"
        onClick={onDownload}
      >
        <FaDownload className="me-1" aria-hidden="true" />
        {t('certs.actions.download')}
      </button>
    </>
  );
  return (
    <div className="mt-4" data-panel="outcome">
      <SectionHeading
        title={title}
        count={countOf(saved, shownKey, t)}
        state={saved ? 'success' : null}
        actions={actions}
      />
      {facts ? <CertFacts facts={facts} /> : null}
      <PemBlock pem={pem} />
      {shownKey ? (
        <div className="mt-3" data-panel="outcome-key">
          <h6>{t('certs.component.key')}</h6>
          <PemBlock pem={shownKey.pem} />
        </div>
      ) : null}
    </div>
  );
};

Outcome.propTypes = {
  title: PropTypes.string.isRequired,
  facts: PropTypes.object,
  pem: PropTypes.string.isRequired,
  shownKey: PropTypes.shape({
    pem: PropTypes.string.isRequired,
    alg: PropTypes.string.isRequired,
  }),
  saved: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
};

export default Outcome;
