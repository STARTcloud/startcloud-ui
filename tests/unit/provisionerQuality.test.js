import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { publicItemsFrom } from '../../src/features/collections/provisioners/api/adapter.js';
import { QualityPanel } from '../../src/features/collections/provisioners/components/Quality.jsx';
import {
  boxLabelOf,
  boxUrlOf,
  openTierOf,
  percentOf,
  providerNamesOf,
  qualityOf,
  scoreOf,
  tierRulesOf,
} from '../../src/features/collections/provisioners/utils/quality.js';
import { heldProvisionerCollection } from '../../src/features/hosts/components/HostCatalogInstall.jsx';

const RULES = {
  bronze: { description: true, label: true, semver_versions: true, latest_alias: true },
  silver: { changelog: true, readme: true, release_within_12_months: true, lint_ci: true },
  gold: { config_fields_documented: false, roles_documented: true, example_hosts: false },
  platinum: { automated_tests: false, multi_provider: true, release_cadence: true },
  diamond: { booted_providers: false },
};

const OLDER = { ...RULES, silver: { ...RULES.silver, changelog: false, lint_ci: false } };

const DATA = {
  catalog: {
    provisioners: [
      {
        name: 'startcloud_generic_provisioner',
        repo: 'STARTcloud/startcloud_generic_provisioner',
        description: 'Generic provisioner for STARTcloud servers',
        versions: [
          { version: '0.1.26', released_at: '2026-07-15T18:04:11Z', artifacts: [] },
          { version: '0.1.25', released_at: '2026-06-02T00:00:00Z', artifacts: [] },
        ],
      },
    ],
  },
  health: {
    provisioners: {
      startcloud_generic_provisioner: {
        tier: 'silver',
        rules: RULES,
        failed_rules: ['gold.config_fields_documented'],
        health: {
          downloads: 42,
          versions: {
            '0.1.26': {
              providers: ['virtualbox', 'zones'],
              tier: 'silver',
              rules: RULES,
              failed_rules: [],
              boxes: {
                virtualbox: {
                  organization: 'STARTcloud',
                  name: 'debian13',
                  version: '13.1.0',
                  architecture: 'amd64',
                  url: 'https://boxvault.example.com/STARTcloud/debian13/13.1.0/virtualbox',
                },
              },
            },
            '0.1.25': { providers: ['virtualbox'] },
          },
        },
      },
    },
  },
};

describe('the quality of a rules document', () => {
  it('lists a tier passed first then unmet and scores the five tiers', () => {
    expect(tierRulesOf(RULES, 'gold').map(rule => [rule.key, rule.passed])).toEqual([
      ['gold.roles_documented', true],
      ['gold.config_fields_documented', false],
      ['gold.example_hosts', false],
    ]);
    expect(scoreOf(RULES)).toEqual({ passed: 11, total: 15 });
    expect(scoreOf({})).toEqual({ passed: 0, total: 0 });
    expect(percentOf(tierRulesOf(RULES, 'platinum'))).toBe(67);
    expect(percentOf([])).toBe(0);
  });

  it('opens the tier above the one held, bronze for an unrated family', () => {
    expect(openTierOf('silver')).toBe('gold');
    expect(openTierOf('unrated')).toBe('bronze');
    expect(openTierOf('diamond')).toBe('');
  });
});

describe('the catalog items carry the rules and the per-version quality', () => {
  const [item] = publicItemsFrom(DATA);

  it('carries the family rules and each version tier, rules, failed rules and boxes', () => {
    expect(item.extras.rules).toEqual(RULES);
    expect(item.versions[0].extras).toEqual({
      tier: 'silver',
      rules: RULES,
      failedRules: [],
      boxes:
        DATA.health.provisioners.startcloud_generic_provisioner.health.versions['0.1.26'].boxes,
    });
    expect(item.versions[1].extras).toEqual({ tier: '', rules: {}, failedRules: [], boxes: {} });
  });

  it('draws a measured version with its own quality and an unmeasured one with the family on the newest', () => {
    expect(qualityOf(item, item.versions[0])).toEqual({
      tier: 'silver',
      rules: RULES,
      measuredOn: '0.1.26',
    });
    expect(qualityOf(item, item.versions[1])).toEqual({
      tier: 'silver',
      rules: RULES,
      measuredOn: '0.1.26',
    });
  });

  it('answers the providers of a version and the box each is verified with', () => {
    expect(providerNamesOf(item.versions[0])).toEqual(['virtualbox', 'zones']);
    expect(boxUrlOf(item.versions[0], 'virtualbox')).toBe(
      'https://boxvault.example.com/STARTcloud/debian13/13.1.0/virtualbox'
    );
    expect(boxLabelOf(item.versions[0], 'virtualbox')).toBe('STARTcloud/debian13 13.1.0 amd64');
    expect(boxLabelOf(item.versions[0], 'zones')).toBe('');
    expect(boxUrlOf(item.versions[1], 'virtualbox')).toBe('');
    expect(boxUrlOf(item.versions[0], 'zones')).toBe('');
  });
});

