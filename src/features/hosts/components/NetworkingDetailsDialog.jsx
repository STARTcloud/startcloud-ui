import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import RecordRows from '../../../components/common/RecordRows';

/**
 * The details dialog of the networking page's management, hyperweaver-ui's
 * content modal over the record rows of the pages contract: the title,
 * one card a section, each its heading and its rows, label and value
 * pairs, and where a section carries `raw` the agent's answer as it
 * came, and in the footer Close. The dialog carries `dialog` as
 * `data-dialog`.
 */
const NetworkingDetailsDialog = ({ dialog, title, sections, onClose }) => {
  const { t } = useTranslation();
  return (
    <Modal show onHide={onClose} dialogClassName="list-modal" scrollable>
      <Modal.Header closeButton>
        <Modal.Title as="h5">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body data-dialog={dialog}>
        {sections.map(section => (
          <div key={section.key} className="card mb-3" data-section={section.key}>
            <div className="card-body">
              <h6 className="fw-bold">{section.title}</h6>
              {section.rows ? <RecordRows rows={section.rows} className="mb-0" /> : null}
              {section.raw ? <pre className="small task-metadata mb-0">{section.raw}</pre> : null}
            </div>
          </div>
        ))}
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          {t('pages.confirm.cancel')}
        </button>
      </Modal.Footer>
    </Modal>
  );
};

NetworkingDetailsDialog.propTypes = {
  dialog: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      rows: PropTypes.array,
      raw: PropTypes.string,
    })
  ).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default NetworkingDetailsDialog;
