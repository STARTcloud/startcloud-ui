import PropTypes from 'prop-types';
import { Card, Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaBook,
  FaBug,
  FaGears,
  FaGithub,
  FaHouse,
  FaRegStar,
  FaScroll,
  FaStar,
} from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import EmptyState from '../../../components/common/EmptyState';
import GroupHeading, { groupShape } from '../../../components/common/GroupHeading';
import MarkdownText from '../../../components/common/MarkdownText';
import { RowCheckbox, selectionShape } from '../../../components/common/SelectCheckbox';
import StatusChips from '../../../components/common/StatusChips';
import { OrgLogo } from '../../../components/layout/OrgSwitcherModal';
import {
  collectionShape,
  itemShape,
  latestReleaseTime,
  statusOf,
  visibilityOf,
} from '../../../utils/itemShape';
import { managesItem } from '../../../utils/permissions';
import { formatRelativeTime } from '../../../utils/relativeTime';
import { itemPath } from '../../../utils/routes';

const CardMedia = ({ item, ctx }) => {
  if (item.artwork || item.icon) {
    return (
      <img
        src={item.artwork || item.icon}
        alt=""
        className="prov-icon"
        loading="lazy"
        onError={event => {
          event.currentTarget.classList.add('d-none');
        }}
      />
    );
  }
  return (
    <OrgLogo
      org={item.organization}
      size={40}
      className="rounded-circle org-logo-lg"
      fallback={ctx.orgMark}
    />
  );
};

CardMedia.propTypes = {
  item: itemShape.isRequired,
  ctx: PropTypes.object.isRequired,
};

const LINKS = [
  { key: 'repo', Icon: FaGithub, labelKey: 'pages.links.repo' },
  { key: 'homepage', Icon: FaHouse, labelKey: 'pages.links.homepage' },
  { key: 'issues', Icon: FaBug, labelKey: 'pages.links.issues' },
  { key: 'pipeline', Icon: FaGears, labelKey: 'pages.links.pipeline' },
  { key: 'docs', Icon: FaBook, labelKey: 'pages.links.docs' },
  { key: 'notes', Icon: FaScroll, labelKey: 'pages.links.notes' },
];

const CardLinks = ({ item, CardGlyph, ctx }) => {
  const { t } = useTranslation();
  const links = item.links || {};
  const present = LINKS.filter(link => links[link.key]);
  if (present.length === 0 && !CardGlyph) {
    return null;
  }
  return (
    <div className="d-flex align-items-center gap-3 card-links">
      {present.map(({ key, Icon, labelKey }) => (
        <a
          key={key}
          href={links[key]}
          target="_blank"
          rel="noreferrer"
          className="text-body-secondary"
          title={t(labelKey)}
          aria-label={t(labelKey)}
        >
          <Icon />
        </a>
      ))}
      {CardGlyph ? (
        <span className="ms-auto d-inline-flex align-items-center gap-3">
          <CardGlyph item={item} ctx={ctx} />
        </span>
      ) : null}
    </div>
  );
};

CardLinks.propTypes = {
  item: itemShape.isRequired,
  CardGlyph: PropTypes.elementType,
  ctx: PropTypes.object.isRequired,
};

const CardFacts = ({ collection, item, ctx }) => {
  const { t } = useTranslation();
  const released = latestReleaseTime(item);
  const versions = (item.versions || []).length;
  const versionsLabel = collection.levels?.versions?.labelKey || 'pages.table.versions';
  const facts = [
    item.family ? ['family', t('pages.table.family'), item.family] : null,
    versions > 0 ? ['versions', t(versionsLabel), versions] : null,
    released
      ? ['released', t('pages.table.released'), formatRelativeTime(released, ctx.language)]
      : null,
  ].filter(Boolean);
  if (facts.length === 0) {
    return null;
  }
  return (
    <div className="d-flex flex-wrap gap-3 small text-body-secondary mb-2">
      {facts.map(([key, label, value]) => (
        <span key={key}>
          {label}: <strong className="text-body">{value}</strong>
        </span>
      ))}
    </div>
  );
};

CardFacts.propTypes = {
  collection: collectionShape.isRequired,
  item: itemShape.isRequired,
  ctx: PropTypes.object.isRequired,
};

