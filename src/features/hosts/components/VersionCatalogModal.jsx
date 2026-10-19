import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { catalogItemsFrom } from '../../collections/provisioners';
import { VersionList } from '../../collections/provisioners/components/ProvisionerCard';

import { VersionHeld } from './HostCatalogInstall';
import ToolFormDialog from './ToolFormDialog';

/**
 * The catalog item of one family among a host's catalog reads, the first
 * read that lists it, carrying its source as `extras.source`; null while
 * no catalog lists the family.
 *
 * @param {{ reads: Array<Object> }} catalogs - The reads of `readCatalogSources`
 * @param {string} name - The family name
 * @returns {Object|null} The item
 */
export const catalogItemOf = (catalogs, name) => {
  const listing = (catalogs?.reads || [])
    .map(read => ({
      read,
      item: catalogItemsFrom({ catalog: read.catalog, health: null }).find(
        entry => entry.name === name
      ),
    }))
    .find(entry => entry.item);
  if (!listing) {
    return null;
  }
  const { read, item } = listing;
  return {
    ...item,
    extras: { ...item.extras, source: { key: read.source.id, url: read.source.url || '' } },
  };
};

/**
 * The dialog the Version label's catalog link opens: the versions one
 * family's catalog lists, drawn as the Provisioners page draws a card's
 * versions, each version the host lacks carrying Install, which hands the
 * version and its source to `onInstall` and closes the dialog, a version
 * the host holds carrying nothing. The dialog carries `version-catalog`
 * as `data-dialog`.
 */
const VersionCatalogModal = ({ catalogs, family, held, busy, onInstall, onClose }) => {
  const { t, i18n } = useTranslation();
  const item = useMemo(() => catalogItemOf(catalogs, family), [catalogs, family]);
  const [selected, setSelected] = useState(() => item?.versions[0]?.version || '');
  const ctx = useMemo(
    () => ({
      language: i18n.language,
      held: {
        versionsOf: () => held,
        busy,
        creates: false,
        onFetch: (picked, version) => {
          onInstall({ version, source: picked.extras.source?.key || '' });
          onClose();
        },
      },
    }),
    [i18n.language, held, busy, onInstall, onClose]
  );
  return (
    <ToolFormDialog
      dialog="version-catalog"
      title={t('machineEdit.createWizardSteps.catalogVersionsTitle', { family })}
      busy={busy}
      onClose={onClose}
      onSubmit={onClose}
    >
      {item ? (
        <VersionList
          item={item}
          selected={selected}
          onSelect={setSelected}
          VersionAction={VersionHeld}
          ctx={ctx}
        />
      ) : (
        <p className="form-text text-muted mb-0" data-note="catalog-empty">
          {t('machineEdit.createWizardSteps.catalogVersionsNone', { family })}
        </p>
      )}
    </ToolFormDialog>
  );
};

VersionCatalogModal.propTypes = {
  catalogs: PropTypes.shape({
    sources: PropTypes.array.isRequired,
    reads: PropTypes.array.isRequired,
  }).isRequired,
  family: PropTypes.string.isRequired,
  held: PropTypes.arrayOf(PropTypes.string).isRequired,
  busy: PropTypes.bool.isRequired,
  onInstall: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default VersionCatalogModal;