describe('the provisioner card body', () => {
  const host = heldProvisionerCollection({ adapter: {} });
  const ctx = {
    language: 'en',
    t: key => key,
    collection: host,
    held: { versionsOf: () => ['0.1.25'], busy: false, onFetch: () => null },
    handed: null,
  };
  const render = item => renderToStaticMarkup(createElement(host.slots.CardBody, { item, ctx }));

  it('draws the strip with both checks and the newest providers, the two folds folded, one line a version with Install greyed on the held one, and Update in the links line', () => {
    const [item] = publicItemsFrom(DATA);
    const markup = render(item);
    expect(markup).toContain('data-check="artifacts" data-ok="true"');
    expect(markup).toContain('data-check="sidecars" data-ok="true"');
    expect(markup).toContain('data-chip="zones"');
    expect(markup).toContain('data-fold="quality-fold"');
    expect(markup).toContain('data-fold="versions-fold"');
    expect(markup).not.toMatch(/<details class="q-fold[^"]*"[^>]*open/u);
    expect(markup.match(/class="list-group-item version-row/gu)).toHaveLength(2);
    expect(markup).toContain('class="list-group-item version-row selected" data-version="0.1.26"');
    expect(markup).toContain(
      'data-action="version-install" data-family="startcloud_generic_provisioner" data-version="0.1.26"'
    );
    expect(markup).toContain(
      'data-note="installed" data-family="startcloud_generic_provisioner" data-version="0.1.25"'
    );
    expect(markup).toContain('data-action="catalog-update"');
    expect(markup).toContain('data-note="update-available"');
    expect(markup).not.toContain('data-action="version-download"');
    expect(markup).toContain(
      'href="https://boxvault.example.com/STARTcloud/debian13/13.1.0/virtualbox"'
    );
    expect(markup).toContain(
      'href="https://provisioner-catalog.startcloud.com/docs/guides/quality-tiers/#artifacts"'
    );
    expect(markup).toContain(
      'href="https://provisioner-catalog.startcloud.com/docs/guides/quality-tiers/#sidecars"'
    );
  });

  it('draws a failing strip in plain danger text', () => {
    const [item] = publicItemsFrom({
      ...DATA,
      health: {
        provisioners: {
          startcloud_generic_provisioner: {
            ...DATA.health.provisioners.startcloud_generic_provisioner,
            health: { artifacts_ok: false, sidecars_ok: false, versions: {} },
          },
        },
      },
    });
    const markup = render(item);
    expect(markup).toContain('class="health-item text-danger"');
    expect(markup).toContain('data-check="artifacts" data-ok="false"');
    expect(markup).toContain('data-check="sidecars" data-ok="false"');
  });
});

describe('QualityPanel', () => {
  const render = quality => renderToStaticMarkup(createElement(QualityPanel, { quality }));

  it('draws the score ring with the tier inside and one meter a tier, the held one outlined and the one above open', () => {
    const markup = render({ tier: 'silver', rules: RULES, measuredOn: '0.1.26' });
    expect(markup).toContain('11/15');
    expect(markup).toContain('badge tier-badge tier-silver p-tier');
    expect(markup.match(/<details class="meter/gu)).toHaveLength(5);
    expect(markup).toContain('class="meter tier-tone-silver achieved"');
    expect(markup).toMatch(/class="meter tier-tone-gold" open=""/u);
    expect(markup).not.toContain('bg-primary');
    expect(markup).toContain('href="/docs/guides/quality-tiers/#gold-rules"');
  });

  it('follows the version selected, an older one holding a lower tier', () => {
    const markup = render({ tier: 'bronze', rules: OLDER, measuredOn: '0.1.25' });
    expect(markup).toContain('9/15');
    expect(markup).toContain('class="meter tier-tone-bronze achieved"');
    expect(markup).toMatch(/class="meter tier-tone-silver" open=""/u);
  });
});
