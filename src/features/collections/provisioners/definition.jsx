import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBug, FaCalendar, FaCubes, FaDownload, FaGithub, FaHouse, FaTag } from 'react-icons/fa6';

import {
  badgesText,
  downloadsColumn,
  labelColumn,
  releasedColumn,
  versionsColumn,
  visibilityColumn,
} from '../../../components/common/columns';
import { CollapseButton } from '../../../components/common/GroupHeading';
import {
  architectureLevelColumns,
  providerLevelColumns,
  versionLevelColumns,
} from '../../../components/common/levelColumns';
import { itemShape } from '../../../utils/itemShape';

import { catalogAdapter } from './api/adapter';
import { CardGlyph, DeployGlyph, deployColumn, deployableVersion } from './components/deploy';
import { CardByline, VersionDownload, cardBodyWith } from './components/ProvisionerCard';
import { QualityPanel, QualitySignal, TierPill } from './components/Quality';
import { qualityOf } from './utils/quality';

export const TIER_ORDER = ['diamond', 'platinum', 'gold', 'silver', 'bronze', 'unrated'];
const NONE = 'N/A';
const DAY_MS = 86400000;

const coverageProviders = item => Object.keys(item.extras.coverage.counts).sort();

const coverageClass = (count, total) => {
  if (count === total) {
    return 'provider-all';
  }
  if (count === 1) {
    return 'provider-one';
  }
  return 'provider-some';
};

const CoverageChips = ({ item }) => {
  const { t } = useTranslation();
  const { counts, total } = item.extras.coverage;
  const providers = coverageProviders(item);
  if (providers.length === 0) {
    return null;
  }
  return (
    <span className="d-inline-flex flex-wrap gap-1">
      {providers.map(provider => (
        <span
          key={provider}
          className={`badge provider-chip ${coverageClass(counts[provider], total)}`}
          title={t('provisioners.card.providerCoverage', { count: counts[provider], total })}
        >
          {provider}
        </span>
      ))}
    </span>
  );
};

CoverageChips.propTypes = {
  item: itemShape.isRequired,
};

const TierBadge = ({ item }) => {
  const { t } = useTranslation();
  return (
    <TierPill
      tier={item.extras.tier}
      title={t('provisioners.card.tierMeasured', {
        tier: t(`provisioners.tiers.${item.extras.tier}`),
      })}
    />
  );
};

TierBadge.propTypes = {
  item: itemShape.isRequired,
};

const daysSince = date =>
  date ? Math.floor((Date.now() - new Date(date).getTime()) / DAY_MS) : null;

/**
 * The badge row of a provisioner: the tier pill, the newest version
 * beside a tag glyph, how long ago it released beside a calendar glyph
 * and the downloads beside a download glyph, each saying in its tooltip
 * what it counts.
 */
const ItemChips = ({ item, ctx }) => {
  const { t } = useTranslation();
  const latest = item.versions[0]?.version || '';
  const days = daysSince(item.latestReleaseAt);
  return (
    <>
      <TierBadge item={item} />
      {latest ? (
        <span
          className="badge bg-primary glyph-badge"
          title={t('provisioners.card.latestVersion', { version: latest })}
          data-badge="latest"
        >
          <FaTag aria-hidden="true" />
          {latest}
        </span>
      ) : null}
      {days !== null ? (
        <span
          className="badge bg-secondary glyph-badge"
          title={t('provisioners.card.releasedOn', {
            count: days,
            date: new Date(item.latestReleaseAt).toLocaleDateString(ctx?.language),
          })}
          data-badge="released"
        >
          <FaCalendar aria-hidden="true" />
          {t('provisioners.card.releasedShort', { count: days })}
        </span>
      ) : null}
      {typeof item.downloads === 'number' ? (
        <span
          className="badge bg-secondary glyph-badge"
          title={t('provisioners.card.downloads', { count: item.downloads })}
          data-badge="downloads"
        >
          <FaDownload aria-hidden="true" />
          {item.downloads}
        </span>
      ) : null}
    </>
  );
};

ItemChips.propTypes = {
  item: itemShape.isRequired,
  ctx: PropTypes.shape({ language: PropTypes.string }),
};

const ItemHeaderExtra = ({ item }) => (
  <div className="d-flex flex-wrap align-items-center gap-3 mt-2 small text-body-secondary">
    <CoverageChips item={item} />
  </div>
);

ItemHeaderExtra.propTypes = {
  item: itemShape.isRequired,
};

const ItemActions = ({ item, ctx }) => {
  const { t } = useTranslation();
  return (
    <>
      <DeployGlyph user={ctx.user} item={item} version={deployableVersion(item.versions)} />
      <a
        href={item.links.repo}
        target="_blank"
        rel="noreferrer"
        className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
      >
        <FaGithub />
        {t('provisioners.card.viewOnGithub')}
      </a>
      {item.links.homepage ? (
        <a
          href={item.links.homepage}
          target="_blank"
          rel="noreferrer"
          className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
        >
          <FaHouse />
          {t('provisioners.card.homepage')}
        </a>
      ) : null}
      <a
        href={item.links.issues}
        target="_blank"
        rel="noreferrer"
        className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
      >
        <FaBug />
        {t('provisioners.card.reportIssue')}
      </a>
    </>
  );
};

