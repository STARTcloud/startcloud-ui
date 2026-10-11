import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { itemShape, sortVersionsNewestFirst } from '../../../../utils/itemShape';
import { CardFold, CardFoot, CardLinks } from '../../../catalog/components/ItemCards';

const releasedOn = (version, language) =>
  version.createdAt ? new Date(version.createdAt).toLocaleDateString(language) : '';

const VersionRow = ({ item, version, selected, onSelect, VersionAction, ctx }) => (
  <li
    className={`list-group-item version-row${selected ? ' selected' : ''}`}
    data-version={version.version}
  >
    <div
      className="version-line"
      role="button"
      tabIndex={0}
      onClick={event => {
        if (!event.target.closest('a, button')) {
          onSelect(version.version);
        }
      }}
      onKeyDown={event => {
        if (event.key === 'Enter' && event.target === event.currentTarget) {
          onSelect(version.version);
        }
      }}
    >
      <span className="col-fold" />
      <strong className="version-number">{version.version}</strong>
      <span className="version-date">{releasedOn(version, ctx.language)}</span>
      <span className="version-actions">
        {VersionAction ? <VersionAction item={item} version={version.version} ctx={ctx} /> : null}
      </span>
    </div>
  </li>
);

VersionRow.propTypes = {
  item: itemShape.isRequired,
  version: PropTypes.object.isRequired,
  selected: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  VersionAction: PropTypes.elementType,
  ctx: PropTypes.object.isRequired,
};

const isHanded = (item, handed) =>
  Boolean(handed) &&
  handed.name === item.name &&
  (!handed.organization || handed.organization === item.organization.name);

const handedVersionOf = (versions, handed) =>
  handed?.version && versions.some(entry => entry.version === handed.version)
    ? handed.version
    : versions[0]?.version || '';

/**
 * The body of a box card under its description, for one action a
 * version, `VersionAction`, and one card glyph, `Glyph`: the Versions
 * fold, folded, signalling the newest version and the count, its lines
 * newest first with the version, its release date and the version
 * action, a line's click selecting it; the foot line counting the
 * versions and the last release; and the links row with the glyph at its
 * right. A card whose box `ctx.handed` names opens with the handed
 * version selected and the fold open, carries `data-handed` and scrolls
 * into view.
 *
 * @param {Object} options - The card's actions
 * @param {Function} [options.VersionAction] - Drawn on each version line, given `{ item, version, ctx }`
 * @param {Function} [options.Glyph] - Drawn at the right of the links row, given `{ item, ctx }`
 * @returns {Function} The component
 */
export const cardBodyWith = ({ VersionAction = null, Glyph = null }) => {
  const CardBody = ({ item, ctx }) => {
    const { t } = useTranslation();
    const versions = sortVersionsNewestFirst(item.versions || []);
    const handed = isHanded(item, ctx.handed) ? ctx.handed : null;
    const marked = Boolean(handed);
    const body = useRef(null);
    const [selected, setSelected] = useState(() => handedVersionOf(versions, handed));
    const signal = (
      <>
        <span className="fw-semibold">{versions[0]?.version || ''}</span>
        <span className="text-body-secondary">
          · {t('pages.table.versionsCount', { count: versions.length })}
        </span>
      </>
    );

    useEffect(() => {
      if (marked && body.current) {
        body.current.scrollIntoView({ block: 'center' });
      }
    }, [marked]);

    return (
      <div
        ref={body}
        className="d-flex flex-column gap-2"
        data-card="box"
        data-handed={marked ? 'true' : undefined}
      >
        {versions.length > 0 ? (
          <div className="card-folds">
            <CardFold
              kind="versions-fold"
              title={t('pages.item.versions')}
              signal={signal}
              open={marked}
            >
              <ul className="list-group list-group-flush version-list" data-list="versions">
                {versions.map(version => (
                  <VersionRow
                    key={version.version}
                    item={item}
                    version={version}
                    selected={version.version === selected}
                    onSelect={setSelected}
                    VersionAction={VersionAction}
                    ctx={ctx}
                  />
                ))}
              </ul>
            </CardFold>
          </div>
        ) : null}
        <CardFoot collection={ctx.collection} item={item} ctx={ctx} />
        <CardLinks item={item}>{Glyph ? <Glyph item={item} ctx={ctx} /> : null}</CardLinks>
      </div>
    );
  };
  CardBody.propTypes = {
    item: itemShape.isRequired,
    ctx: PropTypes.object.isRequired,
  };
  return CardBody;
};
