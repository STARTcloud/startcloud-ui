import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DownloadAction, architectureLevelMatches } from '../../../components/common/levelColumns';
import MarkdownText from '../../../components/common/MarkdownText';
import PageHeader from '../../../components/common/PageHeader';
import SubTable from '../../../components/common/SubTable';
import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useSelection } from '../../../hooks/useSelection';
import { collectionShape, pageContextShape } from '../../../utils/itemShape';
import { managesItem } from '../../../utils/permissions';

import BulkActions from './BulkActions';

const DEFAULT_SORT = [{ column: 'name', direction: 'asc' }];

const rowIdOf = name => `architecture-${name}`;

/**
 * One provider of a version, and the leaf of a collection whose versions
 * carry architectures directly: the header, then the architectures table,
 * one file per row, with the picked-state pane in its heading; a route that
 * names an architecture in its fifth part brings that row into view once,
 * marking nothing. The slots receive the version row as `parent`, read
 * from the item summary's versions, so a provider's visibility step stays
 * within its version's width.
 */
const ProviderPage = ({ collection, org, name, version, provider, context, architecture = '' }) => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const status = useStatus();
  const [nonce, setNonce] = useState(0);
  const [data, setData] = useState({ key: '', item: null, entry: null });
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(null);
  const scrolledFor = useRef('');
  const key = `${org}/${name}/${version}/${provider}/${nonce}`;
  const ready = data.key === key;
  const { item, entry } = data;
  const level = collection.levels.architectures;
  const architectureColumns = level.columns({ org, name, version, provider });
  const ctx = {
    ...context,
    t,
    language: i18n.language,
    org,
    collection,
    reload: () => setNonce(current => current + 1),
    notify,
    setEditor,
    setForm,
  };
  const search = useDetailSearch({
    rows: ready && entry ? entry.architectures || [] : [],
    matches: architectureLevelMatches,
    placeholderKey: 'pages.search.architectures',
    columns: architectureColumns,
    ctx,
    prefsKey: `${context.prefsPrefix}_${org}_${name}_${version}_${provider}`,
    defaultSort: DEFAULT_SORT,
  });
  const selection = useSelection(search.rows, { keyOf: row => row.name, labelOf: row => row.name });

  useEffect(() => {
    let mounted = true;
    Promise.all([
      collection.adapter.getItemSummary(org, name),
      collection.adapter.getProvider(org, name, version, provider),
    ])
      .then(([loadedItem, loadedEntry]) => {
        if (mounted) {
          setData({ key, item: loadedItem, entry: loadedEntry });
        }
      })
      .catch(() => {
        if (mounted) {
          setData({ key, item: null, entry: null });
          notify('danger', t('pages.notFound'));
        }
      });
    return () => {
      mounted = false;
    };
  }, [key, collection, org, name, version, provider, notify, t]);

  useEffect(() => {
    document.title = `${provider} - ${name}`;
  }, [provider, name]);

  useEffect(() => {
    if (!ready || !architecture || scrolledFor.current === key) {
      return;
    }
    const row = document.getElementById(rowIdOf(architecture));
    if (row) {
      scrolledFor.current = key;
      row.scrollIntoView({ block: 'center' });
    }
  }, [ready, architecture, key]);

  const { ProviderActions, ArchitecturesActions, ArchitectureRowActions } = collection.slots;

  if (!ready) {
    return (
      <div className="list row">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }
  if (!entry) {
    return <div className="list row" />;
  }

  const parent = (item.versions || []).find(row => row.version === version) || null;
  const slotProps = { item, version, provider: entry, parent, ctx };
  const actions = ProviderActions ? <ProviderActions {...slotProps} /> : null;
  const manage = managesItem(status, collection, item, context.user);
  const bulkable = Boolean(collection.bulk && collection.adapter.bulk && manage);
  const names = search.rows.filter(row => selection.selected.has(row.name)).map(row => row.name);

  return (
    <div className="list row">
      {editor ? (
        <PageHeader title={t('pages.provider.edit')} actions={actions}>
          {editor}
        </PageHeader>
      ) : (
        <PageHeader title={entry.name} actions={actions}>
          <MarkdownText text={entry.description} className="mb-0 mt-2" />
        </PageHeader>
      )}
      <div className="list-table mt-2">
        <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
          <h4 className="mb-0 me-auto d-flex align-items-center gap-2">
            {t(level.labelKey)}
            {names.length > 0 ? (
              <span className="small text-muted">
                · {t('pages.bulk.selected', { count: names.length })}
              </span>
            ) : null}
          </h4>
          {bulkable ? (
            <BulkActions
              collection={collection}
              level="architectures"
              groups={[{ scope: { org, name, version, provider }, names }]}
              onClear={selection.clear}
              onDone={() => {
                selection.clear();
                ctx.reload();
              }}
            />
          ) : null}
          {ArchitecturesActions ? <ArchitecturesActions {...slotProps} /> : null}
        </div>
        {form}
        <SubTable
          columns={architectureColumns}
          rows={search.rows}
          rowKey={row => row.name}
          rowId={row => rowIdOf(row.name)}
          LeadActions={DownloadAction}
          RowActions={manage ? ArchitectureRowActions : null}
          actionsProps={slotProps}
          rowProp="architecture"
          sort={search.sort}
          onSort={search.setSort}
          hiddenColumns={search.hiddenColumns}
          widths={search.widths}
          onResize={search.setColumnWidth}
          ctx={ctx}
          emptyText={t(search.filtering ? 'pages.noMatches' : 'pages.empty')}
          selection={bulkable ? selection.subtable : null}
        />
      </div>
    </div>
  );
};

ProviderPage.propTypes = {
  collection: collectionShape.isRequired,
  org: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
  provider: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
  architecture: PropTypes.string,
};

export default ProviderPage;
