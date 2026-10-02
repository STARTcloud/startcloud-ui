import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';
import { log } from '../../../lib/logger';
import { integrationsShape } from '../api/integrations';

import HyperweaverServiceCard, { hyperweaverServiceOf } from './HyperweaverServiceCard';

const servicesOf = data => (Array.isArray(data?.services) ? data.services : null);

/**
 * The page of the Hyperweaver connected service at
 * `/user/integrations/hyperweaver`, the `settings_url` the row names: the
 * one card over the `hyperweaver` row of `GET /api/user/integrations`,
 * read once as the page mounts and again after every write, `fallback`
 * drawn while the answer carries no `services`, because a person who
 * connected nothing has no page here.
 */
const HyperweaverServicePage = ({ integrations, fallback }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [record, setRecord] = useState({ services: undefined, version: 0 });

  useEffect(() => {
    let mounted = true;
    integrations
      .list()
      .then(data => {
        if (mounted) {
          setRecord(current => ({ services: servicesOf(data), version: current.version + 1 }));
        }
      })
      .catch(error => {
        log.api.error('Error loading integrations', { error: error.message });
        if (mounted) {
          setRecord(current => ({ services: null, version: current.version + 1 }));
          notify('danger', t(error.messageKey || 'errors.request'));
        }
      });
    return () => {
      mounted = false;
    };
  }, [integrations, notify, t]);

  useEffect(() => {
    if (record.services) {
      document.title = t('integrations.hyperweaver.title');
    }
  }, [record.services, t]);

  const reread = async () => {
    const data = await integrations.list().catch(() => null);
    setRecord(current => ({ services: servicesOf(data), version: current.version + 1 }));
  };

  if (record.services === undefined) {
    return <p>{t('loading')}</p>;
  }
  if (record.services === null) {
    return fallback;
  }
  return (
    <div className="list">
      <HyperweaverServiceCard
        key={record.version}
        integrations={integrations}
        service={hyperweaverServiceOf(record.services)}
        onSaved={reread}
      />
    </div>
  );
};

HyperweaverServicePage.propTypes = {
  integrations: integrationsShape.isRequired,
  fallback: PropTypes.node.isRequired,
};

export default HyperweaverServicePage;
