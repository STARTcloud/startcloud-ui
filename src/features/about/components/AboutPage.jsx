import PropTypes from 'prop-types';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaBookOpen,
  FaChevronRight,
  FaCircleCheck,
  FaListCheck,
  FaRegStar,
  FaSitemap,
  FaStar,
} from 'react-icons/fa6';

import PageHeader from '../../../components/common/PageHeader';
import SectionCard, { foldsShape } from '../../../components/common/SectionCard';
import { useFolds } from '../../../hooks/useFolds';

const PREFS_KEY = 'table_prefs_about';

const linkShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  href: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  Icon: PropTypes.elementType.isRequired,
});

const favoriteShape = PropTypes.shape({
  active: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
});

const FavoriteToggle = ({ active, onToggle }) => {
  const { t } = useTranslation();
  const label = active ? t('pages.about.removeFromFavorites') : t('pages.about.addToFavorites');
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2"
      onClick={onToggle}
      aria-pressed={active}
    >
      {active ? <FaStar className="text-warning" aria-hidden /> : <FaRegStar aria-hidden />}
      {label}
    </button>
  );
};

FavoriteToggle.propTypes = {
  active: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

const AboutHeader = ({ brand, title, description, version, uiVersion, goal, favorite }) => {
  const { t } = useTranslation();
  const versionChips = (
    <>
      <span className="badge text-bg-primary" title={t('pages.about.runningVersion', { version })}>
        {t('about.version.app', { version })}
      </span>
      <span className="badge text-bg-secondary">
        {t('about.version.ui', { version: uiVersion })}
      </span>
    </>
  );
  return (
    <PageHeader
      media={brand}
      title={title}
      chips={versionChips}
      actions={
        favorite ? <FavoriteToggle active={favorite.active} onToggle={favorite.onToggle} /> : null
      }
    >
      <p className="mb-0 mt-2">{description}</p>
      <blockquote className="blockquote fs-6 fst-italic border-start border-3 border-primary ps-3 mt-3 mb-0">
        {goal}
      </blockquote>
    </PageHeader>
  );
};

AboutHeader.propTypes = {
  brand: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
  uiVersion: PropTypes.string.isRequired,
  goal: PropTypes.string.isRequired,
  favorite: favoriteShape,
};

const StartHere = ({ docs, intro, folds }) => {
  const { t } = useTranslation();
  return (
    <SectionCard
      icon={<FaBookOpen aria-hidden />}
      title={t('pages.about.startHere')}
      className="h-100"
      folded={folds.folded('startHere')}
      onFold={() => folds.toggle('startHere')}
    >
      <p className="text-body-secondary">{intro}</p>
      <div className="list-group">
        {docs.map(({ key, href, label, Icon }) => (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-3"
          >
            <Icon className="text-primary fs-5 flex-shrink-0" aria-hidden />
            <span className="flex-grow-1">{label}</span>
            <FaChevronRight className="text-body-secondary small" aria-hidden />
          </a>
        ))}
      </div>
    </SectionCard>
  );
};

StartHere.propTypes = {
  docs: PropTypes.arrayOf(linkShape).isRequired,
  intro: PropTypes.string.isRequired,
  folds: foldsShape.isRequired,
};

const Features = ({ features, folds }) => {
  const { t } = useTranslation();
  return (
    <SectionCard
      icon={<FaListCheck aria-hidden />}
      title={t('pages.about.whatYouCanDo')}
      className="h-100"
      folded={folds.folded('features')}
      onFold={() => folds.toggle('features')}
    >
      <ul className="list-unstyled mb-0 row row-cols-1 row-cols-md-2 g-3">
        {features.map(feature => (
          <li key={feature} className="col d-flex align-items-start gap-2">
            <FaCircleCheck className="text-success flex-shrink-0 mt-1" aria-hidden />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
};

Features.propTypes = {
  features: PropTypes.arrayOf(PropTypes.string).isRequired,
  folds: foldsShape.isRequired,
};

const Components = ({ components, folds }) => {
  const { t } = useTranslation();
  return (
    <SectionCard
      icon={<FaSitemap aria-hidden />}
      title={t('pages.about.howItFits')}
      className="mb-4"
      folded={folds.folded('components')}
      onFold={() => folds.toggle('components')}
    >
      <div className="row g-3 mx-0 px-0">
        {components.map(component => (
          <div key={component.title} className="col-md">
            <div className="card h-100">
              <div className="card-body">
                <h5 className="h6 fw-bold card-title">{component.title}</h5>
                <ul className="list-unstyled mb-0 small">
                  {component.details.map(detail => (
                    <li key={detail} className="d-flex align-items-start gap-2 mb-1">
                      <FaChevronRight className="text-primary mt-1 flex-shrink-0" aria-hidden />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
};

Components.propTypes = {
  components: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      details: PropTypes.arrayOf(PropTypes.string).isRequired,
    })
  ).isRequired,
  folds: foldsShape.isRequired,
};

const SupportStrip = ({ support, intro }) => {
  const { t } = useTranslation();
  return (
    <div className="border-top pt-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
      <div>
        <div className="fw-semibold">{t('pages.about.support')}</div>
        <div className="text-body-secondary small">{intro}</div>
      </div>
      <div className="d-flex flex-wrap gap-2">
        {support.map(({ key, href, label, Icon }) => (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2"
          >
            <Icon aria-hidden />
            {label}
          </a>
        ))}
      </div>
    </div>
  );
};

SupportStrip.propTypes = {
  support: PropTypes.arrayOf(linkShape).isRequired,
  intro: PropTypes.string.isRequired,
};

/**
 * The About page every estate app draws the same way, from props alone: a
 * PageHeader carrying the brand, the title, the two version chips (the
 * app's from `status.version`, the UI's from the build), the
 * description, the goal as a quote and the favorite toggle as its action;
 * Start here (the documentation links as a list) beside What you can do
 * here (features as a check grid); How it fits together (components as
 * headed cards); and Help and community (support links as a footer strip);
 * the three blocks are `SectionCard`s whose folds are kept under
 * `table_prefs_about`. Every link on the page appears once.
 *
 * @param {Object} props
 * @param {import('react').ReactNode} props.brand - The app's mark, drawn in the header's media slot
 * @param {string} props.title - The app's name; also becomes the document title
 * @param {string} props.description - One sentence saying what the app is
 * @param {string} props.version - The running version, drawn as a chip under the title
 * @param {string} props.uiVersion - The shared UI build's version, drawn as the second chip
 * @param {string} props.goal - The app's goal, drawn as a quote under the description
 * @param {string[]} props.features - What a visitor can do here, one line each
 * @param {Array<{title: string, details: string[]}>} props.components - The parts the app is made of, one headed card each
 * @param {Array<{key: string, href: string, label: string, Icon: Function}>} props.docs - The documentation links, the getting-started guide first
 * @param {string} props.docsIntro - The sentence above the documentation links
 * @param {Array<{key: string, href: string, label: string, Icon: Function}>} props.support - The help and community links
 * @param {string} props.supportIntro - The sentence beside the support links
 * @param {{active: boolean, onToggle: Function}|null} [props.favorite] - The identity-provider favorite toggle, or null when the session has none
 * @returns {import('react').ReactElement} The page
 */
const AboutPage = ({
  brand,
  title,
  description,
  version,
  uiVersion,
  goal,
  features,
  components,
  docs,
  docsIntro,
  support,
  supportIntro,
  favorite = null,
}) => {
  const folds = useFolds(PREFS_KEY);

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <div className="list row">
      <AboutHeader
        brand={brand}
        title={title}
        description={description}
        version={version}
        uiVersion={uiVersion}
        goal={goal}
        favorite={favorite}
      />
      <div className="row g-3 mb-4 mx-0 px-0">
        <div className="col-lg-5 col-xl-4">
          <StartHere docs={docs} intro={docsIntro} folds={folds} />
        </div>
        <div className="col">
          <Features features={features} folds={folds} />
        </div>
      </div>
      <Components components={components} folds={folds} />
      <SupportStrip support={support} intro={supportIntro} />
    </div>
  );
};

AboutPage.propTypes = {
  brand: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
  uiVersion: PropTypes.string.isRequired,
  goal: PropTypes.string.isRequired,
  features: PropTypes.arrayOf(PropTypes.string).isRequired,
  components: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      details: PropTypes.arrayOf(PropTypes.string).isRequired,
    })
  ).isRequired,
  docs: PropTypes.arrayOf(linkShape).isRequired,
  docsIntro: PropTypes.string.isRequired,
  support: PropTypes.arrayOf(linkShape).isRequired,
  supportIntro: PropTypes.string.isRequired,
  favorite: favoriteShape,
};

export default AboutPage;
