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

const { provisionerCollection, provisioners } =
  await import('../../src/features/collections/provisioners/definition.jsx');
const { fetchCatalog, fetchCatalogHealth } =
  await import('../../src/features/hosts/api/provisioning.js');
const { hostCatalogAdapter } = await import('../../src/features/hosts/utils/hostCatalog.js');
const { installColumn, InstallGlyph, VersionInstall } =
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

  it('draws a host catalog with Install in the Deploy column place and no item page', () => {
    const host = provisionerCollection({
      adapter: {},
      itemRoute: false,
      actionColumn: installColumn,
      CardGlyph: InstallGlyph,
      VersionAction: VersionInstall,
    });
    expect(keysOf(host.columns)).toEqual([
      'label',
      'install',
      'visibility',
      'downloads',
      'tier',
      'released',
      'versions',
      'providers',
    ]);
    expect(host.itemRoute).toBe(false);
    expect(host.slots.ItemActions).toBeUndefined();
    expect(host.slots.CardGlyph).toBe(InstallGlyph);
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
  const ctx = { installedKeys: new Set(['startcloud/0.1.27']), busy: false, onInstall: vi.fn() };

  it('draws Installed for a version the host holds and Install for one it does not', () => {
    const item = itemOf();
    expect(render(createElement(VersionInstall, { item, version: '0.1.27', ctx }))).toContain(
      'data-note="installed"'
    );
    const install = render(createElement(VersionInstall, { item, version: '0.1.28', ctx }));
    expect(install).toContain('data-action="catalog-install"');
    expect(install).toContain('data-version="0.1.28"');
  });
});

describe('hostCatalogAdapter', () => {
  it('lists the relayed catalog of one source as the catalog site items, health and all', async () => {
    const adapter = hostCatalogAdapter({ status: {}, id: '1', source: 'startcloud' });
    const items = await adapter.listAll();
    expect(fetchCatalog).toHaveBeenCalledWith({}, '1', 'startcloud');
    expect(fetchCatalogHealth).toHaveBeenCalledWith({}, '1', 'startcloud');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'STARTcloud/hcl_domino_additional_provisioner',
      name: 'hcl_domino_additional_provisioner',
      label: 'HCL Domino additional server',
      organization: { name: 'STARTcloud' },
      extras: { tier: 'gold' },
    });
    expect(items[0].versions[0]).toMatchObject({
      version: '0.3.0',
      createdAt: '2026-09-26',
      providers: [{ name: 'virtualbox' }],
    });
  });

  it('draws a source that publishes no health unrated', async () => {
    fetchCatalogHealth.mockImplementationOnce(() => Promise.reject(new Error('404')));
    const items = await hostCatalogAdapter({ status: {}, id: '1', source: '' }).listAll();
    expect(items[0].extras.tier).toBe('unrated');
  });
});
