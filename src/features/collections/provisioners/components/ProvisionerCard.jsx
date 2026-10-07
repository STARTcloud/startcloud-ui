import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaChevronDown, FaChevronRight, FaDownload, FaRegCopy } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import { OrgLogo } from '../../../../components/layout/OrgSwitcherModal';
import { copyToClipboard } from '../../../../lib/clipboard';
import { itemShape } from '../../../../utils/itemShape';
import { itemPath } from '../../../../utils/routes';
import { CardLinks } from '../../../catalog/components/ItemCards';
import { HEALTH_GUIDE, boxLabelOf, boxUrlOf, providerNamesOf, qualityOf } from '../utils/quality';

import ProviderChips from './ProviderChips';
import { QualityPanel, QualitySignal } from './Quality';

const LISTED_VERSIONS = 5;

/**
 * The line under a provisioner card's title: the organization's logo and
 * name, the family's name in monospace, and a button that copies it.
 */
export const CardByline = ({ item }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const label = t(copied ? 'copyButton.copied' : 'provisioners.card.copyName');
  return (
    <div className="byline small text-body-secondary" data-field="byline">
      <OrgLogo org={item.organization} size={16} className="org-avatar" fallback={null} />
      <span>{item.organization.name}</span>
      <span aria-hidden="true">·</span>
      <code className="checksum">{item.name}</code>
      <button
        type="button"
        className="copy-name card-above"
        title={label}
        aria-label={label}
        data-action="copy-name"
        onClick={() =>
          copyToClipboard(item.name)
            .then(() => setCopied(true))
            .catch(() => null)
        }
        onBlur={() => setCopied(false)}
      >
        <FaRegCopy aria-hidden="true" />
      </button>
    </div>
  );
};

CardByline.propTypes = {
  item: itemShape.isRequired,
};

const HealthCheck = ({ ok, okKey, failKey, tipKey, href, check }) => {
  const { t } = useTranslation();
  return (
    <a
      className={`health-item${ok ? '' : ' text-danger'}`}
      href={href}
      target="_blank"
      rel="noreferrer"
      title={t(tipKey)}
      data-check={check}
      data-ok={ok ? 'true' : 'false'}
    >
      {ok ? <FaCheck className="ok" aria-hidden="true" /> : null}
      {t(ok ? okKey : failKey)}
    </a>
  );
};

HealthCheck.propTypes = {
  ok: PropTypes.bool.isRequired,
  okKey: PropTypes.string.isRequired,
  failKey: PropTypes.string.isRequired,
  tipKey: PropTypes.string.isRequired,
  href: PropTypes.string.isRequired,
  check: PropTypes.string.isRequired,
};

const HealthStrip = ({ item, version }) => {
  const { t } = useTranslation();
  return (
    <div className="health-strip card-above" data-panel="health">
      <HealthCheck
        ok={item.extras.artifactsOk}
        okKey="provisioners.health.artifacts"
        failKey="provisioners.health.artifactsFailed"
        tipKey={
          item.extras.artifactsOk
            ? 'provisioners.health.artifactsTip'
            : 'provisioners.health.artifactsFailedTip'
        }
        href={HEALTH_GUIDE.artifacts}
        check="artifacts"
      />
      <HealthCheck
        ok={item.extras.sidecarsOk}
        okKey="provisioners.health.sidecars"
        failKey="provisioners.health.sidecarsMissing"
        tipKey={
          item.extras.sidecarsOk
            ? 'provisioners.health.sidecarsTip'
            : 'provisioners.health.sidecarsMissingTip'
        }
        href={HEALTH_GUIDE.sidecars}
        check="sidecars"
      />
      <span
        className="health-item text-nowrap providers-slot"
        title={t('provisioners.health.providersFor', { version: version?.version || '' })}
      >
        <span className="health-label">{t('pages.table.providers')}</span>
        <ProviderChips
          providers={providerNamesOf(version)}
          boxOf={provider => boxUrlOf(version, provider)}
          boxLabelOf={provider => boxLabelOf(version, provider)}
        />
      </span>
    </div>
  );
};

HealthStrip.propTypes = {
  item: itemShape.isRequired,
  version: PropTypes.object,
};

const Fold = ({ title, signal, kind, children }) => (
  <details className={`q-fold pt-2 border-top ${kind}`} data-fold={kind}>
    <summary className="q-summary card-above">
      <FaChevronDown className="fold-chevron" aria-hidden="true" />
      <h3 className="h6 mb-0">{title}</h3>
      <span className="q-signal">{signal}</span>
    </summary>
    <div className="fold-body card-above">{children}</div>
  </details>
);

