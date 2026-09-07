import { useTranslation } from 'react-i18next';

/**
 * The spinner an operator page draws while its first read is in flight.
 */
const AdminLoading = () => {
  const { t } = useTranslation();
  return (
    <div className="text-center py-4">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">{t('loading')}</span>
      </div>
    </div>
  );
};

export default AdminLoading;
