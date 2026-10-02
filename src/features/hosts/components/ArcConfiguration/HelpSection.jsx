import { useTranslation } from 'react-i18next';

const METHODS = ['runtime', 'persistent', 'both'];

const PRACTICES = ['practice1', 'practice2', 'practice3', 'practice4', 'practice5'];

/**
 * The ARC help, hyperweaver-ui's: the three apply methods and the best
 * practices.
 */
const HelpSection = () => {
  const { t } = useTranslation();
  return (
    <div className="card mt-3" data-panel="arc-help">
      <div className="card-body small">
        <h6 className="fw-bold">{t('hostCharts.helpSection.sectionTitle')}</h6>
        <div className="row g-3">
          <div className="col-md-6">
            <p className="fw-semibold mb-1">{t('hostCharts.helpSection.applyMethodsTitle')}:</p>
            <ul className="mb-0">
              {METHODS.map(method => (
                <li key={method}>
                  <strong>{t(`hosts.manage.arc.help.${method}Title`)}:</strong>{' '}
                  {t(`hosts.manage.arc.help.${method}`)}
                </li>
              ))}
            </ul>
          </div>
          <div className="col-md-6">
            <p className="fw-semibold mb-1">{t('hostCharts.helpSection.bestPracticesTitle')}:</p>
            <ul className="mb-0">
              {PRACTICES.map(practice => (
                <li key={practice}>{t(`hosts.manage.arc.help.${practice}`)}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSection;
