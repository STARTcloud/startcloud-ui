import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaCircleCheck, FaGlobe } from 'react-icons/fa6';

const REGION_LABEL_KEYS = { EU: 'eu', EEA: 'eea', UK: 'uk' };

/**
 * A country code's flag from the same sprite the language modal uses
 * (`iti__flag iti__<region>`, `UK` mapped to `gb`); the sprite carries no
 * supranational mark, so `EU` and `EEA` draw the Unicode EU flag, `EEA`
 * beside the letters, and a `null` region a globe glyph.
 *
 * @param {string|null} code - `person_region` or a `regions_offered` entry
 * @returns {JSX.Element} The flag node
 */
export const regionFlag = code => {
  if (!code) {
    return <FaGlobe aria-hidden />;
  }
  if (code === 'EU') {
    return <span aria-hidden>🇪🇺</span>;
  }
  if (code === 'EEA') {
    return (
      <span className="d-inline-flex align-items-center gap-1" aria-hidden>
        <span>🇪🇺</span>
        <span className="auth-region-eea">EEA</span>
      </span>
    );
  }
  const region = code === 'UK' ? 'gb' : code.toLowerCase();
  return <span className={`iti__flag iti__${region}`} />;
};

/**
 * The display name of a region: the named set's translated word, else the
 * `Intl.DisplayNames` region name, else the code itself.
 *
 * @param {string|null} code - A `regions_offered` entry
 * @param {Function} t - The `auth` namespace translator
 * @param {Intl.DisplayNames|null} names - A region `DisplayNames` instance
 * @returns {string} The label
 */
export const regionLabel = (code, t, names) => {
  if (!code) {
    return t('terms.region.choose');
  }
  if (REGION_LABEL_KEYS[code]) {
    return t(`terms.region.${REGION_LABEL_KEYS[code]}`);
  }
  return names?.of(code) || code;
};

/**
 * The region picker, the language switcher's list-modal shape: one row per
 * entry of `regionsOffered` with its flag and name, the default copy's row
 * reading "Everywhere else", the current entry checked; picking a row calls
 * `onPick` and never closes the dialog itself.
 */
const RegionModal = ({ show, regionsOffered, current = '', onPick, onClose }) => {
  const { t, i18n } = useTranslation(['auth']);
  let names = null;
  try {
    names = new Intl.DisplayNames([i18n.language], { type: 'region' });
  } catch {
    names = null;
  }
  return (
    <Modal show={show} onHide={onClose} dialogClassName="chrome-modal list-modal">
      <Modal.Header closeButton>
        <Modal.Title as="h5">{t('terms.region.title')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="list-group">
          {regionsOffered.map(code => (
            <button
              key={code || 'default'}
              type="button"
              className={`list-group-item list-group-item-action d-flex align-items-center gap-3 ${
                current === code ? 'border-primary border-2' : ''
              }`}
              onClick={() => onPick(code)}
            >
              <span className="flag-icon-lg" aria-hidden="true">
                {regionFlag(code)}
              </span>
              <span className="flex-grow-1 fw-bold">
                {code ? regionLabel(code, t, names) : t('terms.region.everywhereElse')}
              </span>
              {current === code ? <FaCircleCheck className="text-success" aria-hidden /> : null}
            </button>
          ))}
        </div>
      </Modal.Body>
    </Modal>
  );
};

RegionModal.propTypes = {
  show: PropTypes.bool.isRequired,
  regionsOffered: PropTypes.arrayOf(PropTypes.string).isRequired,
  current: PropTypes.string,
  onPick: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default RegionModal;
