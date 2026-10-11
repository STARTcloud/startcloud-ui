import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/features/hosts/api/provisioning.js', () => ({
  fetchCatalog: vi.fn(() =>
    Promise.resolve({
      provisioners: [
        {
          name: 'hcl_domino_additional_provisioner',
          repo: 'STARTcloud/hcl_domino_additional_provisioner',
          description: 'An additional HCL Domino server',
          versions: [
            {
              version: '0.3.0',
              released_at: '2026-09-26',
              artifacts: [
                {
                  url: 'https://github.com/STARTcloud/hcl_domino_additional_provisioner/releases/download/v0.3.0/hcl_domino_additional_provisioner-0.3.0.tar.gz',
                  checksum_type: 'sha256',
                  checksum: 'ab'.repeat(32),
                },
              ],
            },
          ],
        },
      ],
    })
  ),
  fetchCatalogHealth: vi.fn(() =>
    Promise.resolve({
      provisioners: {
        hcl_domino_additional_provisioner: {
          tier: 'gold',
          failed_rules: [],
          presentation: { label: 'HCL Domino additional server' },
          health: { versions: { '0.3.0': { providers: ['virtualbox'] } } },
        },
      },
    })
  ),
}));

const { provisioners } = await import('../../src/features/collections/provisioners/definition.jsx');
const { fetchCatalog, fetchCatalogHealth } =
  await import('../../src/features/hosts/api/provisioning.js');
const { hostCatalogAdapter } = await import('../../src/features/hosts/utils/hostCatalog.js');
const { HeldControl, VersionHeld, heldDeployColumn, heldProvisionerCollection, heldStatusColumn } =
  await import('../../src/features/hosts/components/HostCatalogInstall.jsx');

const keysOf = columns => columns.map(column => column.key);

const itemOf = () => ({
  id: 'STARTcloud/startcloud',
  organization: { name: 'STARTcloud' },
  name: 'startcloud',
  versions: [{ version: '0.1.28', artifacts: [], providers: [] }],
  extras: { tier: 'gold', coverage: { counts: { virtualbox: 2, bhyve: 1 }, total: 2 } },
});

const render = node => renderToStaticMarkup(node);

describe('the provisioners collection', () => {
  it('draws the catalog site with Deploy after Name and its slots', () => {
    expect(keysOf(provisioners.columns)).toEqual([
      'label',
      'deploy',
      'visibility',
      'downloads',
      'tier',
      'released',
      'versions',
      'providers',
    ]);
    expect(provisioners.itemRoute).toBe(true);
    expect(provisioners.defaultView).toBe('cards');
    expect(Object.keys(provisioners.slots).sort()).toEqual([
      'CardBody',
      'CardByline',
      'CardGlyph',
      'ItemActions',
      'ItemChips',
      'ItemHeaderExtra',
      'ItemSections',
    ]);
  });

  it('draws a host catalog with the held control in the Deploy column place, Status after Downloads, the Installed group and no item page', () => {
    const host = heldProvisionerCollection({ adapter: {} });
    expect(keysOf(host.columns)).toEqual([
      'label',
      'deploy',
      'visibility',
      'downloads',
      'status',
      'tier',
      'released',
      'versions',
      'providers',
    ]);
    expect(host.columns[1]).toBe(heldDeployColumn);
    expect(host.columns[4]).toBe(heldStatusColumn);
    expect(host.itemRoute).toBe(false);
    expect(host.slots.ItemActions).toBeUndefined();
    expect(host.slots.CardGlyph).toBe(HeldControl);
    expect(host.defaultSort).toEqual([{ column: 'status', direction: 'desc' }]);
    expect(host.filterGroups.at(-1)).toMatchObject({ key: 'held', defaultActive: ['held'] });
  });

  it('draws the tier pill in its tier colour, never the brand primary', () => {
    const tier = provisioners.columns.find(column => column.key === 'tier');
    const markup = render(tier.render(itemOf()));
    expect(markup).toContain('badge tier-badge tier-gold');
    expect(markup).not.toContain('bg-primary');
  });

  it('draws the provider chips in their coverage colours, never the brand primary', () => {
    const coverage = provisioners.columns.find(column => column.key === 'providers');
    const markup = render(coverage.render(itemOf()));
    expect(markup).toContain('badge provider-chip provider-all');
    expect(markup).toContain('badge provider-chip provider-one');
    expect(markup).not.toContain('bg-primary');
  });
});

