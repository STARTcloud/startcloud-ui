import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowUpRightFromSquare, FaBook, FaCode, FaEnvelope, FaListCheck } from 'react-icons/fa6';

import BrandLogo from '../../../components/common/BrandLogo';
import { httpsUrl } from '../../../components/common/MethodList';
import NotAvailableStub from '../../../components/common/NotAvailableStub';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { log } from '../../../lib/logger';
import { hasFeature } from '../../../utils/capabilities';
import { getFavorites, saveFavorites } from '../api/about';

import AboutPage from './AboutPage';

const FAVORITE_KEY = 'favorite';
const SAFE_PATH = /^\/(?![/\\])/;

const toBody = list =>
  list.map((entry, index) => ({
    client_id: entry.client_id,
    custom_label: entry.custom_label || null,
    order: index,
  }));

const linkHref = value =>
  typeof value === 'string' && SAFE_PATH.test(value) ? value : httpsUrl(value);

const mailto = value =>
  typeof value === 'string' && value !== '' ? `mailto:${value.replace(/^mailto:/, '')}` : '';

const textsOf = value =>
  value && typeof value === 'object' ? Object.values(value).filter(v => typeof v === 'string') : [];

const componentsOf = value =>
  value && typeof value === 'object'
    ? Object.values(value)
        .filter(component => component && typeof component === 'object' && component.title)
        .map(component => ({
          title: component.title,
          details: Object.entries(component)
            .filter(([key, detail]) => key !== 'title' && typeof detail === 'string')
            .map(([, detail]) => detail),
        }))
    : [];

/**
 * Whether the host's role has About text, so the chrome draws an About
 * link only where `/about` answers a page: the locale carries
 * `about.<role>.description`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} i18n - The i18next instance
 * @returns {boolean} True when the role's About keys exist
 */
export const hasAbout = (status, i18n) => i18n.exists(`about.${status.role}.description`);

const docsOf = ({ status, t }) => {
  const docs = linkHref(status.links?.docs);
  return docs
    ? [{ key: 'docs', href: docs, label: t('pages.about.links.docs'), Icon: FaBook }]
    : [];
};

const communityOf = value =>
  Array.isArray(value)
    ? value
        .map((entry, index) => ({
          key: `community-${index}`,
          href: httpsUrl(entry?.url),
          label: typeof entry?.label === 'string' ? entry.label : '',
          Icon: FaArrowUpRightFromSquare,
        }))
        .filter(link => link.href && link.label)
    : [];

const supportOf = ({ status, t }) => [
  ...[
    { key: 'repository', href: httpsUrl(status.brand?.repo), Icon: FaCode },
    { key: 'changelog', href: httpsUrl(status.brand?.changelog), Icon: FaListCheck },
    { key: 'contact', href: mailto(status.links?.contact), Icon: FaEnvelope },
  ]
    .filter(link => link.href)
    .map(link => ({ ...link, label: t(`pages.about.links.${link.key}`) })),
  ...communityOf(status.links?.community),
];

const contentOf = ({ status, t }) => {
  const prefix = `about.${status.role}`;
  return {
    title: status.brand.name,
    description: t(`${prefix}.description`),
    goal: t(`${prefix}.goal`),
    features: textsOf(t(`${prefix}.features`, { returnObjects: true })),
    components: componentsOf(t(`${prefix}.components`, { returnObjects: true })),
    docsIntro: t(`${prefix}.docs.intro`),
    supportIntro: t(`${prefix}.support.intro`),
  };
};

const useFavorite = ({ enabled, clientId, appName }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const loadFavorites = async () => {
      try {
        const current = (await getFavorites()) || [];
        setFavorited(current.some(entry => entry.client_id === clientId));
      } catch (error) {
        log.api.error('Error loading favorites', { error: error.message });
      }
    };
    loadFavorites();
  }, [clientId, enabled]);

  const toggle = async () => {
    try {
      const current = (await getFavorites()) || [];
      const next = favorited
        ? current.filter(entry => entry.client_id !== clientId)
        : [...current, { client_id: clientId, custom_label: null }];
      await saveFavorites(toBody(next));
      setFavorited(!favorited);
      notify(
        'success',
        t(favorited ? 'pages.about.removedFromFavorites' : 'pages.about.addedToFavorites', {
          app: appName,
        }),
        { key: FAVORITE_KEY }
      );
    } catch (error) {
      log.component.error('Error toggling favorite', { clientId, error: error.message });
      notify('danger', t('pages.about.failedToUpdateFavorites'), { key: FAVORITE_KEY });
    }
  };

  return enabled ? { active: favorited, onToggle: toggle } : null;
};

/**
 * The About route: the shared `AboutPage` fed by the host's status and
 * the locale alone, nothing of any app in code: the title is
 * `status.brand.name`, the description, goal, features, components and
 * the two intros are the `about.<role>.*` keys read as objects, Start
 * here is `links.docs`, Help and community is `brand.repo`,
 * `brand.changelog` and `links.contact`, each drawn only while set, then
 * every `links.community` entry the host lists, its own `label` as the
 * text and its `url` drawn only while `https:`, a malformed member drawing
 * nothing, and the UI build's own version comes from `__APP_VERSION__`; the favorite
 * toggle over `GET` and `PUT /api/user/favorites` through the hub client
 * is drawn while the host advertises `favorites`, the viewer signed in
 * through the provider and the session names its `clientId`, the ID
 * token's `aud`, which is the id the favorites list carries and the one
 * the whole ordered list is written back with in `snake_case`; a role
 * with no `about.<role>.*` keys answers `NotAvailableStub`.
 */
const AboutRoute = ({ theme, oidc, clientId }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const favorite = useFavorite({
    enabled: hasFeature(status, 'favorites') && oidc && clientId !== '',
    clientId,
    appName: status.brand.name,
  });

  if (!hasAbout(status, i18n)) {
    return <NotAvailableStub title={t('navbar.about')} tokenLabel="about" />;
  }

  const content = contentOf({ status, t });

  return (
    <AboutPage
      brand={<BrandLogo theme={theme} className="prov-icon" />}
      title={content.title}
      description={content.description}
      version={status.version}
      uiVersion={__APP_VERSION__}
      goal={content.goal}
      features={content.features}
      components={content.components}
      docs={docsOf({ status, t })}
      docsIntro={content.docsIntro}
      support={supportOf({ status, t })}
      supportIntro={content.supportIntro}
      favorite={favorite}
    />
  );
};

AboutRoute.propTypes = {
  theme: PropTypes.string.isRequired,
  oidc: PropTypes.bool.isRequired,
  clientId: PropTypes.string.isRequired,
};

export default AboutRoute;
