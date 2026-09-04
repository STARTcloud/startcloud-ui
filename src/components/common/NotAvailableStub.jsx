import PropTypes from 'prop-types';
import { Trans, useTranslation } from 'react-i18next';

/**
 * The page a deep link lands on when the host does not advertise the
 * feature behind the route: hiding a menu row never guarded its URL, so a
 * typed or bookmarked path renders this card instead of failing fetches.
 */
const NotAvailableStub = ({ title, tokenLabel }) => {
  const { t } = useTranslation();
  return (
    <div className="container-fluid py-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <strong>{title}</strong>
            </div>
            <div className="card-body">
              <div className="alert alert-info mb-0">
                <h5 className="alert-heading">{t('notAvailable.title')}</h5>
                <p className="mb-0">
                  <Trans
                    i18nKey="notAvailable.body"
                    values={{ title, token: tokenLabel }}
                    components={{ code: <code /> }}
                  />
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

NotAvailableStub.propTypes = {
  title: PropTypes.string.isRequired,
  tokenLabel: PropTypes.string.isRequired,
};

export default NotAvailableStub;