describe('the host catalog install', () => {
  const ctxOf = (held, more = {}) => ({
    t: key => key,
    held: { versionsOf: () => held, busy: false, onFetch: vi.fn(), ...more },
    handed: null,
  });

  it('draws the version line Install greyed for a version the host holds, Install for one it does not, and the machine button while the host creates', () => {
    const item = itemOf();
    const ctx = ctxOf(['0.1.27']);
    const held = render(createElement(VersionHeld, { item, version: '0.1.27', ctx }));
    expect(held).toContain('data-note="installed"');
    expect(held).toContain('disabled=""');
    expect(held).not.toContain('data-action="version-install"');
    expect(held).not.toContain('data-action="version-create"');
    const install = render(createElement(VersionHeld, { item, version: '0.1.28', ctx }));
    expect(install).toContain('data-action="version-install"');
    expect(install).toContain('data-version="0.1.28"');
    expect(install).toContain('class="btn btn-outline-secondary version-action"');
  });

  it('draws the split control: the Update glyph with its dot behind the catalog, the Install glyph while missing, the glyph greyed at the newest, the chevron on every row, and the Status badge', () => {
    const item = itemOf();
    const behind = render(createElement(HeldControl, { item, ctx: ctxOf(['0.1.27']) }));
    expect(behind).toContain('data-action="catalog-update"');
    expect(behind).toContain('data-note="update-available"');
    expect(behind).toContain('class="glyph-dot"');
    expect(behind).toContain('data-action="held-more"');
    const missing = render(createElement(HeldControl, { item, ctx: ctxOf([]) }));
    expect(missing).toContain('data-action="catalog-install"');
    expect(missing).not.toContain('class="glyph-dot"');
    const current = render(createElement(HeldControl, { item, ctx: ctxOf(['0.1.28']) }));
    expect(current).toContain('data-note="held-current"');
    expect(current).toContain('aria-disabled="true"');
    expect(current).toContain('data-action="held-more"');
    expect(heldDeployColumn.render(item, ctxOf(['0.1.28']))).not.toBeNull();
    expect(heldDeployColumn.value(item, ctxOf(['0.1.28']))).toBe('0.1.28');
    expect(heldStatusColumn.value(item, ctxOf(['0.1.28']))).toBe('hosts.manage.held.installed');
    expect(heldStatusColumn.value(item, ctxOf(['0.1.27']))).toBe(
      'hosts.manage.held.updateAvailable'
    );
    expect(heldStatusColumn.value(item, ctxOf([]))).toBe('');
  });
});

describe('hostCatalogAdapter', () => {
  const sources = [
    { id: 'staging', url: 'https://s/catalog.json', default: false },
    { id: 'startcloud', url: 'https://c/catalog.json', default: true },
  ];

  it('lists the relayed catalog of every source as the catalog site items, health and all, the default source first and a family listed twice drawn once with its source', async () => {
    fetchCatalog.mockClear();
    fetchCatalogHealth.mockClear();
    const adapter = hostCatalogAdapter({ status: {}, id: '1', sources });
    const items = await adapter.listAll();
    expect(fetchCatalog).toHaveBeenCalledTimes(2);
    expect(fetchCatalog).toHaveBeenNthCalledWith(1, {}, '1', 'startcloud');
    expect(fetchCatalog).toHaveBeenNthCalledWith(2, {}, '1', 'staging');
    expect(fetchCatalogHealth).toHaveBeenCalledWith({}, '1', 'startcloud');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'STARTcloud/hcl_domino_additional_provisioner',
      name: 'hcl_domino_additional_provisioner',
      label: 'HCL Domino additional server',
      organization: { name: 'STARTcloud' },
      extras: { tier: 'gold', source: { key: 'startcloud', url: 'https://c/catalog.json' } },
    });
    expect(items[0].versions[0]).toMatchObject({
      version: '0.3.0',
      createdAt: '2026-09-26',
      providers: [{ name: 'virtualbox' }],
    });
  });

  it('draws a source that publishes no health unrated and a source that answers nothing as no family', async () => {
    fetchCatalogHealth.mockImplementationOnce(() => Promise.reject(new Error('404')));
    const items = await hostCatalogAdapter({
      status: {},
      id: '1',
      sources: [{ id: 'main', url: '' }],
    }).listAll();
    expect(items[0].extras.tier).toBe('unrated');
    fetchCatalog.mockImplementationOnce(() => Promise.reject(new Error('502')));
    expect(
      await hostCatalogAdapter({
        status: {},
        id: '1',
        sources: [{ id: 'main', url: '' }],
      }).listAll()
    ).toEqual([]);
  });
});