ItemActions.propTypes = {
  item: itemShape.isRequired,
  ctx: PropTypes.shape({ user: PropTypes.object }).isRequired,
};

/**
 * The quality section of the item page: its heading with the rules passed
 * and the tier held, folded by default, opening to the quality the newest
 * version was measured with.
 */
const QualitySection = ({ item }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const quality = qualityOf(item, item.versions[0] || null);
  return (
    <div className="list-table" data-section="quality">
      <div className="d-flex align-items-center gap-2 mb-3">
        <CollapseButton collapsed={!open} onToggle={() => setOpen(current => !current)} />
        <h4 className="mb-0">{t('provisioners.card.qualityHeading')}</h4>
        <TierPill tier={quality.tier} />
        <span className="q-signal ms-0">
          <QualitySignal rules={quality.rules} />
        </span>
      </div>
      {open ? <QualityPanel quality={quality} /> : null}
    </div>
  );
};

QualitySection.propTypes = {
  item: itemShape.isRequired,
};

const VersionDeploy = ({ item, version, ctx }) => (
  <>
    <VersionDownload item={item} version={version} />
    <DeployGlyph user={ctx.user} item={item} version={version} bare />
  </>
);

VersionDeploy.propTypes = {
  item: itemShape.isRequired,
  version: PropTypes.string.isRequired,
  ctx: PropTypes.shape({ user: PropTypes.object }).isRequired,
};

const tierColumn = {
  key: 'tier',
  kind: 'badge',
  labelKey: 'pages.table.tier',
  priority: 4,
  value: (item, ctx) => ctx.t(`provisioners.tiers.${item.extras.tier}`),
  render: item => <TierBadge item={item} />,
};

const coverageColumn = {
  key: 'providers',
  kind: 'badges',
  labelKey: 'pages.table.providers',
  priority: 7,
  value: item => badgesText(coverageProviders(item), NONE),
  render: item => (coverageProviders(item).length > 0 ? <CoverageChips item={item} /> : NONE),
};

/**
 * The provisioners collection over one adapter of catalog items: cards by
 * default and the table as the toggle, the tier and provider filters; a
 * card's byline names the organization and the family with a copy
 * button, its badge row the tier, the newest version, its release and the
 * downloads, and its body the health strip, the Quality and Versions
 * folds and the links row; the one action column the caller gives sits in
 * the Deploy column's place, `actionColumn`, with its card glyph and the
 * action drawn on each version row, `VersionAction`.
 *
 * @param {Object} options - What differs between the catalog and a host
 * @param {Object} options.adapter - The adapter `Listing` reads the items through
 * @param {boolean} options.itemRoute - Whether a card opens the item's page
 * @param {Object} options.actionColumn - The column after Name
 * @param {Function} options.CardGlyph - The glyph at the right of a card's links row
 * @param {Function} [options.VersionAction] - Drawn on each version row of a card, given `{ item, version, ctx }`
 * @param {Function} [options.ItemActions] - The actions of the item's page
 * @returns {Object} The collection
 */
export const provisionerCollection = ({
  adapter,
  itemRoute,
  actionColumn,
  CardGlyph: Glyph,
  VersionAction = null,
  ItemActions: Actions = null,
}) => ({
  key: 'provisioners',
  labelKey: 'collections.provisioners',
  countKey: 'collections.provisionersCount',
  icon: FaCubes,
  segment: '',
  hasVersions: true,
  hasProviders: true,
  itemRoute,
  searchKey: 'provisioners.search.placeholder',
  defaultView: 'cards',
  adapter,
  filterGroups: [
    {
      key: 'tier',
      labelKey: 'provisioners.search.tier',
      values: item => [item.extras.tier],
      activeClass: 'bg-primary',
      pillClass: tier => `tier-badge tier-${tier}`,
      labelFor: (tier, t) => t(`provisioners.tiers.${tier}`),
      order: TIER_ORDER,
    },
    {
      key: 'provider',
      labelKey: 'pages.filter.provider',
      values: item => Object.keys(item.extras.coverage.counts),
      activeClass: 'bg-primary',
    },
  ],
  columns: [
    labelColumn,
    actionColumn,
    visibilityColumn,
    downloadsColumn,
    tierColumn,
    releasedColumn,
    versionsColumn,
    coverageColumn,
  ],
  defaultSort: [{ column: 'label', direction: 'asc' }],
  levels: {
    versions: {
      labelKey: 'pages.item.versions',
      countKey: 'pages.table.versionsCount',
      columns: versionLevelColumns,
    },
    providers: { labelKey: 'pages.table.providers', columns: providerLevelColumns },
    architectures: { labelKey: 'pages.table.architectures', columns: architectureLevelColumns },
  },
  matches: (item, needle) =>
    [
      item.name,
      item.label || '',
      item.description || '',
      item.organization.name,
      item.extras.repo,
    ].some(text => text.toLowerCase().includes(needle)),
  slots: {
    ItemChips,
    ItemHeaderExtra,
    ...(Actions ? { ItemActions: Actions } : {}),
    ItemSections: QualitySection,
    CardGlyph: Glyph,
    CardByline,
    CardBody: cardBodyWith({ VersionAction, Glyph }),
  },
});

export const provisioners = provisionerCollection({
  adapter: catalogAdapter,
  itemRoute: true,
  actionColumn: deployColumn,
  CardGlyph,
  VersionAction: VersionDeploy,
  ItemActions,
});
