import PropTypes from 'prop-types';
import { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaStar } from 'react-icons/fa6';

import { httpsUrl } from '../common/MethodList';

const iconChainOf = app => {
  const icon = httpsUrl(app.icon_url);
  const home = httpsUrl(app.home_url);
  const favicon = home ? `${new URL(home).origin}/favicon.ico` : '';
  return [...new Set([icon, favicon].filter(Boolean))];
};

const AppIcon = ({ app }) => {
  const [step, setStep] = useState(0);
  const iconUrl = iconChainOf(app)[step];
  if (!iconUrl) {
    return <FaStar className="text-warning logo-md icon-with-margin" />;
  }
  return (
    <img
      key={iconUrl}
      src={iconUrl}
      className="logo-md icon-with-margin"
      alt=""
      referrerPolicy="no-referrer"
      onError={event => {
        event.currentTarget.classList.add('d-none');
        setStep(current => current + 1);
      }}
    />
  );
};

AppIcon.propTypes = {
  app: PropTypes.shape({
    icon_url: PropTypes.string,
    home_url: PropTypes.string,
  }).isRequired,
};

const byOrder = (a, b) => (a.order || 0) - (b.order || 0);

const FavoriteApps = ({ apps }) => {
  const { t } = useTranslation();
  if (apps.length === 0) {
    return null;
  }
  return (
    <>
      <Dropdown.Divider />
      <Dropdown.Header className="py-0">{t('navbar.favorites')}</Dropdown.Header>
      {[...apps].sort(byOrder).map(app => {
        const home = httpsUrl(app.home_url);
        const label = app.custom_label || app.client_name || app.client_id;
        if (!home) {
          return (
            <Dropdown.ItemText key={app.client_id} className="d-flex align-items-center">
              <AppIcon app={app} />
              {label}
            </Dropdown.ItemText>
          );
        }
        return (
          <Dropdown.Item key={app.client_id} href={home} target="_blank" rel="noopener noreferrer">
            <AppIcon app={app} />
            {label}
          </Dropdown.Item>
        );
      })}
    </>
  );
};

FavoriteApps.propTypes = {
  apps: PropTypes.arrayOf(
    PropTypes.shape({
      client_id: PropTypes.string.isRequired,
      client_name: PropTypes.string,
      custom_label: PropTypes.string,
      icon_url: PropTypes.string,
      home_url: PropTypes.string,
      order: PropTypes.number,
    })
  ).isRequired,
};

export default FavoriteApps;