const ItemCard = ({ collection, item, watches, selection, ctx }) => {
  const { t } = useTranslation();
  const { ItemChips, CardGlyph, CardExtras, RowActions } = collection.slots;
  const title = item.label || item.name;
  const watched = watches ? watches.ids.has(item.id) : false;
  const manage = managesItem(ctx.status, collection, item, ctx.user);
  return (
    <Card className="h-100 shadow-sm catalog-card">
      <Card.Body className="d-flex flex-column">
        <div className="d-flex align-items-start gap-2 mb-2">
          {selection ? <RowCheckbox selection={selection} row={item} /> : null}
          <CardMedia item={item} ctx={ctx} />
          <div className="flex-grow-1 min-width-0">
            <Card.Title className="mb-0 text-break">
              {collection.itemRoute ? (
                <Link to={itemPath(collection, item.organization.name, item.name)}>{title}</Link>
              ) : (
                title
              )}
            </Card.Title>
            <div className="small text-body-secondary">{item.vendor || item.organization.name}</div>
            {item.label && item.label !== item.name ? (
              <code className="checksum">{item.name}</code>
            ) : null}
          </div>
          {watches ? (
            <button
              type="button"
              className="btn btn-link p-0 text-warning"
              onClick={() => watches.toggle(item)}
              title={watched ? t('pages.watch.unwatch') : t('pages.watch.watch')}
              aria-pressed={watched}
            >
              {watched ? <FaStar /> : <FaRegStar />}
            </button>
          ) : null}
        </div>
        <div className="d-flex flex-wrap gap-1 mb-2">
          <StatusChips
            status={manage ? statusOf(item) : null}
            visibility={manage ? visibilityOf(item) : null}
            osLabel={item.os?.label || null}
          />
          {ItemChips ? <ItemChips item={item} ctx={ctx} /> : null}
        </div>
        <CardFacts collection={collection} item={item} ctx={ctx} />
        <MarkdownText text={item.description} className="card-desc mb-2" />
        <div className="mt-auto d-flex flex-column gap-2">
          <CardLinks item={item} CardGlyph={CardGlyph} ctx={ctx} />
          {CardExtras ? <CardExtras item={item} ctx={ctx} /> : null}
          {RowActions ? <RowActions item={item} ctx={ctx} /> : null}
        </div>
      </Card.Body>
    </Card>
  );
};

ItemCard.propTypes = {
  collection: collectionShape.isRequired,
  item: itemShape.isRequired,
  watches: PropTypes.shape({
    ids: PropTypes.instanceOf(Set).isRequired,
    toggle: PropTypes.func.isRequired,
  }),
  selection: selectionShape,
  ctx: PropTypes.object.isRequired,
};

const CardGrid = ({ collection, items, watches, selection, ctx }) => (
  <Row xs={1} md={2} xl={3} className="g-3 mb-3">
    {items.map(item => (
      <Col key={item.id}>
        <ItemCard
          collection={collection}
          item={item}
          watches={watches}
          selection={selection}
          ctx={ctx}
        />
      </Col>
    ))}
  </Row>
);

CardGrid.propTypes = {
  collection: collectionShape.isRequired,
  items: PropTypes.arrayOf(itemShape).isRequired,
  watches: PropTypes.object,
  selection: selectionShape,
  ctx: PropTypes.object.isRequired,
};

const ItemCards = ({
  collection,
  items,
  groups,
  collapsed,
  onToggleGroup,
  watches,
  ctx,
  selection = null,
  emptyBody = null,
}) => {
  const { t } = useTranslation();
  if (items.length === 0) {
    return (
      <EmptyState
        title={ctx.filtering ? t('pages.noMatches') : t('pages.empty')}
        body={emptyBody}
      />
    );
  }
  if (!groups) {
    return (
      <CardGrid
        collection={collection}
        items={items}
        watches={watches}
        selection={selection}
        ctx={ctx}
      />
    );
  }
  return groups.map(group => (
    <div key={group.key} className="mb-3">
      <div className="mb-2">
        <GroupHeading
          group={group}
          collapsed={Boolean(collapsed[group.key])}
          onToggle={() => onToggleGroup(group.key)}
          countLabel={t(collection.countKey, { count: group.items.length })}
          orgMark={ctx.orgMark}
        />
      </div>
      {collapsed[group.key] ? null : (
        <CardGrid
          collection={collection}
          items={group.items}
          watches={watches}
          selection={selection}
          ctx={ctx}
        />
      )}
    </div>
  ));
};

ItemCards.propTypes = {
  collection: collectionShape.isRequired,
  items: PropTypes.arrayOf(itemShape).isRequired,
  groups: PropTypes.arrayOf(groupShape),
  collapsed: PropTypes.object.isRequired,
  onToggleGroup: PropTypes.func.isRequired,
  watches: PropTypes.shape({
    ids: PropTypes.instanceOf(Set).isRequired,
    toggle: PropTypes.func.isRequired,
  }),
  ctx: PropTypes.object.isRequired,
  selection: selectionShape,
  emptyBody: PropTypes.node,
};

export default ItemCards;
