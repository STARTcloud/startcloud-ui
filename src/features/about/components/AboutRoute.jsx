import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBook, FaBug, FaCode, FaEnvelope, FaGithub, FaHeart, FaServer } from 'react-icons/fa6';

import BrandLogo from '../../../components/common/BrandLogo';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { log } from '../../../lib/logger';
import { hasFeature } from '../../../utils/capabilities';
import { responseMessage } from '../../../utils/responseMessage';
import { fetchPublicContent, getFavorites, saveFavorites } from '../api/about';

import AboutPage from './AboutPage';

const EMPTY = { title: '', description: '', components: [], features: [], goal: '' };
const FAVORITE_KEY = 'favorite';

const CATALOG_FEATURES = ['catalogs', 'tiers', 'artifacts', 'watches', 'deploy'];
const CATALOG_COMPONENTS = [
  { key: 'data', details: ['releases', 'validation', 'tiers'] },
  { key: 'web', details: ['pages', 'signIn', 'shared'] },
  { key: 'worker', details: ['gate', 'push', 'config'] },
];

const PROFILES = {
  boxvault: {
    remote: true,
    docs: () => [
      { key: 'gettingStarted', href: '/docs/guides/', Icon: FaServer },
      { key: 'fullDocs', href: '/docs', Icon: FaBook },
      { key: 'apiExplorer', href: '/api-docs', Icon: FaCode },
    ],
    docsLabel: key => `about.boxvault.documentation.${key}`,
    docsIntro: 'about.boxvault.documentation.description',
    support: () => [
      { key: 'patreon', href: 'https://www.patreon.com/Philotic', Icon: FaHeart },
      { key: 'githubProfile', href: 'https://github.com/makr91', Icon: FaGithub },
      { key: 'repository', href: 'https://github.com/makr91/BoxVault', Icon: FaCode },
    ],
    supportLabel: key => `about.boxvault.support.${key}`,
    supportIntro: 'about.boxvault.support.description',
    content: (t, data) => ({
      title: data.title || t('about.boxvault.fallbackTitle'),
      description: data.description || t('about.boxvault.fallbackDescription'),
      goal: data.goal || t('about.boxvault.fallbackGoal'),
      features: data.features,
      components: data.components,
    }),
  },
  catalog: {
    remote: false,
    docs: () => [
      { key: 'gettingStarted', href: '/docs/guides/getting-started/', Icon: FaServer },
      { key: 'docs', href: '/docs/', Icon: FaBook },
      { key: 'api', href: '/docs/api/', Icon: FaCode },
    ],
    docsLabel: key => `about.catalog.docs.${key}`,
    docsIntro: 'about.catalog.docs.intro',
    support: status => [
      { key: 'repository', href: status.brand.repo, Icon: FaGithub },
      { key: 'issues', href: `${status.brand.repo}/issues/new`, Icon: FaBug },
      { key: 'contact', href: status.links.contact, Icon: FaEnvelope },
    ],
    supportLabel: key => `about.catalog.support.${key}`,
    supportIntro: 'about.catalog.support.intro',
    content: t => ({
      title: t('provisioners.app.title'),
      description: t('about.catalog.description'),
      goal: t('about.catalog.goal'),
      features: CATALOG_FEATURES.map(key => t(`about.catalog.features.${key}`)),
      components: CATALOG_COMPONENTS.map(component => ({
        title: t(`about.catalog.components.${component.key}.title`),
        details: component.details.map(detail =>
          t(`about.catalog.components.${component.key}.${detail}`)
        ),
      })),
    }),
  },
};

/**
 * The About route: the shared `AboutPage` fed by the host's status, the
 * host's project content from `/api/users/all` when its role serves one,
 * else the locale strings, and the identity-provider favourite toggle when
 * the host advertises `favorites` and the viewer signed in through the
 * provider.
 */
const AboutRoute = ({ theme, oidc }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const profile = PROFILES[status.role];
  const [projectData, setProjectData] = useState(EMPTY);
  const [favorited, setFavorited] = useState(false);
  const favorites = hasFeature(status, 'favorites') && oidc;
  const clientId = status.role;

  useEffect(() => {
    if (!profile.remote) {
      return;
    }
    const loadData = async () => {
      try {
        setProjectData(await fetchPublicContent(i18n.language));
      } catch (error) {
        notify('danger', responseMessage(error, error.message || error.toString()));
      }
    };
    loadData();
  }, [i18n.language, notify, profile.remote]);

  useEffect(() => {
    if (!favorites) {
      return;
    }
    const loadFavorites = async () => {
      try {
        const current = (await getFavorites()) || [];
        setFavorited(current.some(entry => entry.clientId === clientId));
      } catch (error) {
        log.api.error('Error loading favorites', {
          error: error.message,
        });
      }
    };
    loadFavorites();
  }, [clientId, favorites]);

  const handleToggleFavorite = async () => {
    try {
      const current = (await getFavorites()) || [];
      const next = favorited
        ? current.filter(entry => entry.clientId !== clientId)
        : [...current, { clientId, customLabel: null, order: current.length }];
      notify(
        'success',
        t(favorited ? 'boxes.messages.removedFromFavorites' : 'boxes.messages.addedToFavorites'),
        { key: FAVORITE_KEY }
      );

      await saveFavorites(next);
      setFavorited(!favorited);
    } catch (error) {
      log.component.error('Error toggling favorite', {
        clientId,
        error: error.message,
      });
      notify('danger', t('boxes.messages.failedToUpdateFavorites'), { key: FAVORITE_KEY });
    }
  };

  const content = profile.content(t, projectData);

  return (
    <AboutPage
      brand={<BrandLogo theme={theme} className="prov-icon" />}
      title={content.title}
      description={content.description}
      version={status.version}
      goal={content.goal}
      features={content.features}
      components={content.components}
      docs={profile.docs(status).map(doc => ({ ...doc, label: t(profile.docsLabel(doc.key)) }))}
      docsIntro={t(profile.docsIntro)}
      support={profile
        .support(status)
        .map(link => ({ ...link, label: t(profile.supportLabel(link.key)) }))}
      supportIntro={t(profile.supportIntro)}
      favorite={favorites ? { active: favorited, onToggle: handleToggleFavorite } : null}
    />
  );
};

AboutRoute.propTypes = {
  theme: PropTypes.string.isRequired,
  oidc: PropTypes.bool.isRequired,
};

export default AboutRoute;