Fold.propTypes = {
  title: PropTypes.node.isRequired,
  signal: PropTypes.node.isRequired,
  kind: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

const releasedOn = (version, language) =>
  version.createdAt ? new Date(version.createdAt).toLocaleDateString(language) : '';

const VersionRow = ({ item, version, selected, onSelect, VersionAction, ctx }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const quality = qualityOf(item, version);
  const artifact = version.artifacts[0] || null;
  const toggleLabel = t('provisioners.versions.toggle', { version: version.version });
  return (
    <li
      className={`list-group-item version-row${selected ? ' selected' : ''}`}
      data-version={version.version}
    >
      <div
        className="version-line"
        title={t('provisioners.versions.select', { version: version.version })}
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
        <span className="col-fold">
          <button
            type="button"
            className="btn btn-link btn-sm p-0 text-body"
            aria-expanded={open}
            aria-label={toggleLabel}
            title={toggleLabel}
            data-action="version-toggle"
            onClick={() => setOpen(current => !current)}
          >
            {open ? <FaChevronDown aria-hidden="true" /> : <FaChevronRight aria-hidden="true" />}
          </button>
        </span>
        <span
          className={`version-tier-dot tier-tone-${quality.tier}`}
          title={t('provisioners.versions.tierWhen', {
            tier: t(`provisioners.tiers.${quality.tier}`),
            version: quality.measuredOn,
          })}
        />
        <strong className="version-number">{version.version}</strong>
        <span className="version-date">{releasedOn(version, ctx.language)}</span>
        <span className="version-actions">
          {artifact ? (
            <a
              href={artifact.downloadUrl}
              className="btn btn-outline-secondary version-action"
              title={t('provisioners.versions.download', { version: version.version })}
              aria-label={t('provisioners.versions.download', { version: version.version })}
              data-action="version-download"
            >
              <FaDownload aria-hidden="true" />
            </a>
          ) : null}
          {VersionAction ? <VersionAction item={item} version={version.version} ctx={ctx} /> : null}
        </span>
      </div>
      {open ? (
        <div className="version-detail" data-panel="version-detail">
          <div className="version-detail-row">
            <span className="health-label">{t('pages.table.providers')}</span>
            <ProviderChips
              providers={providerNamesOf(version)}
              boxOf={provider => boxUrlOf(version, provider)}
              boxLabelOf={provider => boxLabelOf(version, provider)}
            />
          </div>
          {version.artifacts.map(entry => (
            <code key={entry.checksum || entry.downloadUrl} className="checksum d-block text-break">
              {entry.checksumType}:{entry.checksum}
            </code>
          ))}
        </div>
      ) : null}
    </li>
  );
};

VersionRow.propTypes = {
  item: itemShape.isRequired,
  version: PropTypes.object.isRequired,
  selected: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  VersionAction: PropTypes.elementType,
  ctx: PropTypes.object.isRequired,
};

const VersionList = ({ item, selected, onSelect, VersionAction, ctx }) => {
  const { t } = useTranslation();
  const { collection } = ctx;
  return (
    <ul className="list-group list-group-flush version-list" data-list="versions">
      {item.versions.map(version => (
        <VersionRow
          key={version.version}
          item={item}
          version={version}
          selected={version.version === selected}
          onSelect={onSelect}
          VersionAction={VersionAction}
          ctx={ctx}
        />
      ))}
      {item.versions.length > LISTED_VERSIONS && collection?.itemRoute ? (
        <li className="list-group-item version-all">
          <Link to={itemPath(collection, item.organization.name, item.name)}>
            {t('provisioners.versions.all', { count: item.versions.length })}
          </Link>
        </li>
      ) : null}
    </ul>
  );
};

VersionList.propTypes = {
  item: itemShape.isRequired,
  selected: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
  VersionAction: PropTypes.elementType,
  ctx: PropTypes.object.isRequired,
};

/**
 * The body of a provisioner card under its description, for one action a
 * version, `VersionAction`, and one card glyph, `Glyph`: the health strip,
 * Artifacts and Sidecars each linked to the guide that explains it and
 * the selected version's providers fitted to the width; the Quality fold
 * over the Versions fold, both folded, Quality signalling the rules
 * passed and Versions the newest version and the count; the versions
 * newest first in a frame of about five rows, a row's click selecting it
 * so the strip and Quality follow it; and the links row with the glyph at
 * its right.
 *
 * @param {Object} options - The card's actions
 * @param {Function} [options.VersionAction] - Drawn on each version row, given `{ item, version, ctx }`
 * @param {Function} [options.Glyph] - Drawn at the right of the links row, given `{ item, ctx }`
 * @returns {Function} The component
 */
export const cardBodyWith = ({ VersionAction = null, Glyph = null }) => {
  const CardBody = ({ item, ctx }) => {
    const { t } = useTranslation();
    const [selected, setSelected] = useState(item.versions[0]?.version || '');
    const version = item.versions.find(entry => entry.version === selected) || null;
    const quality = qualityOf(item, version);
    const versionsSignal = (
      <>
        <span className="fw-semibold">{item.versions[0]?.version || ''}</span>
        <span className="text-body-secondary">
          · {t('provisioners.card.version', { count: item.versions.length })}
        </span>
      </>
    );
    return (
      <div className="d-flex flex-column gap-2" data-card="provisioner">
        <HealthStrip item={item} version={version} />
        <div className="card-folds">
          <Fold
            kind="quality-fold"
            title={t('provisioners.card.qualityHeading')}
            signal={<QualitySignal rules={quality.rules} />}
          >
            <QualityPanel quality={quality} />
          </Fold>
          <Fold kind="versions-fold" title={t('pages.item.versions')} signal={versionsSignal}>
            <VersionList
              item={item}
              selected={selected}
              onSelect={setSelected}
              VersionAction={VersionAction}
              ctx={ctx}
            />
          </Fold>
        </div>
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
