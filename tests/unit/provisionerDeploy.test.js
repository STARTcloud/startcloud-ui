import { describe, expect, it } from 'vitest';

import {
  boxSeedOf,
  seedFor,
} from '../../src/features/collections/provisioners/components/deploy.jsx';
import { deployQuery } from '../../src/features/deploy/utils/deployLink.js';
import { createSeedOf, seedBoxFor } from '../../src/features/hosts/utils/machineCreate.js';

const BOX_URL = 'https://boxvault.startcloud.com/STARTcloud/debian13/13.1.0';

const boxOf = provider => ({
  organization: 'STARTcloud',
  name: 'debian13',
  version: '13.1.0',
  architecture: 'amd64',
  url: `${BOX_URL}/${provider}`,
});

const versionOf = (version, boxes) => ({
  version,
  artifacts: [
    {
      downloadUrl: `https://github.com/STARTcloud/hcl_domino_additional_provisioner/releases/download/v${version}/hcl_domino_additional_provisioner-${version}.tar.gz`,
    },
  ],
  extras: { boxes },
});

const itemOf = versions => ({
  id: 'STARTcloud/hcl_domino_additional_provisioner',
  organization: { name: 'STARTcloud' },
  name: 'hcl_domino_additional_provisioner',
  isPublic: true,
  versions,
});

describe('boxSeedOf', () => {
  it('names one box_<provider> member a verified provider, the four parts joined by @', () => {
    expect(
      boxSeedOf(versionOf('0.3.0', { virtualbox: boxOf('virtualbox'), zone: boxOf('zone') }))
    ).toEqual({
      box_virtualbox: `STARTcloud/debian13@13.1.0@amd64@${BOX_URL}/virtualbox`,
      box_zone: `STARTcloud/debian13@13.1.0@amd64@${BOX_URL}/zone`,
    });
  });

  it('sends none for a version verified with no box, a box without its name or a provider outside the vocabulary', () => {
    expect(boxSeedOf(versionOf('0.3.0', {}))).toEqual({});
    expect(boxSeedOf({ version: '0.3.0', extras: {} })).toEqual({});
    expect(boxSeedOf(null)).toEqual({});
    expect(
      boxSeedOf(
        versionOf('0.3.0', {
          virtualbox: { organization: '', name: 'debian13', version: '1', url: '' },
          'Bad Provider': boxOf('virtualbox'),
        })
      )
    ).toEqual({});
  });

  it('leaves an empty version, architecture or URL as an empty part', () => {
    expect(
      boxSeedOf(versionOf('0.3.0', { utm: { organization: 'STARTcloud', name: 'debian13' } }))
    ).toEqual({ box_utm: 'STARTcloud/debian13@@@' });
  });
});

describe('seedFor', () => {
  it('carries the provisioner members and the verified boxes of the version picked', () => {
    globalThis.window = { location: { origin: 'https://provisioner-catalog.startcloud.com' } };
    const item = itemOf([
      versionOf('0.3.0', { virtualbox: boxOf('virtualbox') }),
      versionOf('0.2.0', {}),
    ]);
    expect(seedFor({ item, version: '0.3.0' })).toEqual({
      provisioner: 'STARTcloud/hcl_domino_additional_provisioner',
      provisioner_version: '0.3.0',
      provisioner_url:
        'https://github.com/STARTcloud/hcl_domino_additional_provisioner/releases/download/v0.3.0/hcl_domino_additional_provisioner-0.3.0.tar.gz',
      provisioner_catalog: 'https://provisioner-catalog.startcloud.com/catalog.json',
      box_virtualbox: `STARTcloud/debian13@13.1.0@amd64@${BOX_URL}/virtualbox`,
    });
    expect(seedFor({ item, version: '0.2.0' })).not.toHaveProperty('box_virtualbox');
    delete globalThis.window;
  });

  it('writes the query a Domino 0.3.0 Deploy sends, the box member after the catalog, encoded once', () => {
    globalThis.window = { location: { origin: 'https://provisioner-catalog.startcloud.com' } };
    const item = itemOf([versionOf('0.3.0', { virtualbox: boxOf('virtualbox') })]);
    expect(deployQuery(seedFor({ item, version: '0.3.0' }))).toBe(
      'create=machine&provisioner=STARTcloud%2Fhcl_domino_additional_provisioner&provisioner_version=0.3.0&provisioner_url=https%3A%2F%2Fgithub.com%2FSTARTcloud%2Fhcl_domino_additional_provisioner%2Freleases%2Fdownload%2Fv0.3.0%2Fhcl_domino_additional_provisioner-0.3.0.tar.gz&provisioner_catalog=https%3A%2F%2Fprovisioner-catalog.startcloud.com%2Fcatalog.json&box_virtualbox=STARTcloud%2Fdebian13%4013.1.0%40amd64%40https%3A%2F%2Fboxvault.startcloud.com%2FSTARTcloud%2Fdebian13%2F13.1.0%2Fvirtualbox'
    );
    delete globalThis.window;
  });
});

describe('the round trip', () => {
  it('reads back on the receiver what the sender wrote, the URL whole after the third @', () => {
    const sent = {
      provisioner: 'STARTcloud/hcl_domino_additional_provisioner',
      provisioner_version: '0.3.0',
      box_virtualbox: 'STARTcloud/debian13@13.1.0@amd64@https://user@boxvault.example.com/a?b=c@d',
      box_zone: `STARTcloud/debian13@13.1.0@amd64@${BOX_URL}/zone`,
    };
    const seed = createSeedOf(new URLSearchParams(deployQuery(sent)));
    expect(seed).toMatchObject(sent);
    expect(seedBoxFor(seed, ['virtualbox'])).toEqual({
      box: 'STARTcloud/debian13',
      box_version: '13.1.0',
      box_arch: 'amd64',
      box_url: 'https://user@boxvault.example.com/a?b=c@d',
    });
    expect(seedBoxFor(seed, ['bhyve']).box_url).toBe(`${BOX_URL}/zone`);
  });
});
